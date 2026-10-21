import { test, expect } from '@playwright/test';
import * as Layout from '../../src/js/system/Layout.js';

test.describe('Layout (board B1)', () => {
  test('board and grid constants', () => {
    expect([Layout.BOARD_W, Layout.BOARD_H]).toEqual([1080, 1000]);
    expect([Layout.COLS, Layout.ROWS]).toEqual([9, 12]);
    expect([Layout.CELL_W, Layout.CELL_H]).toEqual([112, 56]);
    expect(Layout.GRID_X).toBe(36);
    expect(Layout.GRID_X + Layout.COLS * Layout.CELL_W).toBe(1044);
    expect(Layout.ROWS * Layout.CELL_H).toBe(672);
  });

  test('walls coincide with the grid edges, ceiling at y 0, floor at 956', () => {
    expect(Layout.WALL_LEFT).toBe(36);
    expect(Layout.WALL_RIGHT).toBe(1044);
    expect(Layout.CEILING_Y).toBe(0);
    expect(Layout.FLOOR_Y).toBe(956);
  });

  test('cell bounds: cell (c, r) spans x 36+112c..148+112c, y 56r..56r+56', () => {
    expect([Layout.cellMinX(0), Layout.cellMaxX(0)]).toEqual([36, 148]);
    expect([Layout.cellMinY(0), Layout.cellMaxY(0)]).toEqual([0, 56]);
    expect([Layout.cellMinX(8), Layout.cellMaxX(8)]).toEqual([932, 1044]);
    expect([Layout.cellMinY(11), Layout.cellMaxY(11)]).toEqual([616, 672]);
    expect([Layout.cellMinX(4), Layout.cellMinY(5)]).toEqual([484, 280]);
  });

  test('ball, volley and timing constants', () => {
    expect(Layout.BALL_RADIUS).toBe(14);
    expect(Layout.BALL_SPEED).toBe(1200);
    expect(Layout.MAX_VOLLEY).toBe(50);
    expect(Layout.STEP).toBeCloseTo(1 / 120, 15);
    expect(Layout.MIN_DIR_Y).toBe(0.05);
    expect(Layout.MAX_SUBSTEPS).toBe(64);
    expect(Layout.EMIT_INTERVAL).toBeCloseTo(1 / 12, 15);
  });

  test('launcher range is the walls +- the radius, in board pixels and normalized', () => {
    expect([Layout.LAUNCHER_MIN_X, Layout.LAUNCHER_MAX_X]).toEqual([50, 1030]);
    expect(Layout.LAUNCHER_Y).toBe(956);
    expect(Layout.isLauncherXValid(50 / 1080)).toBe(true);
    expect(Layout.isLauncherXValid(1030 / 1080)).toBe(true);
    expect(Layout.isLauncherXValid(0.5)).toBe(true);
    expect(Layout.isLauncherXValid(49 / 1080)).toBe(false);
    expect(Layout.isLauncherXValid(1031 / 1080)).toBe(false);
    expect(Layout.isLauncherXValid(Number.NaN)).toBe(false);
  });

  test('clampLauncherX clamps a landing x to [50, 1030]', () => {
    expect(Layout.clampLauncherX(10)).toBe(50);
    expect(Layout.clampLauncherX(540)).toBe(540);
    expect(Layout.clampLauncherX(1075)).toBe(1030);
  });
});
