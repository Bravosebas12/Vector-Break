// HU-13 simultaneous fire: openspec change anglecraft-v1-simultaneous-fire, game-state delta "Simultaneous fire",
// "FSM states and transitions", "Speed keys", "Volley time cap", aiming delta "Fire locks direction", "Launcher
// movement" and volley-economy delta "Turn-end synchronization". Titles carry the QA case IDs
// (Design/casos/hu-13-casos-de-prueba.md). Level 2 has 5 balls per turn; at 1X the cadence is 10 steps.
import { test, expect } from '@playwright/test';
import { boot, openField, stepUntil, turnOver } from './helpers/session.js';
import { STEP, EMIT_INTERVAL } from '../../src/js/system/Layout.js';

const UP = { type: 'AIM', x: 540, y: 300 };
const CADENCE = Math.ceil(EMIT_INTERVAL / STEP - 1e-9); // 10 steps at 1X
const FLYING = ['Firing', 'Simulating'];

function level2(mode = 1, opts = {}) {
  const s = boot({ fireMode: mode, ...opts });
  s.loadLevel(1);
  if (mode !== 1) s.setFireMode(mode); // loadLevel resets the mode to 1
  openField(s);
  return s;
}
const steps = (s, n) => {
  for (let i = 0; i < n; i++) s.step(STEP);
};
const shot = (s, aim = UP) => {
  s.dispatch(aim);
  s.dispatch({ type: 'FIRE' });
};
const emitted = (s) => s.snapshot().volley.emitted;
const drain = (s) => {
  const out = [];
  s.drainEvents((type) => out.push(type));
  return out;
};

test('CP-59 with a ball in flight a click fires the next one at once', () => {
  const s = level2();
  shot(s);
  steps(s, 12); // 0.1 s: the first ball is flying
  expect(s.snapshot()).toMatchObject({ state: 'Simulating', volley: { active: 1 } });
  shot(s);
  expect(s.snapshot()).toMatchObject({ state: 'Firing', volley: { emitted: 2, active: 2, size: 5 } });
});

test('CP-60 aiming in flight sets the direction of the next shot', () => {
  const s = level2();
  shot(s);
  steps(s, 12);
  s.dispatch({ type: 'AIM', x: 900, y: 600 });
  const aim = s.snapshot().aim;
  expect(aim.x).toBeGreaterThan(0.3);
  s.dispatch({ type: 'FIRE' });
  const last = s.snapshot().balls.at(-1);
  expect([last.dx, last.dy]).toEqual([aim.x, aim.y]);
});

test('CP-61 with no balls left a click fires nothing and changes nothing', () => {
  const s = level2();
  s.setVolley(2);
  shot(s);
  steps(s, CADENCE);
  shot(s);
  steps(s, CADENCE);
  const before = s.snapshot();
  expect(before).toMatchObject({ volley: { emitted: 2 } });
  shot(s);
  expect(s.snapshot().volley).toEqual(before.volley);
  expect(s.snapshot().state).toBe(before.state);
});

test('CP-62 the turn resolves once, when the last ball in flight lands', () => {
  const s = level2();
  for (let i = 0; i < 5; i++) {
    shot(s);
    steps(s, CADENCE);
  }
  expect(s.snapshot().volley).toMatchObject({ emitted: 5, active: 5 });
  stepUntil(s, turnOver);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', shots: { used: 1 }, volley: { emitted: 0, active: 0 } });
});

test('CP-63 destroying the last core wins at once: balls removed, the rest never fired', () => {
  const s = level2();
  s.board.cores[0].hp = 1; // core at col 0, row 0
  shot(s);
  steps(s, CADENCE);
  shot(s); // two balls flying straight up
  steps(s, CADENCE);
  shot(s, { type: 'AIM', x: 92, y: 28 }); // the third one goes for the core
  stepUntil(s, (snap) => !FLYING.includes(snap.state));
  const snap = s.snapshot();
  expect(snap.state).toBe('Victory');
  expect(snap.balls).toEqual([]);
  expect(snap.result.shots).toBe(1);
});

test('CP-63 the victory lands in the same step as the hit, with balls still flying before it', () => {
  const s = level2();
  s.board.cores[0].hp = 1;
  shot(s);
  steps(s, CADENCE);
  shot(s, { type: 'AIM', x: 92, y: 28 });
  let flyingBefore = 0;
  for (let i = 0; i < 2000 && FLYING.includes(s.snapshot().state); i++) {
    flyingBefore = s.snapshot().volley.active;
    s.step(STEP);
  }
  expect(s.snapshot().state).toBe('Victory');
  expect(flyingBefore).toBe(2); // the straight-up ball was still in the air when the core fell
});

