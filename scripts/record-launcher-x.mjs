// Dev-only: record the launcher x before every shot of the seeded solutions (openspec change
// anglecraft-v1-free-launcher, design D3). Run it while automatic relocation still exists: it replays
// tests/fixtures/solutions.json in 'turn' mode and the mode-1 plans, then writes `xs` next to `angles` and
// replaces every `x: null` with the recorded x. Replays that place the launcher at these positions then win
// without relocation (HU-14), since any x is reachable with A / D.
// Usage: node scripts/record-launcher-x.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createSession } from '../src/js/system/GameSession.js';
import { Rng } from '../src/js/system/Rng.js';
import { STEP, LAUNCHER_Y } from '../src/js/system/Layout.js';

const url = (p) => new URL(p, import.meta.url);
const read = (p) => JSON.parse(readFileSync(url(p), 'utf8'));
const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => read(`../src/levels/level${n}.json`));
const V1_PATH = '../tests/fixtures/solutions.json';
const MODE1_PATH = '../tests/fixtures/solutions-mode1.json';
const V1 = read(V1_PATH);
const MODE1 = read(MODE1_PATH);
const FLY = ['Firing', 'Simulating', 'Resolving'];

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
  for (let i = 0; i < 120000 && FLY.includes(s.snapshot().state); i++) s.step(STEP);
}

const v1 = V1.levels.map((level, i) => {
  const s = start(i, 'turn');
  const xs = [];
  for (const deg of level.angles) {
    if (s.snapshot().state !== 'Aiming') break;
    xs.push(s.run.launcherX);
    shoot(s, deg);
  }
  console.log(`v1 level ${i + 1}: ${s.snapshot().state} in ${xs.length} shots`);
  return { ...level, xs };
});

const mode1 = MODE1.levels.map((plan) => {
  const s = start(plan.level - 1, 1);
  const steps = [];
  for (const step of plan.steps) {
    if (s.snapshot().state !== 'Aiming') break;
    if (step.x !== null) s.setLauncherX(step.x);
    steps.push({ x: s.run.launcherX, deg: step.deg });
    shoot(s, step.deg);
  }
  console.log(`mode-1 level ${plan.level}: ${s.snapshot().state} in ${steps.length} groups`);
  return { ...plan, steps };
});

const row = (l) => `    ${JSON.stringify(l).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/,(?=[-\d])/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`;
writeFileSync(url(V1_PATH), `{\n  "seed": ${V1.seed},\n  "levels": [\n${v1.map(row).join(',\n')}\n  ]\n}\n`);
writeFileSync(url(MODE1_PATH), `${JSON.stringify({ ...MODE1, levels: mode1 }, null, 2)}\n`);
