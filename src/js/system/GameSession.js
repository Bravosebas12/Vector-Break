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
  // Fire mode (HU-11): 1 | 2 | 3 balls per FIRE (a group). 'turn' is test-only and pinned across loads:
  // one FIRE emits every ball left in the turn, as in v1.
  fireMode = 1,
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

  const fsm = new Fsm({ strict }); // the speed resets per turn, not on every Aiming (S-13.2)

  function resetRun(board) {
    while (balls.count > 0) balls.release(balls.items[0]);
    run.board = board;
    run.emitAcc = 0;
    run.shotsUsed = 0;
    run.volleySize = board.startBalls; // balls of the current turn, fixed until Resolving
    run.emitted = 0; // balls of the turn already fired, across its groups
    run.groupTarget = 0; // value of `emitted` at which the current group stops emitting
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
    run.lockedX = 0; // launcher x of the group being emitted (HU-13)
    run.lastFireSim = 0; // simTime of the turn's latest FIRE, for the cadence (D-13.4)
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
    if (!PLAYING.includes(fsm.state) || run.paused || run.held[-dir]) return;
    if (Math.abs(run.launcherX - run.tapFrom[dir]) < MOVE_TAP) setLauncherX(run.tapFrom[dir] + MOVE_TAP * dir);
  }

  function moveLauncher(dt) {
    const dir = (run.held[1] ? 1 : 0) - (run.held[-1] ? 1 : 0);
    if (dir !== 0) setLauncherX(run.launcherX + dir * MOVE_SPEED * dt);
  }

  // HU-13: also with balls in flight, when the turn has balls left, the previous group has emitted them all and
  // the cadence (one EMIT_INTERVAL of simTime since the turn's previous FIRE) has elapsed. Otherwise ignored.
  function fire() {
    if (!run.aim) return; // no valid angle yet
    const left = run.volleySize - run.emitted;
    if (left <= 0 || run.emitted < run.groupTarget) return;
    if (run.emitted > 0 && run.simTime - run.lastFireSim < EMIT_INTERVAL - 1e-9) return;
    if (run.emitted === 0) run.volleySimTime = 0; // the 45 s cap counts from the turn's first FIRE (D-13.3)
    run.lastFireSim = run.simTime;
    run.lockedDir = { ...run.aim };
    run.lockedX = run.launcherX; // the group leaves from here even if the launcher moves (D2)
    run.groupTarget = run.emitted + (run.fireMode === 'turn' ? left : Math.min(run.fireMode, left));
    run.emitAcc = 0;
    events.push('FIRE', run.shotsUsed + 1);
    if (fsm.state !== 'Firing') enter('Firing');
    emitBall(); // the first ball leaves on FIRE
  }

  function emitBall() {
    const ball = balls.acquire();
    if (ball === null) return;
    ball.x = run.lockedX;
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
      if (run.emitted >= run.groupTarget) return;
      run.emitAcc += subDt;
      while (run.emitAcc >= EMIT_INTERVAL && run.emitted < run.groupTarget) {
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
    // No onLand: landing balls never move the launcher (HU-14, supersedes D-10.1 / D-11.3).
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
      case 'CYCLE_MODE':
        return setMode(run.fireMode === 'turn' ? 1 : (run.fireMode % 3) + 1);
      case 'SET_MODE':
        return setMode(action.v);
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
      case 'SKIP':
        return skip();
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

  // SKIP (HU-12): the next level without a win and without classifying. It bypasses the NEXT gate, never resolves
  // the turn (no record, stars or victory) and marks the level sin resolver; loadLevel clears balls and pause.
  function skip() {
    if (index === null || index + 1 >= catalog.length) return;
    const skipped = index;
    progression?.markSkipped(skipped);
    loadLevel(skipped + 1);
    events.push('SKIP', skipped);
  }

  // Modal button click: UI_CLICK on press, UI_CONFIRM when the button's action took effect (a skip confirms itself).
  function press(target) {
    const before = fsm.state;
    events.push('UI_CLICK');
    dispatch({ type: target });
    if (fsm.state !== before && target !== 'SKIP') events.push('UI_CONFIRM');
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
    moveLauncher(dt); // A / D also work in flight (D-13.2)
    if (fsm.state === 'Aiming') return;
    run.simTime += dt * run.speed;
    run.volleySimTime += dt * run.speed;
    if (Physics.step(balls, world, run.speed, dt) === 0 && run.emitted < run.groupTarget) {
      world.onSubstep(dt * run.speed); // no ball in flight: Physics runs no substep
    }
    captureOrbs();
    if (run.board.cores.every((c) => c.hp <= 0)) return win(); // D-13.1: the moment the last core falls
    if (run.volleySimTime >= volleyCapS) capVolley();
    if (fsm.state === 'Firing' && run.emitted >= run.groupTarget) enter('Simulating');
    if (fsm.state === 'Simulating' && balls.count === 0) endGroup();
  }

  // Immediate victory: balls in flight are removed and the turn's unfired balls are never fired.
  function win() {
    while (balls.count > 0) balls.release(balls.items[0]);
    resolve();
  }

  // D11 / D-13.3: past volleyCapS (from the turn's first FIRE) every ball counts as landed (damage kept) and the
  // balls of the turn not fired yet are lost (S-13.1): the turn resolves.
  function capVolley() {
    while (balls.count > 0) balls.release(balls.items[0]);
    run.emitted = run.groupTarget = run.volleySize;
    events.push('VOLLEY_CAPPED', run.shotsUsed + 1);
  }

  function setMode(v) {
    if (![1, 2, 3].includes(v) || v === run.fireMode) return;
    run.fireMode = v;
    events.push('UI_CLICK');
    events.push('MODE', v);
  }

  // A group is over (no ball in flight). With balls of the turn left and cores standing, the player aims the
  // next group from where the launcher was left (HU-14); otherwise the turn resolves (D-11.1).
  function endGroup() {
    const won = run.board.cores.every((c) => c.hp <= 0);
    if (won || run.emitted >= run.volleySize) return resolve();
    events.push('GROUP_END', run.volleySize - run.emitted);
    enter('Aiming');
  }

  // End of turn: volley growth, then Victory > GameOver > Aiming.
  function resolve() {
    enter('Resolving');
    run.shotsUsed++; // a shot is a whole turn, counted when it resolves
    run.volleySize = Math.min(MAX_VOLLEY, run.volleySize + run.pendingBonus);
    run.pendingBonus = 0;
    run.emitted = 0;
    run.groupTarget = 0;
    const { shots } = run.board;
    const won = run.board.cores.every((c) => c.hp <= 0);
    if (won || run.shotsUsed >= shots) {
      run.score = scoreOf(run.damage, won ? shots - run.shotsUsed : 0);
      const stars = won ? starRating(run.shotsUsed, shots) : 0;
      run.result = { stars, score: run.score, shots: run.shotsUsed };
      if (won && index !== null) run.newRecord = progression?.submit(index, run.result) === true;
    }
    if (!won && !run.result) run.speed = 1; // a new turn starts at 1X (S-13.2)
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
    // Catalog index of the loaded level, or null (tutorial hints, no snapshot allocation per frame).
    get levelIndex() {
      return index;
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
    // Test seam (openspec free-launcher D4): a position reachable with A / D, placed at once; Aiming only.
    setLauncherX(x) {
      if (fsm.state === 'Aiming') setLauncherX(x);
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
