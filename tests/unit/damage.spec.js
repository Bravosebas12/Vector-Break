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
  // [name, level shots, volley, expected stars, expected score = damage + 100 per unused shot]. The core starts
  // destroyed, so the level is won on the first step, before the ball reaches the block (D-13.1): damage 0.
  for (const [name, shots, volley, stars, score] of [
    ['first shot -> 3 stars, 100 per unused shot', 6, 1, 3, 0 + 500],
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

test.describe('overkill', () => {
  test('two balls hitting an HP 1 block in the same substep destroy it once', () => {
    const s = openField(boot(), at('standard', 1));
    s.setVolley(1);
    fire(s); // first ball leaves; the pool is then set up by hand so both hit in one substep
    const block = s.board.blockAt(4, 8);
    const [a] = s.balls.items;
    const b = s.balls.acquire();
    for (const ball of [a, b]) {
      ball.x = 540;
      ball.y = 517; // top edge 503 overlaps the block bottom (504)
      ball.dir.set(0, -1);
      ball.speed = 1200;
      ball.landed = false;
    }
    let destroyed = 0;
    const count = (type) => type === 'DESTROY' && destroyed++;
    stepUntil(s, (snap) => {
      s.drainEvents(count);
      return turnOver(snap);
    });
    s.drainEvents(count);
    expect(destroyed).toBe(1);
    expect(block.hp).toBe(0);
    expect(s.snapshot().damage).toBe(1);
    expect(hpOf(s)).toBeUndefined();
    expect(s.board.blocks).not.toContain(block);
  });
});
