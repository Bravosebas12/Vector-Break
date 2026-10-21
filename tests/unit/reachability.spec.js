import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Board } from '../../src/js/system/Board.js';
import { Raycaster } from '../../src/js/system/Raycaster.js';

const HP = { standard: 3, reinforced: 30, core: 100 };
function boardWith(...defs) {
  const blocks = defs.map(([type, col, row]) => ({ type, col, row, ...(HP[type] ? { hp: HP[type] } : {}) }));
  if (!blocks.some((b) => b.type === 'core')) blocks.push({ type: 'core', col: 0, row: 0, hp: 100 });
  return Board.fromLevel({ id: 'level-99', name: 't', grid: { cols: 9, rows: 12 }, launcher: { x: 0.5 }, shots: 5, startBalls: 3, blocks });
}
const fixture = (n) => Board.fromLevel(JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8')));
const row = (type, r) => Array.from({ length: 9 }, (_, c) => [type, c, r]);
const sweep = (board, target, geometry) => Raycaster.sweep(board, board.launcher, target, geometry);
const topRow = Array.from({ length: 9 }, (_, col) => ({ col, row: 0 }));
const LO = Math.asin(0.05);

test.describe('Raycaster.sweep', () => {
  test('sweeps angles in [asin 0.05, pi - asin 0.05], ascending, each result carries bounces and surfaces', () => {
    const res = sweep(boardWith(['core', 8, 11]), topRow, 'preview');
    expect(res.length).toBeGreaterThan(1000);
    expect(res.length).toBeLessThanOrEqual(3600);
    expect(res[0].angle).toBeGreaterThanOrEqual(LO);
    expect(res.at(-1).angle).toBeLessThanOrEqual(Math.PI - LO);
    expect(res.every((r, i) => i === 0 || r.angle > res[i - 1].angle)).toBe(true);
    const straight = res.find((r) => Math.abs(r.angle - Math.PI / 2) < 0.002);
    expect(straight).toMatchObject({ bounces: 0, surfaces: [] });
  });

  test('the post-bounce segment is unbounded (reaches far beyond the 180 px preview)', () => {
    const far = sweep(boardWith(), [{ col: 8, row: 0 }], 'preview').filter((r) => r.bounces === 1);
    expect(far.length).toBeGreaterThan(0);
    expect(far.some((r) => r.surfaces.length === 1 && r.surfaces[0].surface === 'wall-left')).toBe(true);
  });

  test('records the surface and block type of each contact, including a hit on the target block', () => {
    const res = sweep(boardWith(['core', 4, 1], ['indestructible', 3, 1]), [{ col: 4, row: 1 }], 'preview');
    const direct = res.filter((r) => r.bounces === 0);
    expect(direct.length).toBeGreaterThan(0);
    expect(direct.every((r) => r.surfaces.at(-1).blockType === 'core' || r.surfaces.length === 0)).toBe(true);
    expect(direct.some((r) => r.surfaces.length === 1 && r.surfaces[0].surface === 'block')).toBe(true);
  });

  test('at most one reflection: a target needing two bounces is not reached', () => {
    // A closed box around the target cell (4,3): only a block-first path or none can touch it.
    const box = [['indestructible', 3, 2], ['indestructible', 4, 2], ['indestructible', 5, 2], ['indestructible', 3, 3], ['indestructible', 5, 3], ['indestructible', 3, 4], ['indestructible', 4, 4], ['indestructible', 5, 4]];
    expect(sweep(boardWith(...box), [{ col: 4, row: 3 }], 'preview')).toEqual([]);
  });

  test('static geometry ignores standard blocks, preview treats them as obstacles', () => {
    const board = boardWith(...row('standard', 5));
    const target = [{ col: 4, row: 3 }];
    expect(sweep(board, target, 'static').length).toBeGreaterThan(0);
    expect(sweep(board, target, 'preview')).toEqual([]);
  });

  test('a row sealed with indestructible blocks blocks both geometries', () => {
    const board = boardWith(...row('indestructible', 5));
    const target = [{ col: 4, row: 3 }];
    expect(sweep(board, target, 'static')).toEqual([]);
    expect(sweep(board, target, 'preview')).toEqual([]);
  });
});

test.describe('authored levels (preview geometry, authored entry)', () => {
  test('level 1: (3,2) reachable with exactly one side-wall bounce', () => {
    const res = sweep(fixture(1), [{ col: 3, row: 2 }], 'preview');
    const one = res.filter((r) => r.bounces === 1 && r.surfaces.length === 1 && /^wall-/.test(r.surfaces[0].surface));
    expect(one.length).toBeGreaterThan(0);
  });

  test('level 2: (6,2) has no direct path but a wall-bounce path exists', () => {
    const res = sweep(fixture(2), [{ col: 6, row: 2 }], 'preview');
    expect(res.filter((r) => r.bounces === 0)).toEqual([]);
    expect(res.filter((r) => r.bounces === 1 && /^wall-/.test(r.surfaces[0].surface)).length).toBeGreaterThan(0);
  });

  test('levels 1-3: the authored entry is reachable under static geometry (blockers only)', () => {
    for (const [n, cell] of [[1, { col: 3, row: 2 }], [2, { col: 6, row: 2 }], [3, { col: 4, row: 6 }]]) {
      expect(sweep(fixture(n), [cell], 'static').length, `level ${n}`).toBeGreaterThan(0);
    }
  });

  test('level 3: (4,6) is reachable', () => {
    expect(sweep(fixture(3), [{ col: 4, row: 6 }], 'preview').length).toBeGreaterThan(0);
  });
});
