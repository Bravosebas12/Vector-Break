import { test, expect } from '@playwright/test';
import { Collision } from '../../src/js/engine/Collision.js';
import { Vector2D } from '../../src/js/engine/Vector2D.js';

// Box of the Physics spec: x 36..148, y 0..56. Ball radius 14.
const BOX = { minX: 36, minY: 0, maxX: 148, maxY: 56 };
const R = 14;

function hit(cx, cy, box = BOX) {
  const out = { nx: 0, ny: 0, pen: 0 };
  const collided = Collision.circleAabb(cx, cy, R, box.minX, box.minY, box.maxX, box.maxY, out);
  return { collided, out };
}

test.describe('Collision.circleAabb', () => {
  test('edge hit: normal (0,1), penetration 2', () => {
    const { collided, out } = hit(92, 68);
    expect(collided).toBe(true);
    expect(out.nx).toBe(0);
    expect(out.ny).toBe(1);
    expect(out.pen).toBeCloseTo(2, 12);
  });

  test('edge hit on each side gives the matching axis normal', () => {
    const left = hit(26, 28);
    expect([left.collided, left.out.nx, left.out.ny]).toEqual([true, -1, 0]);
    expect(left.out.pen).toBeCloseTo(4, 12);
    const right = hit(158, 28);
    expect([right.collided, right.out.nx, right.out.ny]).toEqual([true, 1, 0]);
    const top = hit(92, -10);
    expect([top.collided, top.out.nx, top.out.ny]).toEqual([true, 0, -1]);
  });

  test('corner hit: normal is (8,8)/|(8,8)|, not an axis', () => {
    const { collided, out } = hit(156, 64);
    const s = Math.SQRT1_2;
    expect(collided).toBe(true);
    expect(out.nx).toBeCloseTo(s, 12);
    expect(out.ny).toBeCloseTo(s, 12);
    expect(out.pen).toBeCloseTo(14 - Math.hypot(8, 8), 12);
  });

  test('corner hit on the opposite corner points away from that corner', () => {
    const { collided, out } = hit(30, -6);
    expect(collided).toBe(true);
    expect(out.nx).toBeCloseTo(-Math.SQRT1_2, 12);
    expect(out.ny).toBeCloseTo(-Math.SQRT1_2, 12);
  });

  test('deep penetration (centre inside) pushes along the minimum-overlap axis', () => {
    const { collided, out } = hit(100, 20);
    expect(collided).toBe(true);
    expect([out.nx, out.ny]).toEqual([0, -1]);
    // distance from the centre to the top face (20) plus the radius
    expect(out.pen).toBeCloseTo(34, 12);
  });

  test('deep penetration picks a different axis when the nearest face differs', () => {
    const right = hit(140, 30);
    expect([right.out.nx, right.out.ny]).toEqual([1, 0]);
    expect(right.out.pen).toBeCloseTo(8 + 14, 12);
    const bottom = hit(92, 50);
    expect([bottom.out.nx, bottom.out.ny]).toEqual([0, 1]);
  });

  test('no collision when the distance equals or exceeds the radius', () => {
    expect(hit(92, 70).collided).toBe(false);
    expect(hit(92, 71).collided).toBe(false);
    expect(hit(156, 70).collided).toBe(false);
  });
});

test.describe('Collision.deepest', () => {
  const boxes = [
    { minX: 36, minY: 0, maxX: 148, maxY: 56 },
    { minX: 148, minY: 0, maxX: 260, maxY: 56 },
    { minX: 36, minY: 56, maxX: 148, maxY: 112 },
  ];

  test('several overlaps resolve only the deepest one', () => {
    // Ball at (140, 62): 6 px from the top box face on y, 8 px inside box 0 on x, etc.
    const out = { nx: 0, ny: 0, pen: 0 };
    const index = Collision.deepest(150, 66, R, boxes, 3, out);
    // box0: closest (148,56) d=(2,10) dist 10.2 pen 3.8; box1: closest (150,56) d=(0,10) pen 4;
    // box2: closest (148,66) d=(2,0) pen 12
    expect(index).toBe(2);
    expect(out.pen).toBeCloseTo(12, 12);
    expect([out.nx, out.ny]).toEqual([1, 0]);
  });

  test('picks another box when it is the deepest and returns -1 when none overlap', () => {
    const out = { nx: 0, ny: 0, pen: 0 };
    expect(Collision.deepest(200, 60, R, boxes, 3, out)).toBe(1);
    expect([out.nx, out.ny]).toEqual([0, 1]);
    expect(out.pen).toBeCloseTo(10, 12);
    expect(Collision.deepest(500, 500, R, boxes, 3, out)).toBe(-1);
  });

  test('respects the count argument', () => {
    const out = { nx: 0, ny: 0, pen: 0 };
    expect(Collision.deepest(150, 66, R, boxes, 2, out)).toBe(1);
  });
});

test.describe('Collision.resolve', () => {
  function ball(x, y, dx, dy) {
    return { x, y, dir: new Vector2D(dx, dy) };
  }

  test('approaching ball is pushed out and reflected, direction stays unit', () => {
    const b = ball(92, 68, 0.6, -0.8);
    const out = { nx: 0, ny: 1, pen: 2 };
    const reflected = Collision.resolve(b, out);
    expect(reflected).toBe(true);
    expect(b.y).toBeCloseTo(70, 12);
    expect(b.dir.x).toBeCloseTo(0.6, 12);
    expect(b.dir.y).toBeCloseTo(0.8, 12);
    expect(Math.abs(b.dir.length() - 1)).toBeLessThan(1e-9);
  });

  test('separating ball (D.N >= 0) is pushed out but its direction is unchanged', () => {
    const b = ball(92, 68, 0.6, 0.8);
    const out = { nx: 0, ny: 1, pen: 2 };
    expect(Collision.resolve(b, out)).toBe(false);
    expect(b.y).toBeCloseTo(70, 12);
    expect([b.dir.x, b.dir.y]).toEqual([0.6, 0.8]);
  });

  test('re-clamps |dir.y| >= 0.05 after a reflection (sign kept, downward if 0)', () => {
    // moving almost horizontally into a vertical face: reflection keeps y tiny
    const b = ball(26, 28, 0.9999, -0.01);
    b.dir.setNormalized(0.9999, -0.01);
    const out = { nx: -1, ny: 0, pen: 4 };
    expect(Collision.resolve(b, out)).toBe(true);
    expect(b.dir.x).toBeLessThan(0);
    expect(b.dir.y).toBeCloseTo(-0.05, 12);

    const flat = ball(26, 28, 1, 0);
    expect(Collision.resolve(flat, { nx: -1, ny: 0, pen: 4 })).toBe(true);
    expect(flat.dir.y).toBeCloseTo(0.05, 12);
    expect(flat.dir.x).toBeLessThan(0);
  });
});
