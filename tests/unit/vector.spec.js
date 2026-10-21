import { test, expect } from '@playwright/test';
import { Vector2D } from '../../src/js/engine/Vector2D.js';

test.describe('Vector2D: unit direction, scalar speed', () => {
  test('constructor stores x and y and defaults to the origin', () => {
    const a = new Vector2D(3, -4);
    expect([a.x, a.y]).toEqual([3, -4]);
    const b = new Vector2D();
    expect([b.x, b.y]).toEqual([0, 0]);
  });

  test('setNormalized produces a unit vector and reports success', () => {
    const v = new Vector2D(1, 0);
    expect(v.setNormalized(3, 4)).toBe(true);
    expect(v.x).toBeCloseTo(0.6, 12);
    expect(v.y).toBeCloseTo(0.8, 12);
    expect(v.length()).toBeCloseTo(1, 9);
  });

  test('degenerate vector (length 1e-7) keeps the previous direction', () => {
    const v = new Vector2D(0.6, 0.8);
    expect(v.setNormalized(1e-7, 0)).toBe(false);
    expect([v.x, v.y]).toEqual([0.6, 0.8]);
    // triangulation: a length just above the threshold is accepted
    expect(v.setNormalized(2e-6, 0)).toBe(true);
    expect([v.x, v.y]).toEqual([1, 0]);
  });

  test('reflection off a horizontal surface: (0.6,-0.8) -> (0.6,0.8), length 1', () => {
    const v = new Vector2D(0.6, -0.8);
    expect(v.reflect(0, 1)).toBe(true);
    expect(v.x).toBeCloseTo(0.6, 12);
    expect(v.y).toBeCloseTo(0.8, 12);
    expect(Math.abs(v.length() - 1)).toBeLessThan(1e-9);
  });

  test('reflection off a vertical surface flips only x', () => {
    const v = new Vector2D(-0.6, 0.8);
    expect(v.reflect(1, 0)).toBe(true);
    expect(v.x).toBeCloseTo(0.6, 12);
    expect(v.y).toBeCloseTo(0.8, 12);
  });

  test('reflection on a diagonal normal swaps components', () => {
    const s = Math.SQRT1_2;
    const v = new Vector2D(1, 0);
    expect(v.reflect(-s, s)).toBe(true);
    expect(v.x).toBeCloseTo(0, 12);
    expect(v.y).toBeCloseTo(1, 12);
  });

  test('separating direction (D.N >= 0) is left unchanged', () => {
    const v = new Vector2D(0.6, 0.8);
    expect(v.reflect(0, 1)).toBe(false);
    expect([v.x, v.y]).toEqual([0.6, 0.8]);
    // grazing contact (D.N == 0) is also left unchanged
    const g = new Vector2D(1, 0);
    expect(g.reflect(0, 1)).toBe(false);
    expect([g.x, g.y]).toEqual([1, 0]);
  });

  test('repeated reflections never drift from unit length', () => {
    const v = new Vector2D(0.3, -0.953939201416946);
    v.setNormalized(v.x, v.y);
    for (let i = 0; i < 10000; i++) {
      v.reflect(0, i % 2 === 0 ? 1 : -1);
    }
    expect(Math.abs(v.length() - 1)).toBeLessThan(1e-9);
  });

  test('clampMinAbsY lifts a near-horizontal direction keeping signs and unit length', () => {
    const up = new Vector2D(1, -0.01);
    up.clampMinAbsY(0.05);
    expect(up.y).toBeCloseTo(-0.05, 12);
    expect(up.x).toBeGreaterThan(0);
    expect(Math.abs(up.length() - 1)).toBeLessThan(1e-9);

    const left = new Vector2D(-1, 0.02);
    left.clampMinAbsY(0.05);
    expect(left.y).toBeCloseTo(0.05, 12);
    expect(left.x).toBeLessThan(0);
    expect(Math.abs(left.length() - 1)).toBeLessThan(1e-9);
  });

  test('clampMinAbsY sends a perfectly horizontal direction downward', () => {
    const v = new Vector2D(-1, 0);
    v.clampMinAbsY(0.05);
    expect(v.y).toBeCloseTo(0.05, 12);
    expect(v.x).toBeLessThan(0);
  });

  test('clampMinAbsY leaves a steep direction untouched', () => {
    const v = new Vector2D(0.6, -0.8);
    v.clampMinAbsY(0.05);
    expect([v.x, v.y]).toEqual([0.6, -0.8]);
  });
});