test('CP-64 each shot in flight respects the fire mode', () => {
  const s = level2(2);
  shot(s);
  steps(s, CADENCE * 2);
  expect(emitted(s)).toBe(2);
  shot(s);
  steps(s, CADENCE * 2);
  expect(emitted(s)).toBe(4);
  shot(s);
  expect(emitted(s)).toBe(5);
});

test('CP-65 paused, a click fires nothing; after resuming it fires', () => {
  const s = level2();
  shot(s);
  steps(s, CADENCE);
  s.dispatch({ type: 'PAUSE' });
  shot(s);
  expect(emitted(s)).toBe(1);
  s.dispatch({ type: 'PAUSE' });
  shot(s);
  expect(emitted(s)).toBe(2);
});

test('CP-66 never more than 50 balls in flight', () => {
  const s = level2(3, { sealedFloor: true });
  s.setVolley(50);
  for (let i = 0; i < 40; i++) {
    shot(s);
    steps(s, CADENCE * 3);
  }
  const snap = s.snapshot();
  expect(snap.volley).toMatchObject({ emitted: 50, active: 50 });
  expect(snap.balls.length).toBe(50);
});

test('CP-67 A / D move the launcher in flight; the next shot leaves from there and flying balls keep their path', () => {
  const moved = level2();
  const still = level2();
  for (const s of [moved, still]) {
    shot(s, { type: 'AIM', x: 900, y: 300 });
    steps(s, 12);
  }
  moved.dispatch({ type: 'MOVE_START', dir: 1 });
  steps(moved, 60);
  moved.dispatch({ type: 'MOVE_STOP', dir: 1 });
  steps(still, 60);
  expect(moved.snapshot().launcherX).toBeCloseTo(780, 0);
  expect(moved.snapshot().balls[0]).toEqual(still.snapshot().balls[0]);
  shot(moved);
  expect(moved.snapshot().balls.at(-1).x).toBeCloseTo(780, 0);
});

test('CP-68 the cap counts from the turn first shot: the turn resolves and unfired balls are lost', () => {
  const s = level2(1, { sealedFloor: true, volleyCapS: 0.5 });
  shot(s);
  steps(s, 30); // 0.25 s
  shot(s); // a later shot does not restart the clock
  drain(s);
  const used = stepUntil(s, turnOver);
  expect(used * STEP).toBeLessThanOrEqual(0.25 + 2 * STEP);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', shots: { used: 1 }, volley: { active: 0, emitted: 0 } });
  expect(drain(s)).toContain('VOLLEY_CAPPED');
});

test('CP-69 a second shot before the cadence is ignored; after it, the next group leaves', () => {
  const s = level2();
  shot(s);
  steps(s, 6); // 0.05 s
  shot(s);
  expect(emitted(s)).toBe(1);
  steps(s, 5); // 0.0917 s after the first shot
  shot(s);
  expect(emitted(s)).toBe(2);
});

test('CP-70 the speed holds across the groups of a turn and resets to 1X on the next turn', () => {
  const s = level2();
  s.setVolley(2);
  shot(s);
  s.dispatch({ type: 'SET_SPEED', v: 4 });
  stepUntil(s, (snap) => snap.state === 'Aiming');
  expect(s.snapshot()).toMatchObject({ speed: 4, shots: { used: 0 } });
  shot(s);
  expect(s.snapshot().speed).toBe(4);
  stepUntil(s, turnOver);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', speed: 1, shots: { used: 1 } });
});

test('CP-71 a shot while the group still emits is ignored and the group keeps its origin', () => {
  const s = level2(3);
  shot(s);
  steps(s, CADENCE);
  expect(emitted(s)).toBe(2);
  s.dispatch({ type: 'MOVE_START', dir: 1 });
  shot(s);
  steps(s, CADENCE);
  expect(emitted(s)).toBe(3);
  expect(s.snapshot().balls.map((b) => b.x)).toEqual([540, 540, 540]); // straight up from the locked x
  expect(s.snapshot().launcherX).toBeGreaterThan(540);
});

test('the fire mode stays locked while balls are in flight (D-13.5)', () => {
  const s = level2(2);
  shot(s);
  steps(s, CADENCE * 2);
  s.dispatch({ type: 'CYCLE_MODE' });
  s.dispatch({ type: 'SET_MODE', v: 1 });
  expect(s.snapshot().fireMode).toBe(2);
});

test('CP-73 paused, A / D do not move the launcher with balls in flight', () => {
  const s = level2();
  shot(s);
  steps(s, 12);
  s.dispatch({ type: 'PAUSE' });
  s.dispatch({ type: 'MOVE_START', dir: -1 });
  steps(s, 60);
  expect(s.snapshot().launcherX).toBe(540);
});
