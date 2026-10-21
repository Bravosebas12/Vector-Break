// Shared fixtures for the volley economy specs (5b): a booted session on an open field.
import { readFileSync } from 'node:fs';
import { createSession } from '../../../src/js/system/GameSession.js';
import { Rng } from '../../../src/js/system/Rng.js';
import { STEP } from '../../../src/js/system/Layout.js';
import { Block } from '../../../src/js/entities/Block.js';
import { Multiplier } from '../../../src/js/entities/Multiplier.js';

const level = (n) => JSON.parse(readFileSync(new URL(`../../../src/levels/level${n}.json`, import.meta.url), 'utf8'));
export const LEVELS = [level(1), level(2), level(3)];
export const UP = { type: 'AIM', x: 540, y: 300 };

export function boot(opts = {}) {
  const s = createSession({ rng: new Rng(7), ...opts });
  s.setLevels(LEVELS);
  s.setLoadProgress(1, 1);
  s.dispatch({ type: 'FIRE', pointer: true });
  return s;
}

// Replaces the board contents with `extra` entities plus a far-away core, so balls fly free.
// `extra`: [{ type, col, row, hp?, value? }]. Returns the session.
export function openField(s, extra = []) {
  const b = s.board;
  b.cells.fill(null);
  b.blocks.length = 0;
  b.orbs.length = 0;
  b.cores.length = 0;
  for (const d of [{ type: 'core', col: 0, row: 0, hp: 100 }, ...extra]) {
    const e = d.type === 'multiplier' ? new Multiplier(d.col, d.row, d.value) : new Block(d.type, d.col, d.row, d.hp ?? 0);
    b.cells[d.row * b.cols + d.col] = e;
    (e instanceof Multiplier ? b.orbs : b.blocks).push(e);
    if (d.type === 'core') b.cores.push(e);
  }
  return s;
}

export function fire(s, aim = UP) {
  s.dispatch(aim);
  s.dispatch({ type: 'FIRE' });
}

// Steps until `done(snapshot)` or the step budget runs out; returns the number of steps taken.
export function stepUntil(s, done, max = 20000) {
  for (let i = 0; i < max; i++) {
    if (done(s.snapshot())) return i;
    s.step(STEP);
  }
  throw new Error('stepUntil: budget exhausted');
}

export const turnOver = (snap) => !['Firing', 'Simulating', 'Resolving'].includes(snap.state);
