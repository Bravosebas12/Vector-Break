// Block damage, destruction and scoring: openspec volley-economy spec (OI-1: 1 damage per hit)
import { test, expect } from '@playwright/test';
import { boot, openField, fire, stepUntil, turnOver, LEVELS } from './helpers/session.js';

const at = (type, hp) => [{ type, col: 4, row: 8, hp }]; // on the straight-up path
const hpOf = (s) => s.snapshot().blocks.find((b) => b.col === 4 && b.row === 8)?.hp;
const play = (type, hp, volley, opts = {}) => {
  const s = openField(boot(opts), at(type, hp));
  s.setVolley(volley);
  fire(s);
  stepUntil(s, turnOver);
  return s;
};

test.describe('block damage', () => {
  // [type, hp, balls, hp left]
  for (const [type, hp, volley, left] of [
    ['standard', 5, 3, 2],
    ['reinforced', 20, 4, 16],
    ['core', 100, 3, 97],
    ['indestructible', 0, 3, 0],
  ]) {
    test(`${type} hp ${hp} after ${volley} hits is ${left}`, () => {
      const s = play(type, hp, volley);
      expect(hpOf(s)).toBe(left);
      expect(s.snapshot().damage).toBe(type === 'indestructible' ? 0 : volley);
    });
  }

  test('destroyed at 0: the cell is freed and later balls pass through', () => {
    const s = play('standard', 1, 2);
    const snap = s.snapshot();
    expect(hpOf(s)).toBeUndefined();
    expect(s.board.blockAt(4, 8)).toBeNull();
    expect(snap.damage).toBe(1); // the 2nd ball hit nothing
  });

  test('damage is kept when the volley cap releases the balls', () => {
    const s = play('standard', 9, 3, { sealedFloor: true, volleyCapS: 1 });
    expect(s.snapshot().damage).toBeGreaterThan(0);
  });
});

test.describe('result', () => {
  // [name, level shots, volley, expected stars, expected score = damage + 100 per unused shot]
  for (const [name, shots, volley, stars, score] of [
    ['first shot -> 3 stars, 100 per unused shot', 6, 1, 3, 1 + 500],
  ]) {
    test(name, () => {
      const s = boot();
      s.loadLevel({ ...LEVELS[0], shots });
      openField(s, at('standard', 1)).setVolley(volley);
      s.board.cores[0].hp = 0;
      fire(s);
      stepUntil(s, turnOver);
      expect(s.snapshot().state).toBe('Victory');
      expect(s.snapshot().result).toMatchObject({ stars, score });
      expect(s.snapshot().score).toBe(score);
    });
  }

  test('2 stars when turns used <= floor(shots / 2), 1 otherwise', () => {
    const stars = (shots, turns) => {
      const s = boot();
      s.loadLevel({ ...LEVELS[0], shots });
      openField(s).setVolley(1);
      for (let i = 1; i <= turns; i++) {
        if (i === turns) s.board.cores[0].hp = 0;
        fire(s);
        stepUntil(s, turnOver);
      }
      return s.snapshot().result.stars;
    };
    expect([stars(10, 2), stars(10, 5), stars(10, 6), stars(5, 3)]).toEqual([2, 2, 1, 1]);
  });
});
