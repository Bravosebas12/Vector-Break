// Rules: .claude/skills/game-loop-state-manager/SKILL.md
// DOM-free game session: one FSM, level state, input gating and the fixed-step clock.
// Volley emission, landing and Resolving arrive with the economy (slice 5b); until then
// `fsm` is exposed so tests can walk the turn states.
import { Raycaster } from './Raycaster.js';
import { Fsm } from './Fsm.js';
import { EventRing } from './EventRing.js';
import { LevelCatalog } from './LevelCatalog.js';
import { allows } from './Input.js';
import { LAUNCHER_Y } from './Layout.js';

const PLAYING = ['Aiming', 'Firing', 'Simulating'];

export function createSession({
  rng,
  audio = null,
  strict = true,
  canAccess = () => false, // Progression.canAccess (slice 7b): is level `index` unlocked?
  sealedFloor = false,
  volleyCapS = 45,
} = {}) {
  const catalog = new LevelCatalog();
  const events = new EventRing();
  const loading = { done: 0, total: 0 };
  const run = {}; // per-level mutable state, rebuilt by `resetRun`
  let source = null; // level index or JSON currently loaded (RESTART reloads it)
  let index = null;

  const fsm = new Fsm({
    strict,
    onEnter: {
      Aiming: () => {
        run.speed = 1;
      },
    },
  });

  function resetRun(board) {
    run.board = board;
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
    run.simTime = 0;
    run.volleySimTime = 0;
    run.playTime = 0;
    run.aim = null;
    run.lockedDir = null;
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

  function aim(action) {
    const origin = { x: run.launcherX, y: LAUNCHER_Y };
    const dir = Raycaster.aimDirection(origin, action);
    run.aim = dir ? { x: dir.x, y: dir.y } : null;
  }

  function fire() {
    if (!run.aim) return; // no valid angle yet
    run.lockedDir = { ...run.aim };
    run.shotsUsed++;
    run.volleySimTime = 0;
    events.push('FIRE', run.shotsUsed);
    enter('Firing');
  }

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
      default:
    }
  }

  // NEXT: only in Victory, only if the following level exists and is unlocked.
  function next() {
    const target = index + 1;
    if (index === null || target >= catalog.length || !canAccess(target)) return;
    loadLevel(target);
  }

  // Fixed step. `dt` is STEP; simulation time scales with the speed multiplier, play time does not.
  function step(dt) {
    if (run.paused || !PLAYING.includes(fsm.state)) return;
    run.playTime += dt;
    if (fsm.state === 'Aiming') return;
    run.simTime += dt * run.speed;
    run.volleySimTime += dt * run.speed;
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
      volley: { size: run.volleySize, emitted: run.emitted, active: run.active },
      pendingBonus: run.pendingBonus,
      launcherX: run.launcherX,
      cores: b.cores.filter((c) => c.hp > 0).length,
      blocks: b.blocks.map(({ col, row, type, hp }) => ({ col, row, type, hp })),
      balls: [],
      score: run.score,
      damage: run.damage,
      aim: run.aim && { ...run.aim },
      lockedDir: run.lockedDir && { ...run.lockedDir },
      simTime: run.simTime,
      volleySimTime: run.volleySimTime,
      playTime: run.playTime,
      result: null,
    };
  }

  return {
    fsm,
    events,
    get board() {
      return run.board;
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
