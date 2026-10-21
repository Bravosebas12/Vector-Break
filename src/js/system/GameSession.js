// Rules: .claude/skills/game-loop-state-manager/SKILL.md
// DOM-free game session: one FSM, level state, input gating and the fixed-step clock.
// Owns the volley economy: emission, landing, block damage, orbs and Resolving.
import { Raycaster } from './Raycaster.js';
import { Fsm } from './Fsm.js';
import { EventRing } from './EventRing.js';
import { LevelCatalog } from './LevelCatalog.js';
import { allows } from './Input.js';
import { starRating, scoreOf } from './Progression.js';
import { Physics } from '../engine/Physics.js';
import { Ball } from '../entities/Ball.js';
import { BLOCK_TYPES } from '../entities/Block.js';
import {
  LAUNCHER_Y,
  BALL_SPEED,
  BALL_RADIUS,
  EMIT_INTERVAL,
  MAX_VOLLEY,
  clampLauncherX,
} from './Layout.js';

const PLAYING = ['Aiming', 'Firing', 'Simulating'];
const MOVE_SPEED = 480; // px/s of play time while A or D is held (HU-10, D-10.3)
const MOVE_TAP = 8; // px: a press released before moving this far moves exactly this far

export function createSession({
  rng,
  audio = null,
  strict = true,
  progression = null, // Progression (7b): canAccess(index) gates NEXT, submit(index, result) records wins
  canAccess = progression ? (i) => progression.canAccess(i) : () => false,
  sealedFloor = false,
  volleyCapS = 45,
  // Fire mode (HU-11): 1 | 2 | 3 balls per FIRE. 'turn' is test-only and pinned across loads: one FIRE
  // emits every ball of the turn, as in v1 (until slice 3 it is also the only emission behavior).
  fireMode = 'turn',
} = {}) {
  const catalog = new LevelCatalog();
  const events = new EventRing();
  const loading = { done: 0, total: 0 };
  const run = {}; // per-level mutable state, rebuilt by `resetRun`
  const balls = Ball.createPool();
  let source = null; // level index or JSON currently loaded (RESTART reloads it)
  let index = null;
  if (![1, 2, 3, 'turn'].includes(fireMode)) throw new Error(`invalid fire mode: ${fireMode}`);
  let pinnedMode = fireMode === 'turn' ? 'turn' : null;

  const fsm = new Fsm({
    strict,
    onEnter: {
      Aiming: () => {
        run.speed = 1;
      },
    },
  });

  function resetRun(board) {
    while (balls.count > 0) balls.release(balls.items[0]);
    run.board = board;
    run.emitAcc = 0;
    run.firstLandX = null;
    run.shotsUsed = 0;
    run.volleySize = board.startBalls;
    run.emitted = 0;
    run.active = 0;
    run.pendingBonus = 0;
    run.launcherX = board.launcher.x;
    run.speed = 1;
    run.paused = false;
    run.score = 0;
    run.damage = 0;
    run.result = null;
    run.newRecord = false;
    run.simTime = 0;
    run.volleySimTime = 0;
    run.playTime = 0;
    run.aim = null;
    run.lockedDir = null;
    run.aimTarget = null;
    run.held = { [-1]: false, [1]: false };
    run.tapFrom = { [-1]: 0, [1]: 0 };
    run.fireMode = pinnedMode ?? 1;
  }
  resetRun({ startBalls: 0, shots: 0, launcher: { x: 0 }, blocks: [], cores: [] });

  function enter(next) {
    fsm.transition(next);
    events.push('STATE', STATE_ID[next]);
  }

  // Atomic: the catalog builds and validates off to the side; only success touches session state.
  function loadLevel(indexOrJson) {
    if (!fsm.can('Aiming')) throw new Error(`illegal transition ${fsm.state} -> Aiming`);
    const board = catalog.loadLevel(indexOrJson);
    source = indexOrJson;
    const found = typeof indexOrJson === 'number' ? indexOrJson : catalog.levels.indexOf(indexOrJson);
    index = found >= 0 ? found : null; // an ad-hoc level object is outside the catalog
    resetRun(board);
    enter('Aiming');
  }

  // The pointer target is kept so moving the launcher re-aims at the same point (HU-10 AC2/AC3).
  function aim(action) {
    run.aimTarget = { x: action.x, y: action.y };
    reaim();
  }

  function reaim() {
    if (!run.aimTarget) return;
    const dir = Raycaster.aimDirection({ x: run.launcherX, y: LAUNCHER_Y }, run.aimTarget);
    run.aim = dir ? { x: dir.x, y: dir.y } : null;
  }

  function setLauncherX(x) {
    const next = clampLauncherX(x);
    if (next === run.launcherX) return;
    run.launcherX = next;
    reaim();
  }

  function moveStart(dir) {
    run.held[dir] = true;
    run.tapFrom[dir] = run.launcherX;
    events.push('LAUNCHER_MOVED', dir);
  }

  // Tap rule (D4): released before moving MOVE_TAP px -> moved exactly MOVE_TAP px from the press point.
  function moveStop(dir) {
    if (!run.held[dir]) return;
    run.held[dir] = false;
    if (fsm.state !== 'Aiming' || run.paused || run.held[-dir]) return;
    if (Math.abs(run.launcherX - run.tapFrom[dir]) < MOVE_TAP) setLauncherX(run.tapFrom[dir] + MOVE_TAP * dir);
  }

  function moveLauncher(dt) {
    const dir = (run.held[1] ? 1 : 0) - (run.held[-1] ? 1 : 0);
    if (dir !== 0) setLauncherX(run.launcherX + dir * MOVE_SPEED * dt);
  }

  function fire() {
    if (!run.aim) return; // no valid angle yet
    run.held[-1] = run.held[1] = false; // keys held through FIRE never move the launcher later
    run.lockedDir = { ...run.aim };
    run.shotsUsed++;
    run.volleySimTime = 0;
    run.emitted = 0;
    run.emitAcc = 0;
    run.firstLandX = null;
    events.push('FIRE', run.shotsUsed);
    enter('Firing');
    emitBall(); // the first ball leaves on FIRE
  }

  function emitBall() {
    const ball = balls.acquire();
    if (ball === null) return;
    ball.x = run.launcherX;
    ball.y = LAUNCHER_Y;
    ball.dir.set(run.lockedDir.x, run.lockedDir.y);
    ball.speed = BALL_SPEED;
    ball.landed = false;
    ball.emitIndex = run.emitted++;
  }

  // Orbs are captured by overlap with any flying ball; the value counts once per orb.
  function captureOrbs() {
    for (const orb of run.board.orbs) {
      if (orb.captured) continue;
      const reach = orb.radius + BALL_RADIUS;
      for (let i = 0; i < balls.count; i++) {
        const b = balls.items[i];
        if (b.landed || (b.x - orb.x) ** 2 + (b.y - orb.y) ** 2 > reach * reach) continue;
        orb.captured = true;
        run.board.cells[orb.row * run.board.cols + orb.col] = null;
        run.pendingBonus += orb.value;
        events.push('ORB', orb.row * run.board.cols + orb.col); // presentation only: sound
        break;
      }
    }
  }

  // Physics world: first landing, orbs and per-substep emission (damage joins later).
  const world = {
    sealedFloor,
    blockAt: (col, row) => run.board.blockAt(col, row),
    onSubstep(subDt) {
      captureOrbs(); // positions left by the previous substep
      if (run.emitted >= run.volleySize) return;
      run.emitAcc += subDt;
      while (run.emitAcc >= EMIT_INTERVAL && run.emitted < run.volleySize) {
        run.emitAcc -= EMIT_INTERVAL;
        emitBall();
      }
    },
    onHit(ball, surface, block) {
      if (block === null) return;
      if (!block.destructible) return events.push('STEEL', block.row * run.board.cols + block.col); // sound only
      if (block.hp <= 0) return;
      block.hp--;
      run.damage++;
      const cell = block.row * run.board.cols + block.col;
      if (block.hp > 0) return events.push('HIT', cell); // presentation only: flash
      events.push('DESTROY', cell, BLOCK_TYPES.indexOf(block.type)); // presentation only: burst
      run.board.cells[block.row * run.board.cols + block.col] = null; // freed at once
      run.board.blocks.splice(run.board.blocks.indexOf(block), 1);
    },
    onLand(ball) {
      if (run.firstLandX === null) run.firstLandX = ball.x;
    },
  };

  function titleClick() {
    audio?.unlock?.(); // synchronous: still inside the DOM gesture (D10)
    audio?.music?.(true);
    loadLevel(0);
  }

  function dispatch(action) {
    if (!allows(fsm.state, run.paused, action)) return;
    switch (action.type) {
      case 'AIM':
        return aim(action);
      case 'MOVE_START':
        return moveStart(action.dir);
      case 'MOVE_STOP':
        return moveStop(action.dir);
      case 'FIRE':
        return fsm.state === 'Title' ? titleClick() : fire();
      case 'SET_SPEED':
        run.speed = action.v;
        return events.push('SPEED', action.v);
      case 'PAUSE':
        run.paused = !run.paused;
        return events.push(run.paused ? 'PAUSE' : 'RESUME');
      case 'RESTART':
        loadLevel(source); // resets run state (clears paused) and re-enters Aiming
        return events.push('RESTART');
      case 'NEXT':
        return next();
      case 'CONFIRM':
        return confirm();
      case 'PRESS':
        return press(action.target);
      default:
    }
  }

  // NEXT: only in Victory, only if the following level exists and is unlocked.
  function next() {
    const target = index + 1;
    if (index === null || target >= catalog.length || !canAccess(target)) return;
    loadLevel(target);
  }

  // Modal button click: UI_CLICK on press, UI_CONFIRM when the button's action took effect.
  function press(target) {
    const before = fsm.state;
    events.push('UI_CLICK');
    dispatch({ type: target });
    if (fsm.state !== before) events.push('UI_CONFIRM');
  }

  // Enter: the modal primary action (next level when offered, otherwise restart).
  function confirm() {
    if (fsm.state === 'Victory' && index !== null && index + 1 < catalog.length && canAccess(index + 1)) return next();
    dispatch({ type: 'RESTART' });
  }

  // Fixed step. `dt` is STEP; simulation time scales with the speed multiplier, play time does not.
  function step(dt) {
    if (run.paused || !PLAYING.includes(fsm.state)) return;
    run.playTime += dt;
    if (fsm.state === 'Aiming') return moveLauncher(dt);
    run.simTime += dt * run.speed;
    run.volleySimTime += dt * run.speed;
    if (Physics.step(balls, world, run.speed, dt) === 0 && run.emitted < run.volleySize) {
      world.onSubstep(dt * run.speed); // no ball in flight: Physics runs no substep
    }
    captureOrbs();
    if (run.volleySimTime >= volleyCapS) capVolley();
    if (fsm.state === 'Firing' && run.emitted >= run.volleySize) enter('Simulating');
    if (fsm.state === 'Simulating' && balls.count === 0) resolve();
  }

  // D11: past volleyCapS every ball counts as landed (damage kept, no launcher shift of its own).
  function capVolley() {
    while (balls.count > 0) balls.release(balls.items[0]);
    run.emitted = run.volleySize;
    events.push('VOLLEY_CAPPED', run.shotsUsed);
  }

  // End of turn: launcher shift, volley growth, then Victory > GameOver > Aiming.
  function resolve() {
    enter('Resolving');
    if (run.firstLandX !== null) run.launcherX = clampLauncherX(run.firstLandX);
    run.volleySize = Math.min(MAX_VOLLEY, run.volleySize + run.pendingBonus);
    run.pendingBonus = 0;
    const { shots } = run.board;
    const won = run.board.cores.every((c) => c.hp <= 0);
    if (won || run.shotsUsed >= shots) {
      run.score = scoreOf(run.damage, won ? shots - run.shotsUsed : 0);
      const stars = won ? starRating(run.shotsUsed, shots) : 0;
      run.result = { stars, score: run.score, shots: run.shotsUsed };
      if (won && index !== null) run.newRecord = progression?.submit(index, run.result) === true;
    }
    enter(won ? 'Victory' : run.result ? 'GameOver' : 'Aiming');
    if (won) events.push('STARS', run.result.stars); // presentation only: sound
    else if (!run.result) events.push('TURNS', shots - run.shotsUsed);
  }

  function snapshot() {
    const b = run.board;
    return {
      state: fsm.state,
      paused: run.paused,
      loading: { ...loading },
      eventOverflow: events.overflow,
      speed: run.speed,
      level: { index, id: source === null ? null : b.id },
      shots: { used: run.shotsUsed, left: b.shots - run.shotsUsed, max: b.shots },
      volley: { size: run.volleySize, emitted: run.emitted, active: balls.count },
      pendingBonus: run.pendingBonus,
      launcherX: run.launcherX,
      cores: b.cores.filter((c) => c.hp > 0).length,
      blocks: b.blocks.map(({ col, row, type, hp }) => ({ col, row, type, hp })),
      balls: Array.from({ length: balls.count }, (_, i) => {
        const b = balls.items[i];
        return { x: b.x, y: b.y, dx: b.dir.x, dy: b.dir.y };
      }),
      score: run.score,
      damage: run.damage,
      aim: run.aim && { ...run.aim },
      lockedDir: run.lockedDir && { ...run.lockedDir },
      simTime: run.simTime,
      volleySimTime: run.volleySimTime,
      playTime: run.playTime,
      result: run.result && { ...run.result },
      fireMode: run.fireMode,
      newRecord: run.newRecord,
    };
  }

  return {
    fsm,
    events,
    // Read-only views for the renderer (no per-frame snapshot allocation).
    balls,
    get run() {
      return run;
    },
    get board() {
      return run.board;
    },
    // Live progress counters for the start screen (no snapshot allocation per frame).
    get loading() {
      return loading;
    },
    rng,
    sealedFloor,
    volleyCapS,
    setLevels: (levels) => catalog.setLevels(levels),
    setLoadProgress(done, total) {
      loading.done = done;
      loading.total = total;
      if (fsm.state === 'Loading' && total > 0 && done >= total) enter('Title');
    },
    loadLevel,
    setVolley(n) {
      run.volleySize = Math.max(1, Math.min(MAX_VOLLEY, n));
    },
    // Test seam (openspec test-harness): 'turn' pins v1 emission across loads; 1..3 unpin.
    setFireMode(v) {
      if (![1, 2, 3, 'turn'].includes(v)) throw new Error(`invalid fire mode: ${v}`);
      pinnedMode = v === 'turn' ? 'turn' : null;
      run.fireMode = v;
    },
    dispatch,
    step,
    snapshot,
    drainEvents: (fn) => events.drain(fn),
  };
}

const STATE_ID = Object.freeze({
  Title: 1,
  Aiming: 2,
  Firing: 3,
  Simulating: 4,
  Resolving: 5,
  Victory: 6,
  GameOver: 7,
});
