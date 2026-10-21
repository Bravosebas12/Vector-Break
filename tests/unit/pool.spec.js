import { test, expect } from '@playwright/test';
import { ObjectPool } from '../../src/js/system/ObjectPool.js';
import { Ball } from '../../src/js/entities/Ball.js';
import { MAX_VOLLEY } from '../../src/js/system/Layout.js';

class Item {
  constructor() {
    this.active = false;
    this.value = 0;
    this.resets = 0;
  }
  reset() {
    this.value = 0;
    this.resets++;
  }
}

test.describe('ObjectPool', () => {
  test('preallocates `size` objects through the factory and starts empty', () => {
    let made = 0;
    const pool = new ObjectPool(() => {
      made++;
      return new Item();
    }, 3);
    expect(made).toBe(3);
    expect(pool.size).toBe(3);
    expect(pool.created).toBe(3);
    expect(pool.count).toBe(0);
  });

  test('acquire returns active objects until the pool is empty, then null', () => {
    const pool = new ObjectPool(() => new Item(), 3);
    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    expect([a.active, b.active, c.active]).toEqual([true, true, true]);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(pool.count).toBe(3);
    expect(pool.acquire()).toBeNull();
    expect(pool.count).toBe(3);
  });

  test('acquire/release: released object is reused, no new object is created', () => {
    const pool = new ObjectPool(() => new Item(), 3);
    const a = pool.acquire();
    pool.acquire();
    pool.acquire();
    pool.release(a);
    expect(a.active).toBe(false);
    expect(pool.count).toBe(2);
    const again = pool.acquire();
    expect(again).toBe(a);
    expect(again.active).toBe(true);
    expect(pool.created).toBe(3);
    expect(pool.size).toBe(3);
  });

  test('release calls reset() and clears state', () => {
    const pool = new ObjectPool(() => new Item(), 2);
    const a = pool.acquire();
    a.value = 99;
    pool.release(a);
    expect(a.value).toBe(0);
    expect(a.resets).toBe(1);
  });

  test('release is swap-remove: the last active object takes the freed slot', () => {
    const pool = new ObjectPool(() => new Item(), 4);
    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    expect([pool.items[0], pool.items[1], pool.items[2]]).toEqual([a, b, c]);
    pool.release(a);
    expect(pool.count).toBe(2);
    expect(pool.items[0]).toBe(c);
    expect(pool.items[1]).toBe(b);
    // releasing the last active object just shrinks the active range
    pool.release(b);
    expect(pool.count).toBe(1);
    expect(pool.items[0]).toBe(c);
  });

  test('releasing an inactive object is a no-op', () => {
    const pool = new ObjectPool(() => new Item(), 2);
    const a = pool.acquire();
    pool.release(a);
    expect(pool.release(a)).toBe(false);
    expect(pool.count).toBe(0);
    expect(a.resets).toBe(1);
  });

  test('no growth under repeated exhaustion', () => {
    const pool = new ObjectPool(() => new Item(), 5);
    for (let round = 0; round < 3; round++) {
      let got = 0;
      while (pool.acquire() !== null) got++;
      expect(got).toBe(5);
      while (pool.count > 0) pool.release(pool.items[0]);
    }
    expect(pool.created).toBe(5);
    expect(pool.items).toHaveLength(5);
  });
});

test.describe('Ball pool', () => {
  test('holds 50 preallocated balls (v1 volley cap)', () => {
    const pool = Ball.createPool();
    expect(MAX_VOLLEY).toBe(50);
    expect(pool.size).toBe(50);
    expect(pool.created).toBe(50);
    expect(pool.items.every((b) => b instanceof Ball)).toBe(true);
  });

  test('ball pool exhausted: 51st request fails without allocating', () => {
    const pool = Ball.createPool();
    for (let i = 0; i < 50; i++) expect(pool.acquire()).not.toBeNull();
    expect(pool.count).toBe(50);
    expect(pool.acquire()).toBeNull();
    expect(pool.created).toBe(50);
  });

  test('a released ball is reset: position, direction, speed and flags cleared', () => {
    const pool = Ball.createPool(2);
    const ball = pool.acquire();
    expect(ball.active).toBe(true);
    ball.x = 300;
    ball.y = 400;
    ball.dir.set(1, 0);
    ball.speed = 1200;
    ball.landed = true;
    pool.release(ball);
    expect([ball.x, ball.y, ball.speed, ball.landed, ball.active]).toEqual([0, 0, 0, false, false]);
    expect([ball.dir.x, ball.dir.y]).toEqual([0, -1]);
  });
});
