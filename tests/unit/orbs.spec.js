// Orb capture and volley growth: openspec volley-economy spec
import { test, expect } from '@playwright/test';
import { STEP } from '../../src/js/system/Layout.js';
import { boot, openField, fire, stepUntil, turnOver } from './helpers/session.js';

// Orbs stacked on the straight-up path of a launcher at x = 540 (column 4).
const onPath = (...values) => values.map((value, i) => ({ type: 'multiplier', col: 4, row: 8 - 2 * i, value }));
const orbCount = (s) => s.board.orbs.filter((o) => !o.captured).length;

test.describe('orb capture', () => {
  test('a ball passes through unchanged, the orb is removed and pending grows by V', () => {
    const s = openField(boot(), onPath(2));
    s.setVolley(1);
    fire(s);
    let pending = 0;
    for (let i = 0; i < 400 && pending === 0; i++) {
      s.step(STEP);
      pending = s.snapshot().pendingBonus;
    }
    const ball = s.snapshot().balls[0];
    expect(pending).toBe(2);
    expect([ball.dx, ball.dy]).toEqual([0, -1]); // no bounce
    expect(orbCount(s)).toBe(0);
    expect(s.board.entityAt(4, 8)).toBeNull();
  });

  // [name, volley, orb values, K added at Resolving]
  for (const [name, volley, values, k] of [
    ['several balls through one orb add its value once', 3, [2], 2],
    ['every orb is captured once per turn', 2, [1, 3], 4],
  ]) {
    test(name, () => {
      const s = openField(boot(), onPath(...values));
      s.setVolley(volley);
      fire(s);
      stepUntil(s, turnOver);
      expect(s.snapshot().volley.size).toBe(volley + k);
    });
  }
});

test.describe('volley growth', () => {
  // [name, volley before, orb values, volley after]
  for (const [name, before, values, after] of [
    ['K is added at Resolving', 8, [2, 2], 12],
    ['no orbs leaves the volley unchanged', 3, [], 3],
    ['growth is capped at 50', 48, [2, 3], 50],
  ]) {
    test(name, () => {
      const s = openField(boot(), onPath(...values));
      s.setVolley(before);
      fire(s);
      expect(s.snapshot().volley.size).toBe(before); // not applied mid-turn
      stepUntil(s, turnOver);
      const snap = s.snapshot();
      expect(snap.volley.size).toBe(after);
      expect(snap.pendingBonus).toBe(0);
    });
  }

  test('RESTART restores startBalls and the removed orbs', () => {
    const s = openField(boot(), onPath(2));
    fire(s);
    stepUntil(s, turnOver);
    expect(s.snapshot().volley.size).toBe(5);
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().volley.size).toBe(3);
    expect(orbCount(s)).toBe(1);
  });
});
