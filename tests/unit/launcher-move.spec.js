// HU-10 launcher movement: openspec change anglecraft-v1-launcher-and-fire-mode, aiming delta "Launcher movement",
// "Preview from the moved launcher" and game-state delta "Input mapping". Titles carry the QA case IDs.
import { test, expect } from '@playwright/test';
import { boot, openField, fire, stepUntil, turnOver, UP } from './helpers/session.js';
import { mapEvent, allows } from '../../src/js/system/Input.js';
import { STEP } from '../../src/js/system/Layout.js';

const steps = (s, seconds) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.step(STEP);
};
const hold = (s, dir, seconds) => {
  s.dispatch({ type: 'MOVE_START', dir });
  steps(s, seconds);
  s.dispatch({ type: 'MOVE_STOP', dir });
};
const x = (s) => s.snapshot().launcherX;
const at = (s, value) => {
  s.run.launcherX = value;
};
const drain = (s) => {
  const out = [];
  s.drainEvents((type) => out.push(type));
  return out;
};

test.describe('input mapping for A, D and M', () => {
  test('a / A / d / D keydown map to MOVE_START, keyup to MOVE_STOP; auto-repeat is ignored; M cycles the mode', () => {
    expect(mapEvent({ type: 'keydown', key: 'a' })).toEqual({ type: 'MOVE_START', dir: -1 });
    expect(mapEvent({ type: 'keydown', key: 'A' })).toEqual({ type: 'MOVE_START', dir: -1 });
    expect(mapEvent({ type: 'keydown', key: 'd' })).toEqual({ type: 'MOVE_START', dir: 1 });
    expect(mapEvent({ type: 'keydown', key: 'D' })).toEqual({ type: 'MOVE_START', dir: 1 });
    expect(mapEvent({ type: 'keyup', key: 'a' })).toEqual({ type: 'MOVE_STOP', dir: -1 });
    expect(mapEvent({ type: 'keyup', key: 'D' })).toEqual({ type: 'MOVE_STOP', dir: 1 });
    expect(mapEvent({ type: 'keydown', key: 'a', repeat: true })).toBeNull();
    expect(mapEvent({ type: 'keydown', key: 'm' })).toEqual({ type: 'CYCLE_MODE' });
    expect(mapEvent({ type: 'keyup', key: 'p' })).toBeNull();
  });

  test('MOVE_START is allowed in Aiming and in flight (HU-13), not paused; MOVE_STOP is always allowed once loaded', () => {
    const start = { type: 'MOVE_START', dir: 1 };
    const stop = { type: 'MOVE_STOP', dir: 1 };
    for (const st of ['Aiming', 'Firing', 'Simulating']) expect(allows(st, false, start)).toBe(true);
    for (const st of ['Loading', 'Title', 'Resolving', 'Victory', 'GameOver']) expect(allows(st, false, start)).toBe(false);
    expect(allows('Simulating', true, start)).toBe(false);
    expect(allows('Aiming', true, start)).toBe(false);
    expect(allows('Aiming', true, stop)).toBe(true);
    expect(allows('Simulating', false, stop)).toBe(true);
    expect(allows('Loading', false, stop)).toBe(false);
  });
});

