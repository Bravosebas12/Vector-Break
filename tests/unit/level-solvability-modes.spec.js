// Levels stay solvable with fire groups (openspec change anglecraft-v1-launcher-and-fire-mode, task 6.1).
// - 'turn' mode: the v1 solutions (tests/fixtures/solutions.json) still win, one FIRE per turn, with the launcher
//   placed at the recorded x of each shot (`xs`, openspec change anglecraft-v1-free-launcher D3).
// - mode 1: the v1 solutions do not transfer (they rely on several balls in flight at once), so each level has
//   its own mode-1 plan in tests/fixtures/solutions-mode1.json, found offline by a greedy search over angles and
//   launcher positions. Each step is { x, deg }: x = launcher x set before the shot (reachable with A / D,
//   D-10.2); deg = aim angle. Replayed from a fresh session it must win
//   within the level's shots.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createSession } from '../../src/js/system/GameSession.js';
import { Rng } from '../../src/js/system/Rng.js';
import { STEP, LAUNCHER_Y } from '../../src/js/system/Layout.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => read(`../../src/levels/level${n}.json`));
const V1 = read('../fixtures/solutions.json');
const MODE1 = read('../fixtures/solutions-mode1.json');
const FLYING = ['Firing', 'Simulating', 'Resolving'];
// Known open (design OI-1): no mode-1 plan was found for levels 4-6 (greedy search in mode 1 and mode 3 ends
// with the core at ~21-241 HP). Their v1 solutions need several balls in flight at once; re-check with HU-13
// (simultaneous firing) or after a balance review.
const KNOWN_OPEN = new Set([4, 5, 6]);

function start(index, mode) {
  const s = createSession({ rng: new Rng(1), fireMode: mode });
  s.setLevels(LEVELS);
  s.setLoadProgress(1, 1);
  s.loadLevel(index);
  s.rng.setSeed(V1.seed);
  return s;
}

function shoot(s, deg) {
  const x = s.run.launcherX;
  const rad = (deg * Math.PI) / 180;
  s.dispatch({ type: 'AIM', x: x + Math.cos(rad) * 1000, y: LAUNCHER_Y - Math.sin(rad) * 1000 });
  s.dispatch({ type: 'FIRE' });
  for (let i = 0; i < 120000 && FLYING.includes(s.snapshot().state); i++) s.step(STEP);
}

for (let i = 0; i < 6; i++) {
  test(`CP-44 level ${i + 1}: the v1 solution still wins in 'turn' mode`, () => {
    const s = start(i, 'turn');
    const { angles, xs } = V1.levels[i];
    for (const [k, deg] of angles.entries()) {
      if (s.snapshot().state !== 'Aiming') break;
      s.setLauncherX(xs[k]);
      shoot(s, deg);
    }
    expect(s.snapshot().state).toBe('Victory');
  });

  const modeOne = KNOWN_OPEN.has(i + 1) ? test.fixme : test;
  modeOne(`CP-44 level ${i + 1}: solvable in mode 1 within its shots (one ball per shot)`, () => {
    const plan = MODE1.levels[i];
    expect(plan?.level, 'a mode-1 plan exists for this level').toBe(i + 1);
    const s = start(i, 1);
    for (const step of plan.steps) {
      if (s.snapshot().state !== 'Aiming') break;
      s.setLauncherX(step.x);
      shoot(s, step.deg);
    }
    const end = s.snapshot();
    expect(end.state).toBe('Victory');
    expect(end.shots.used).toBeLessThanOrEqual(LEVELS[i].shots);
  });
}
