// HU-14 free launcher: openspec change anglecraft-v1-free-launcher, volley-economy delta "Turn-end
// synchronization" and aiming delta "Launcher movement". Landing balls never move the launcher; only A / D,
// loading a level and restart do (D-14.1). Titles carry the QA case IDs (Design/casos/hu-14-casos-de-prueba.md).
import { test, expect } from '@playwright/test';
import { boot, openField, stepUntil } from './helpers/session.js';
import { STEP, LAUNCHER_Y } from '../../src/js/system/Layout.js';

const FLYING = ['Firing', 'Simulating', 'Resolving'];
const x = (s) => s.snapshot().launcherX;

// Real level board, fire mode `mode`, launcher placed at `at`.
function level(index, mode, at = 300, opts = {}) {
  const s = boot({ fireMode: mode, ...opts });
  s.loadLevel(index);
  s.setLauncherX(at);
  return s;
}

// Fires one group at `deg` and steps until the session is no longer flying; returns the x of the balls seen
// at the launch line, so a test can show the balls landed away from the launcher.
function group(s, deg) {
  const lx = x(s);
  const rad = (deg * Math.PI) / 180;
  s.dispatch({ type: 'AIM', x: lx + Math.cos(rad) * 1000, y: LAUNCHER_Y - Math.sin(rad) * 1000 });
  s.dispatch({ type: 'FIRE' });
  const landings = [];
  for (let i = 0; i < 40000 && FLYING.includes(s.snapshot().state); i++) {
    s.step(STEP);
    for (const b of s.snapshot().balls) if (b.dy > 0 && b.y > LAUNCHER_Y - 20) landings.push(b.x);
  }
  return landings;
}
const hold = (s, dir, seconds) => {
  s.dispatch({ type: 'MOVE_START', dir });
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.step(STEP);
  s.dispatch({ type: 'MOVE_STOP', dir });
};

test('CP-36 after a group the launcher stays where the player left it', () => {
  const s = level(0, 1);
  s.setVolley(3); // the turn goes on after the first group
  const landings = group(s, 60);
  expect(s.snapshot().state).toBe('Aiming');
  expect(Math.max(...landings.map((l) => Math.abs(l - 300)))).toBeGreaterThan(100);
  expect(x(s)).toBe(300);
});

for (const mode of [2, 3]) {
  test(`CP-37 in mode ${mode} the launcher does not move between the groups of a turn`, () => {
    const s = level(1, mode); // level 2: 5 balls per turn
    const seen = [];
    do {
      group(s, 60);
      if (s.snapshot().state === 'Aiming') seen.push(x(s));
    } while (s.snapshot().state === 'Aiming' && s.snapshot().shots.used === 0);
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen)).toEqual(new Set([300]));
  });
}

test('CP-38 the launcher keeps its position when the next turn starts', () => {
  const s = level(0, 1);
  s.setVolley(1); // one ball: each group ends the turn
  group(s, 60);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', shots: { used: 1 } });
  expect(x(s)).toBe(300);
});

test('CP-39 only A / D move it: holding D 0.5 s from the kept 300 reaches 540', () => {
  const s = level(0, 1);
  s.setVolley(1);
  group(s, 60);
  hold(s, 1, 0.5);
  expect(x(s)).toBeCloseTo(540, 0);
});

test('CP-40 loading the next level starts the launcher at that level start', () => {
  const s = level(0, 1, 92, { canAccess: () => true }); // straight under a weak core in the corner; level 2 unlocked
  openField(s);
  s.board.cores[0].hp = 1;
  s.setVolley(1);
  group(s, 90);
  expect(s.snapshot().state).toBe('Victory');
  s.dispatch({ type: 'NEXT' });
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 1 } });
  expect(x(s)).toBe(540);
});

test('CP-41 R returns the launcher to the level start, with turns and mode reset', () => {
  const s = level(1, 2);
  s.setVolley(1);
  group(s, 60);
  expect(s.snapshot().shots.used).toBe(1);
  s.dispatch({ type: 'RESTART' });
  expect(x(s)).toBe(540);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', shots: { used: 0 }, fireMode: 1 });
});
