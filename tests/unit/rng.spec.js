import { test, expect } from '@playwright/test';
import { Rng } from '../../src/js/system/Rng.js';

function take(rng, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(rng.next());
  return out;
}

test.describe('Rng (seeded, deterministic)', () => {
  test('same seed gives the same sequence', () => {
    const a = take(new Rng(42), 20);
    const b = take(new Rng(42), 20);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(20);
  });

  test('different seeds give different sequences', () => {
    expect(take(new Rng(42), 5)).not.toEqual(take(new Rng(43), 5));
  });

  test('values are in [0, 1)', () => {
    const values = take(new Rng(7), 2000);
    expect(values).toHaveLength(2000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  test('setSeed restarts the sequence (replay equality)', () => {
    const rng = new Rng(1);
    rng.setSeed(42);
    const first = take(rng, 10);
    rng.setSeed(42);
    expect(take(rng, 10)).toEqual(first);
  });

  test('nextInt stays in [0, n) and covers the range', () => {
    const rng = new Rng(99);
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });
});
