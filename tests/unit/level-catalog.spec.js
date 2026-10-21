import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Board } from '../../src/js/system/Board.js';
import { LevelCatalog, LevelError } from '../../src/js/system/LevelCatalog.js';
import { Block } from '../../src/js/entities/Block.js';
import { Multiplier } from '../../src/js/entities/Multiplier.js';

const load = (n) =>
  JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8'));
const catalogWith = () => {
  const c = new LevelCatalog();
  c.setLevels([load(1), load(2), load(3)]);
  return c;
};

test.describe('Board (layout B1)', () => {
  const board = Board.fromLevel(load(1));

  test('cell (4,1) maps to x 484..596, y 56..112', () => {
    expect(Board.cellRect(4, 1)).toEqual({ x: 484, y: 56, w: 112, h: 56 });
    expect(Board.cellRect(0, 0)).toEqual({ x: 36, y: 0, w: 112, h: 56 });
  });

  test('launcher.x is scaled by the board width, y is the launch line', () => {
    expect(board.launcher).toEqual({ x: 540, y: 956 });
    expect(Board.fromLevel({ ...load(1), launcher: { x: 0.25 } }).launcher.x).toBe(270);
  });

  test('blocks, cores and orbs are separate entities; orbs are never solid', () => {
    const orb = board.orbs[0];
    expect(orb).toBeInstanceOf(Multiplier);
    expect(orb).toMatchObject({ value: 1, radius: 24, col: 1, row: 8 });
    expect(board.blockAt(1, 8)).toBeNull();
    expect(board.typeAt(1, 8)).toBe('multiplier');
    expect(board.cores).toHaveLength(1);
    expect(board.blockAt(4, 1)).toBeInstanceOf(Block);
    expect(board.blockAt(4, 1)).toMatchObject({ type: 'core', hp: 100 });
    expect(board.blockAt(0, 0)).toBeNull();
    expect(board.typeAt(0, 0)).toBeNull();
  });

  test('shots and starting balls are carried over', () => {
    expect(board).toMatchObject({ shots: 10, startBalls: 3, cols: 9, rows: 12 });
  });
});

test.describe('LevelCatalog.loadLevel', () => {
  test('loads by index or by JSON and exposes the current board', () => {
    const c = catalogWith();
    expect(c.length).toBe(3);
    expect(c.loadLevel(1).id).toBe('level-02');
    expect(c.board.id).toBe('level-02');
    expect(c.loadLevel(load(3)).id).toBe('level-03');
  });

  test('a failed load throws a LevelError and keeps the previous board', () => {
    const c = catalogWith();
    const before = c.loadLevel(0);
    const bad = { ...load(2), shots: 0 };
    for (const target of [bad, 99, -1]) {
      expect(() => c.loadLevel(target)).toThrow(LevelError);
      expect(c.board).toBe(before);
    }
    const err = (() => { try { c.loadLevel(bad); } catch (e) { return e; } })();
    expect(err.errors.map((e) => e.field)).toContain('shots');
  });

  test('setLevels is atomic: one invalid level rejects the whole set', () => {
    const c = catalogWith();
    expect(() => c.setLevels([load(1), { ...load(2), launcher: { x: 0.01 } }])).toThrow(LevelError);
    expect(c.length).toBe(3);
  });
});