test.describe('launcher movement (HU-10)', () => {
  test('CP-02 holding A for 0.5 s moves the launcher 240 px left (540 -> 300)', () => {
    const s = boot();
    hold(s, -1, 0.5);
    expect(x(s)).toBeCloseTo(300, 0);
  });

  test('CP-03 holding D for 0.5 s moves the launcher 240 px right (540 -> 780)', () => {
    const s = boot();
    hold(s, 1, 0.5);
    expect(x(s)).toBeCloseTo(780, 0);
  });

  test('CP-05 from x 1000, holding A for 2.5 s crosses the whole width and stops at 50', () => {
    const s = boot();
    at(s, 1000);
    hold(s, -1, 2.5);
    expect(x(s)).toBe(50);
  });

  test('CP-06 a tap of D (released within one step) moves exactly 8 px', () => {
    const s = boot();
    s.dispatch({ type: 'MOVE_START', dir: 1 });
    s.step(STEP);
    s.dispatch({ type: 'MOVE_STOP', dir: 1 });
    expect(x(s)).toBe(548);
  });

  test('CP-07 ten taps of A move 80 px; a following 0.5 s hold adds 240 px', () => {
    const s = boot();
    for (let i = 0; i < 10; i++) {
      s.dispatch({ type: 'MOVE_START', dir: -1 });
      s.dispatch({ type: 'MOVE_STOP', dir: -1 });
    }
    expect(x(s)).toBe(460);
    hold(s, -1, 0.5);
    expect(x(s)).toBeCloseTo(220, 0);
  });

  test('CP-08 held A stays at x 50 at the left edge; a D tap then moves to 58', () => {
    const s = boot();
    at(s, 100);
    s.dispatch({ type: 'MOVE_START', dir: -1 });
    steps(s, 2);
    const readings = [];
    for (let i = 0; i < 10; i++) {
      steps(s, 0.1);
      readings.push(x(s));
    }
    s.dispatch({ type: 'MOVE_STOP', dir: -1 });
    expect(readings.every((v) => v === 50)).toBe(true);
    s.dispatch({ type: 'MOVE_START', dir: 1 });
    s.dispatch({ type: 'MOVE_STOP', dir: 1 });
    expect(x(s)).toBe(58);
  });

  test('CP-09 held D stays at x 1030 at the right edge', () => {
    const s = boot();
    at(s, 980);
    s.dispatch({ type: 'MOVE_START', dir: 1 });
    steps(s, 3);
    expect(x(s)).toBe(1030);
  });

  test('CP-13 with A and D held together the launcher stays; releasing A resumes D', () => {
    const s = boot();
    s.dispatch({ type: 'MOVE_START', dir: -1 });
    s.dispatch({ type: 'MOVE_START', dir: 1 });
    steps(s, 0.5);
    expect(x(s)).toBe(540);
    s.dispatch({ type: 'MOVE_STOP', dir: -1 });
    steps(s, 0.25);
    expect(x(s)).toBeCloseTo(660, 0);
  });

  // CP-10 is superseded by HU-13 (D-13.2): A / D move the launcher in flight; pause still blocks them.
  test('CP-10 movement works while a volley flies (HU-13) and is ignored while paused', () => {
    const s = boot();
    openField(s);
    fire(s);
    s.dispatch({ type: 'MOVE_START', dir: -1 });
    steps(s, 0.5);
    s.dispatch({ type: 'MOVE_STOP', dir: -1 });
    expect(x(s)).toBeCloseTo(300, 0);
    stepUntil(s, turnOver);
    expect(x(s)).toBeCloseTo(300, 0); // HU-14: landings do not move it
    s.dispatch({ type: 'PAUSE' });
    s.dispatch({ type: 'MOVE_START', dir: -1 });
    steps(s, 0.5);
    expect(x(s)).toBeCloseTo(300, 0);
  });

  test('CP-10 a key held through FIRE keeps moving the launcher in flight (HU-13)', () => {
    const s = boot();
    openField(s);
    s.dispatch({ type: 'MOVE_START', dir: 1 });
    fire(s);
    steps(s, 0.25);
    expect(x(s)).toBeCloseTo(660, 0);
  });

  test('CP-11 A / D do nothing on the victory modal', () => {
    const s = boot();
    openField(s).setVolley(1);
    s.board.cores[0].hp = 0;
    fire(s, UP);
    stepUntil(s, (snap) => snap.state === 'Victory');
    const before = x(s);
    s.dispatch({ type: 'MOVE_START', dir: -1 });
    steps(s, 0.5);
    expect([s.snapshot().state, x(s)]).toEqual(['Victory', before]);
  });

  test('CP-14 RESTART restores the level launcher x', () => {
    const s = boot();
    hold(s, 1, 1);
    s.dispatch({ type: 'RESTART' });
    expect(x(s)).toBe(540);
  });

  test('CP-12 every ball of the shot starts at the moved launcher x', () => {
    const s = boot();
    openField(s);
    hold(s, -1, 0.5);
    s.dispatch({ type: 'AIM', x: 300, y: 300 });
    s.dispatch({ type: 'FIRE' });
    expect(s.snapshot().balls[0].x).toBeCloseTo(300, 0);
  });

  test('CP-04 moving recomputes the aim toward the same pointer target from the new origin', () => {
    const s = boot();
    s.dispatch({ type: 'AIM', x: 540, y: 300 });
    expect(s.snapshot().aim.x).toBeCloseTo(0, 5);
    hold(s, 1, 0.25); // launcher at 660, target still (540, 300)
    const a = s.snapshot().aim;
    expect(a.x).toBeLessThan(0);
    expect(a.x / -a.y).toBeCloseTo((540 - 660) / (956 - 300), 3);
  });

  test('a movement emits LAUNCHER_MOVED once per key press', () => {
    const s = boot();
    drain(s);
    hold(s, 1, 0.2);
    expect(drain(s).filter((t) => t === 'LAUNCHER_MOVED')).toEqual(['LAUNCHER_MOVED']);
  });
});
