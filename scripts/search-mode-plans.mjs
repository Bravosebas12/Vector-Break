// Dev-only: greedy search for a plan that wins a level with fire groups (openspec change
// anglecraft-v1-launcher-and-fire-mode, design D10). At each group it tries angles x launcher positions on a
// copy of the current state and keeps the shot with the most core damage. Slow (minutes to ~20 min per level).
// Usage: MODE=1 node scripts/search-mode-plans.mjs <level index 0-5> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { createSession } from '../src/js/system/GameSession.js';
import { Rng } from '../src/js/system/Rng.js';
import { STEP } from '../src/js/system/Layout.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => read(`../src/levels/level${n}.json`));
const FLY = ['Firing', 'Simulating', 'Resolving'];
const idx = Number(process.argv[2] ?? 0);
const ANGLES = Array.from({ length: 25 }, (_, i) => 12 + i * 6.5); // 12..168
const XS = [null, 150, 540, 930]; // null = stay where relocated

function fresh() {
  const s = createSession({ rng: new Rng(1), fireMode: Number(process.env.MODE ?? 1) });
  s.setLevels(LEVELS);
  s.setLoadProgress(1, 1);
  s.loadLevel(idx);
  if (process.env.MODE) s.setFireMode(Number(process.env.MODE));
  return s;
}

// Copy the mutable state of `src` (in Aiming, no ball in flight) into a fresh session.
function clone(src) {
  const s = fresh();
  const keep = new Map(src.board.blocks.map((b) => [b.row * src.board.cols + b.col, b.hp]));
  for (let i = s.board.blocks.length - 1; i >= 0; i--) {
    const b = s.board.blocks[i];
    const cell = b.row * s.board.cols + b.col;
    if (!keep.has(cell)) {
      s.board.cells[cell] = null;
      s.board.blocks.splice(i, 1);
    } else b.hp = keep.get(cell);
  }
  for (const c of s.board.cores) {
    const cell = c.row * s.board.cols + c.col;
    c.hp = keep.has(cell) ? keep.get(cell) : 0;
  }
  src.board.orbs.forEach((o, i) => {
    if (o.captured && !s.board.orbs[i].captured) {
      s.board.orbs[i].captured = true;
      s.board.cells[o.row * s.board.cols + o.col] = null;
    }
  });
  for (const k of ['launcherX', 'volleySize', 'emitted', 'shotsUsed', 'pendingBonus', 'damage']) s.run[k] = src.run[k];
  return s;
}

function shoot(s, x, deg) {
  if (x !== null) s.run.launcherX = x;
  const lx = s.run.launcherX;
  const r = (deg * Math.PI) / 180;
  s.dispatch({ type: 'AIM', x: lx + Math.cos(r) * 1000, y: 956 - Math.sin(r) * 1000 });
  s.dispatch({ type: 'FIRE' });
  for (let i = 0; i < 120000 && FLY.includes(s.snapshot().state); i++) s.step(STEP);
}

const coreHp = (s) => s.board.cores.reduce((a, c) => a + Math.max(0, c.hp), 0);
let s = fresh();
const plan = [];
const t0 = Date.now();
while (s.snapshot().state === 'Aiming' && plan.length < 400) {
  let best = null;
  for (const x of XS)
    for (const deg of ANGLES) {
      const c = clone(s);
      const hp0 = coreHp(c);
      const d0 = c.run.damage;
      shoot(c, x, deg);
      const won = c.snapshot().state === 'Victory';
      const score = (won ? 1e9 : 0) + (hp0 - coreHp(c)) * 1000 + (c.run.damage - d0);
      if (!best || score > best.score) best = { score, x, deg };
    }
  shoot(s, best.x, best.deg);
  plan.push({ x: best.x, deg: +best.deg.toFixed(2) });
  console.error(`group ${plan.length} shots ${s.snapshot().shots.used} coreHp ${coreHp(s)} t ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const end = s.snapshot();
console.log(JSON.stringify({ level: idx + 1, state: end.state, shotsUsed: end.shots.used, shots: LEVELS[idx].shots, groups: plan.length, coreHp: coreHp(s), seconds: (Date.now() - t0) / 1000 }));
writeFileSync(process.argv[3] ?? `plan-m${process.env.MODE ?? 1}-${idx + 1}.json`, JSON.stringify(plan));
