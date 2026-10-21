import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Board } from '../../src/js/system/Board.js';
import { Raycaster } from '../../src/js/system/Raycaster.js';
import { validateLevel } from '../../src/js/system/LevelValidator.js';
import { entryCells, findTraps, isTrapEntry } from '../../src/js/system/TrapAnalysis.js';

const json = (n) => JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8'));
const levels = [1, 2, 3, 4, 5, 6].map(json);
const boards = levels.map((l) => Board.fromLevel(l));
const sweep = (board, cells, geometry) => Raycaster.sweep(board, board.launcher, cells, geometry);
const wallBounces = (res) => res.filter((r) => r.bounces === 1 && /^wall-/.test(r.surfaces[0].surface));
const at = (level, col, row) => level.blocks.find((b) => b.col === col && b.row === row);
const ofType = (level, type) => level.blocks.filter((b) => b.type === type);
const totalCoreHp = (level) => ofType(level, 'core').reduce((sum, b) => sum + b.hp, 0);

// Mechanics of a level (HU-08 s2): forced wall bounce, titanium, loop trap, orbs.
function mechanics(level, board) {
  const found = [];
  const targets = board.cores.flatMap((c) => [{ col: c.col, row: c.row }, ...entryCells(board, c)]);
  const res = sweep(board, targets, 'static');
  if (res.every((r) => r.bounces > 0) && wallBounces(res).length > 0) found.push('wallBounce');
  if (ofType(level, 'indestructible').length > 0) found.push('titanium');
  if (findTraps(board).length === 0 && board.cores.length > 0) found.push('loopTrap');
  if (board.orbs.length > 0) found.push('orbs');
  return found;
}

test.describe('level files', () => {
  test('six files with ids level-01..level-06 that all pass validateLevel', () => {
    expect(levels.map((l) => l.id)).toEqual(['level-01', 'level-02', 'level-03', 'level-04', 'level-05', 'level-06']);
    for (const l of levels) expect(validateLevel(l), l.id).toEqual({ valid: true, errors: [] });
  });
});

test.describe('tutorial levels 1-3', () => {
  test('level 1: data, one orb of value 1, light standard blocks, trap entry (3,2)', () => {
    const l = json(1);
    expect(l).toMatchObject({ name: 'Direct Shot', shots: 10, startBalls: 3 });
    expect(at(l, 4, 1)).toMatchObject({ type: 'core', hp: 100 });
    expect(ofType(l, 'multiplier')).toHaveLength(1);
    expect(ofType(l, 'multiplier')[0].value).toBe(1);
    for (const b of ofType(l, 'standard')) expect(b.hp).toBeGreaterThanOrEqual(1) && expect(b.hp).toBeLessThanOrEqual(10);
    expect(isTrapEntry(boards[0], boards[0].cores[0], [{ col: 3, row: 2 }])).toBe(true);
  });

  test('level 1: no direct line to the entry, exactly one side-wall bounce reaches it', () => {
    const res = sweep(boards[0], [{ col: 3, row: 2 }], 'preview');
    expect(res.filter((r) => r.bounces === 0)).toEqual([]);
    expect(wallBounces(res).length).toBeGreaterThan(0);
  });

  test('level 2: data, one orb of value 1, trap entry (6,2), titanium forces an obtuse wall bounce', () => {
    const l = json(2);
    expect(l).toMatchObject({ name: 'Titanium Wall', shots: 12, startBalls: 5 });
    expect(at(l, 7, 1)).toMatchObject({ type: 'core', hp: 150 });
    expect(ofType(l, 'multiplier').map((o) => o.value)).toEqual([1]);
    expect(isTrapEntry(boards[1], boards[1].cores[0], [{ col: 6, row: 2 }])).toBe(true);
    const res = sweep(boards[1], [{ col: 6, row: 2 }], 'preview');
    expect(res.filter((r) => r.bounces === 0)).toEqual([]);
    const bounce = wallBounces(res);
    expect(bounce.length).toBeGreaterThanOrEqual(20);
    expect(bounce.every((r) => r.angle > Math.PI / 2 && r.surfaces[0].surface === 'wall-left')).toBe(true);
    expect(sweep(boards[1], [{ col: 6, row: 2 }], 'static').filter((r) => r.bounces === 0)).toEqual([]);
  });

  test('level 3: data, core 300-400 HP at (4,4), two orbs of value 2, narrow entry (4,6)', () => {
    const l = json(3);
    expect(l).toMatchObject({ name: 'Loop Trap', shots: 12, startBalls: 8 });
    expect(at(l, 4, 4).type).toBe('core');
    expect(at(l, 4, 4).hp).toBeGreaterThanOrEqual(300);
    expect(at(l, 4, 4).hp).toBeLessThanOrEqual(400);
    expect(ofType(l, 'multiplier').map((o) => o.value)).toEqual([2, 2]);
    expect(isTrapEntry(boards[2], boards[2].cores[0], [{ col: 4, row: 6 }])).toBe(true);
    expect(sweep(boards[2], [{ col: 4, row: 6 }], 'preview').length).toBeGreaterThan(0);
  });
});

test.describe('challenge levels 4-6', () => {
  for (const n of [4, 5, 6]) {
    test(`level ${n}: shots 10-15, startBalls 3-10, core HP 100-500, >= 2 mechanics`, () => {
      const l = levels[n - 1];
      expect(l.shots).toBeGreaterThanOrEqual(10);
      expect(l.shots).toBeLessThanOrEqual(15);
      expect(l.startBalls).toBeGreaterThanOrEqual(3);
      expect(l.startBalls).toBeLessThanOrEqual(10);
      for (const c of ofType(l, 'core')) expect(c.hp).toBeGreaterThanOrEqual(100) && expect(c.hp).toBeLessThanOrEqual(500);
      const found = mechanics(l, boards[n - 1]);
      expect(found.length, found.join()).toBeGreaterThanOrEqual(2);
      expect(found).toContain('wallBounce');
    });

    test(`level ${n}: every core entry is 1-2 cells and reachable with at most one bounce (preview geometry)`, () => {
      const board = boards[n - 1];
      for (const core of board.cores) {
        const entries = entryCells(board, core);
        expect(entries.length, `core (${core.col},${core.row})`).toBeGreaterThan(0);
        expect(sweep(board, entries, 'preview').length, `core (${core.col},${core.row})`).toBeGreaterThan(0);
      }
    });
  }

  test('total core HP is non-decreasing from level 4 to 5 to 6', () => {
    const [t4, t5, t6] = [4, 5, 6].map((n) => totalCoreHp(levels[n - 1]));
    expect(t4).toBeLessThanOrEqual(t5);
    expect(t5).toBeLessThanOrEqual(t6);
    expect(t6).toBeGreaterThan(t4);
  });
});
