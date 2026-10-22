// Levels stay solvable with fire groups and simultaneous fire (openspec changes anglecraft-v1-launcher-and-fire-mode
// task 6.1, anglecraft-v1-free-launcher D3 and anglecraft-v1-simultaneous-fire D9).
// - 'turn' mode: the v1 solutions (tests/fixtures/solutions.json) still win, one FIRE per turn, with the launcher
//   placed at the recorded x of each shot (`xs`).
// - mode 1 (one ball per FIRE): firing again every EMIT_INTERVAL while the turn flies (HU-13) emits like the v1
//   volley, each ball at most one step later (a FIRE arrives between steps, v1 emits inside a step), so the same
//   solutions win every level in the same number of shots and with the same score.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createSession } from '../../src/js/system/GameSession.js';
import { Rng } from '../../src/js/system/Rng.js';
import { STEP, LAUNCHER_Y } from '../../src/js/system/Layout.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => read(`../../src/levels/level${n}.json`));
const V1 = read('../fixtures/solutions.json');
const FLYING = ['Firing', 'Simulating', 'Resolving'];
const IN_FLIGHT = ['Firing', 'Simulating'];

function start(index, mode) {
  const s = createSession({ rng: new Rng(1), fireMode: mode });
  s.setLevels(LEVELS);
  s.setLoadProgress(1, 1);
  s.loadLevel(index);
  if (mode !== 1) s.setFireMode(mode);
  s.rng.setSeed(V1.seed);
  return s;
}

// One turn of the v1 solution: place the launcher, aim, FIRE; in mode 1 keep firing while the turn flies (the
// session accepts each FIRE once the cadence allows). `onStep` sees the session after every step.
function turn(s, x, deg, mode, onStep = () => {}) {
  s.setLauncherX(x);
  const lx = s.run.launcherX;
  const rad = (deg * Math.PI) / 180;
  s.dispatch({ type: 'AIM', x: lx + Math.cos(rad) * 1000, y: LAUNCHER_Y - Math.sin(rad) * 1000 });
  s.dispatch({ type: 'FIRE' });
  for (let i = 0; i < 120000 && FLYING.includes(s.snapshot().state); i++) {
    s.step(STEP);
    onStep(s);
    if (mode === 1 && IN_FLIGHT.includes(s.snapshot().state)) s.dispatch({ type: 'FIRE' });
  }
}

function play(index, mode) {
  const s = start(index, mode);
  const { angles, xs } = V1.levels[index];
  for (const [k, deg] of angles.entries()) {
    if (s.snapshot().state !== 'Aiming') break;
    turn(s, xs[k], deg, mode);
  }
  return s.snapshot();
}

for (let i = 0; i < 6; i++) {
  const shots = V1.levels[i].angles.length;
  test(`CP-44 level ${i + 1}: the v1 solution still wins in 'turn' mode`, () => {
    expect(play(i, 'turn')).toMatchObject({ state: 'Victory', shots: { used: shots } });
  });

  test(`CP-74 level ${i + 1}: the v1 solution wins in mode 1 firing at the cadence, with the same shots and score`, () => {
    const v1 = play(i, 'turn');
    expect(play(i, 1)).toMatchObject({ state: 'Victory', shots: { used: shots }, score: v1.score });
  });
}

test('mode 1 at the cadence emits every ball of the volley at most one step after v1', () => {
  const emissions = (mode) => {
    const s = start(1, mode);
    const at = [];
    const { angles, xs } = V1.levels[1];
    let k = 0;
    turn(s, xs[0], angles[0], mode, (t) => {
      k++;
      while (at.length < t.snapshot().volley.emitted) at.push(k);
    });
    return at;
  };
  const [v1, m1] = [emissions('turn'), emissions(1)];
  expect(m1.length).toBe(v1.length);
  m1.forEach((step, i) => expect(step - v1[i], `ball ${i + 1}`).toBeGreaterThanOrEqual(0));
  m1.forEach((step, i) => expect(step - v1[i], `ball ${i + 1}`).toBeLessThanOrEqual(1));
});
