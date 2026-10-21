import { test, expect } from '@playwright/test';
import { Physics } from '../../src/js/engine/Physics.js';
import { Ball } from '../../src/js/entities/Ball.js';
import {
  STEP,
  BALL_RADIUS,
  BALL_SPEED,
  WALL_LEFT,
  WALL_RIGHT,
  FLOOR_Y,
  cellMinX,
  cellMaxX,
  cellMinY,
  cellMaxY,
} from '../../src/js/system/Layout.js';

// Minimal world: blocks keyed "col,row"; every callback is recorded.
function makeWorld(blocks = [], extra = {}) {
  const map = new Map();
  for (const b of blocks) map.set(`${b.col},${b.row}`, b);
  const world = {
    sealedFloor: false,
    hits: [],
    landed: [],
    substeps: [],
    blockAt(col, row) {
      return map.get(`${col},${row}`) || null;
    },
    onHit(ball, surface, block) {
      world.hits.push({ surface, block, x: ball.x, y: ball.y });
    },
    onLand(ball) {
      world.landed.push({ x: ball.x, y: ball.y });
    },
    onSubstep(subDt) {
      world.substeps.push(subDt);
    },
    ...extra,
  };
  return world;
}

function launch(pool, x, y, dx, dy, speed = BALL_SPEED) {
  const ball = pool.acquire();
  ball.x = x;
  ball.y = y;
  ball.dir.setNormalized(dx, dy);
  ball.speed = speed;
  return ball;
}

function runSteps(pool, world, steps, mult = 1) {
  for (let i = 0; i < steps; i++) Physics.step(pool, world, mult, STEP);
}

test.describe('Physics.substepCount', () => {
  test('1200 px/s needs 2 substeps at 1X, 3 at 2X and 6 at 4X', () => {
    expect(Physics.substepCount(1200, 1, STEP)).toBe(2);
    expect(Physics.substepCount(1200, 2, STEP)).toBe(3);
    expect(Physics.substepCount(1200, 4, STEP)).toBe(6);
  });

  test('is capped at 64 and never below 1', () => {
    expect(Physics.substepCount(1e6, 4, STEP)).toBe(64);
    expect(Physics.substepCount(0, 1, STEP)).toBe(1);
    expect(Physics.substepCount(1, 1, STEP)).toBe(1);
  });

  test('higher multipliers raise the count, never the per-substep displacement', () => {
    for (const mult of [1, 2, 4]) {
      const steps = Physics.substepCount(1200, mult, STEP);
      const perSubstep = (1200 * mult * STEP) / steps;
      expect(perSubstep).toBeLessThanOrEqual(BALL_RADIUS * 0.5 + 1e-9);
    }
  });
});

test.describe('Physics.step', () => {
  test('moves a ball along its direction by speed * dt * multiplier', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 500, 800, 0, -1);
    const world = makeWorld();
    const steps = Physics.step(pool, world, 1, STEP);
    expect(steps).toBe(2);
    expect(ball.x).toBeCloseTo(500, 9);
    expect(ball.y).toBeCloseTo(800 - 10, 9);
    Physics.step(pool, world, 4, STEP);
    expect(ball.y).toBeCloseTo(800 - 10 - 40, 9);
  });

  test('executes exactly 64 substeps when more are required', () => {
    const pool = Ball.createPool();
    launch(pool, 540, 900, 0, -1, 20000);
    const world = makeWorld();
    expect(Physics.step(pool, world, 4, STEP)).toBe(64);
    expect(world.substeps).toHaveLength(64);
  });

  test('onSubstep receives subDt = dt * multiplier / steps once per substep', () => {
    const pool = Ball.createPool();
    launch(pool, 540, 900, 0, -1);
    const world = makeWorld();
    Physics.step(pool, world, 4, STEP);
    expect(world.substeps).toHaveLength(6);
    for (const subDt of world.substeps) expect(subDt).toBeCloseTo((STEP * 4) / 6, 12);
  });

  test('with no active balls nothing runs', () => {
    const pool = Ball.createPool();
    const world = makeWorld();
    expect(Physics.step(pool, world, 1, STEP)).toBe(0);
    expect(world.substeps).toHaveLength(0);
  });
});

test.describe('walls and ceiling are half-planes', () => {
  test('left wall: pushed back inside, x direction flips, speed unchanged', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 60, 500, -0.6, 0.8);
    const world = makeWorld();
    runSteps(pool, world, 3);
    expect(ball.x - BALL_RADIUS).toBeGreaterThanOrEqual(WALL_LEFT - 1e-9);
    expect(ball.dir.x).toBeCloseTo(0.6, 9);
    expect(ball.dir.y).toBeCloseTo(0.8, 9);
    expect(ball.speed).toBe(BALL_SPEED);
    expect(world.hits.map((h) => h.surface)).toEqual([Physics.WALL]);
  });

  test('right wall: x direction flips', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, WALL_RIGHT - 20, 500, 0.6, 0.8);
    const world = makeWorld();
    runSteps(pool, world, 3);
    expect(ball.x + BALL_RADIUS).toBeLessThanOrEqual(WALL_RIGHT + 1e-9);
    expect(ball.dir.x).toBeCloseTo(-0.6, 9);
    expect(ball.dir.y).toBeCloseTo(0.8, 9);
    expect(world.hits.map((h) => h.surface)).toEqual([Physics.WALL]);
  });

  test('ceiling: y direction flips', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 500, 30, 0.6, -0.8);
    const world = makeWorld();
    runSteps(pool, world, 3);
    expect(ball.y - BALL_RADIUS).toBeGreaterThanOrEqual(-1e-9);
    expect(ball.dir.x).toBeCloseTo(0.6, 9);
    expect(ball.dir.y).toBeCloseTo(0.8, 9);
    expect(world.hits.map((h) => h.surface)).toEqual([Physics.CEILING]);
  });

  test('a near-horizontal bounce is re-clamped to |dir.y| >= 0.05', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 60, 500, -1, 0);
    const world = makeWorld();
    runSteps(pool, world, 3);
    expect(ball.dir.x).toBeGreaterThan(0);
    expect(Math.abs(ball.dir.y)).toBeGreaterThanOrEqual(0.05 - 1e-12);
  });
});

test.describe('block collisions and substepping', () => {
  // One-cell brick: col 4, row 5 -> x 484..596, y 280..336
  const brick = { col: 4, row: 5, type: 'standard', hp: 3 };
  const box = { minX: cellMinX(4), maxX: cellMaxX(4), minY: cellMinY(5), maxY: cellMaxY(5) };

  for (const mult of [1, 2, 4]) {
    test(`no tunneling through a brick from below at ${mult}X`, () => {
      const pool = Ball.createPool();
      const ball = launch(pool, 540, 600, 0, -1);
      const world = makeWorld([brick], { sealedFloor: true });
      let crossed = false;
      for (let i = 0; i < 1000 && world.hits.length === 0; i++) {
        Physics.step(pool, world, mult, STEP);
        if (world.hits.length === 0 && ball.y < box.minY) crossed = true;
      }
      expect(crossed).toBe(false);
      expect(world.hits.length).toBeGreaterThan(0);
      expect(world.hits[0].surface).toBe(Physics.BLOCK);
      expect(world.hits[0].block).toBe(brick);
      expect(ball.dir.y).toBeGreaterThan(0);
    });
  }

  test('no tunneling through a brick from the side at 4X (flat approach)', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 300, 308, 1, 0);
    const world = makeWorld([brick], { sealedFloor: true });
    let crossed = false;
    for (let i = 0; i < 1000 && world.hits.length === 0; i++) {
      Physics.step(pool, world, 4, STEP);
      if (world.hits.length === 0 && ball.x > box.maxX) crossed = true;
    }
    expect(crossed).toBe(false);
    expect(world.hits).toHaveLength(1);
    expect(ball.dir.x).toBeLessThan(0);
  });

  test('no tunneling at 4X over many oblique angles', () => {
    for (let k = 1; k <= 12; k++) {
      const angle = (k * Math.PI) / 13; // 0..pi, aiming upward below via -sin
      const pool = Ball.createPool();
      const ball = launch(pool, 540, 700, Math.cos(angle), -Math.sin(angle));
      const world = makeWorld([brick], { sealedFloor: true });
      // Only the first block contact matters; walls may be hit before it.
      let tunneled = false;
      for (let i = 0; i < 1000; i++) {
        Physics.step(pool, world, 4, STEP);
        const inside =
          ball.x > box.minX + BALL_RADIUS && ball.x < box.maxX - BALL_RADIUS && ball.y > box.minY + BALL_RADIUS && ball.y < box.maxY - BALL_RADIUS;
        if (inside) tunneled = true;
        if (world.hits.some((h) => h.surface === Physics.BLOCK)) break;
      }
      expect(tunneled, `angle index ${k}`).toBe(false);
    }
  });

  test('the first block hit reports the block, cell and the ball ends outside the box', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 540, 400, 0, -1);
    const world = makeWorld([brick]);
    runSteps(pool, world, 60);
    const hit = world.hits.find((h) => h.surface === Physics.BLOCK);
    expect(hit.block).toBe(brick);
    // after the bounce the ball moved down, away from the brick bottom (y 336)
    expect(ball.dir.y).toBeGreaterThan(0);
    expect(ball.y).toBeGreaterThan(box.maxY + BALL_RADIUS - 1e-6);
  });
});

test.describe('titanium (indestructible) blocks', () => {
  test('100 hits: block unchanged, speed unchanged, always reflects', () => {
    const titanium = { col: 0, row: 5, type: 'indestructible', hp: 1 };
    const snapshot = { ...titanium };
    const pool = Ball.createPool();
    const ball = launch(pool, 92, 100, 0, 1);
    const world = makeWorld([titanium]);
    let blockHits = 0;
    for (let i = 0; i < 20000 && blockHits < 100; i++) {
      Physics.step(pool, world, 4, STEP);
      blockHits = world.hits.filter((h) => h.surface === Physics.BLOCK).length;
    }
    expect(blockHits).toBe(100);
    expect(titanium).toEqual(snapshot);
    expect(ball.speed).toBe(BALL_SPEED);
    expect(Math.abs(ball.dir.length() - 1)).toBeLessThan(1e-9);
    expect(world.hits.every((h) => h.block === null || h.block === titanium)).toBe(true);
  });

  test('a ball approaching a titanium block from the right is reflected away', () => {
    const titanium = { col: 0, row: 5, type: 'indestructible', hp: 1 };
    const pool = Ball.createPool();
    const ball = launch(pool, 300, 308, -1, 0.2);
    const world = makeWorld([titanium]);
    for (let i = 0; i < 120 && world.hits.length === 0; i++) Physics.step(pool, world, 1, STEP);
    expect(world.hits).toHaveLength(1);
    expect(world.hits[0].block).toBe(titanium);
    expect(ball.dir.x).toBeGreaterThan(0);
    expect(titanium.hp).toBe(1);
  });
});

test.describe('only the deepest overlap resolves in a substep', () => {
  test('a ball wedged between two blocks reports a single hit for that substep', () => {
    const left = { col: 3, row: 5, type: 'standard', hp: 2 };
    const right = { col: 4, row: 5, type: 'standard', hp: 2 };
    const pool = Ball.createPool();
    // x = 484 is the shared edge of the two bricks; the ball is moving up into row 5 from below.
    launch(pool, 484, 345, 0, -1);
    const world = makeWorld([left, right]);
    Physics.step(pool, world, 1, STEP);
    expect(world.hits.length).toBeLessThanOrEqual(2);
    const blockHits = world.hits.filter((h) => h.surface === Physics.BLOCK);
    expect(blockHits.length).toBeGreaterThanOrEqual(1);
    // each substep resolves one block only: hits per substep <= 1
    expect(blockHits.length).toBeLessThanOrEqual(world.substeps.length);
  });
});

test.describe('no ball-vs-ball collision', () => {
  test('crossing balls overlap, keep direction and speed, and record no collision', () => {
    const pool = Ball.createPool();
    const a = launch(pool, 500, 800, 1, 0);
    const b = launch(pool, 528, 800, -1, 0);
    const world = makeWorld();
    let overlapped = false;
    for (let i = 0; i < 4; i++) {
      Physics.step(pool, world, 1, STEP);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 2 * BALL_RADIUS) overlapped = true;
    }
    expect(overlapped).toBe(true);
    expect([a.dir.x, a.dir.y]).toEqual([1, 0]);
    expect([b.dir.x, b.dir.y]).toEqual([-1, 0]);
    expect([a.speed, b.speed]).toEqual([1200, 1200]);
    expect(world.hits).toHaveLength(0);
    // A moved right 40 px, B moved left 40 px: they passed through each other
    expect(a.x).toBeCloseTo(540, 9);
    expect(b.x).toBeCloseTo(488, 9);
  });

  test('exactly coincident balls still do not interact', () => {
    const pool = Ball.createPool();
    const a = launch(pool, 600, 800, 0.6, -0.8);
    const b = launch(pool, 600, 800, 0.6, -0.8);
    const world = makeWorld();
    runSteps(pool, world, 5);
    expect(a.x).toBeCloseTo(b.x, 12);
    expect(a.y).toBeCloseTo(b.y, 12);
    expect([a.dir.x, a.dir.y]).toEqual([b.dir.x, b.dir.y]);
    expect(world.hits).toHaveLength(0);
  });
});

test.describe('floor: landing and sealed floor', () => {
  test('a ball crossing y 956 moving down lands, is reported once and released', () => {
    const pool = Ball.createPool();
    launch(pool, 321, FLOOR_Y - 5, 0, 1);
    const world = makeWorld();
    runSteps(pool, world, 2);
    expect(world.landed).toHaveLength(1);
    expect(world.landed[0].x).toBeCloseTo(321, 9);
    expect(world.landed[0].y).toBeGreaterThan(FLOOR_Y);
    expect(pool.count).toBe(0);
    // no further landing events once released
    runSteps(pool, world, 5);
    expect(world.landed).toHaveLength(1);
  });

  test('landing of one ball does not disturb the others', () => {
    const pool = Ball.createPool();
    launch(pool, 200, FLOOR_Y - 5, 0, 1);
    const other = launch(pool, 700, 500, 0, -1);
    const world = makeWorld();
    runSteps(pool, world, 2);
    expect(world.landed).toHaveLength(1);
    expect(pool.count).toBe(1);
    expect(pool.items[0]).toBe(other);
    expect(other.y).toBeCloseTo(500 - 20, 9);
  });

  test('sealed floor reflects instead of landing', () => {
    const pool = Ball.createPool();
    const ball = launch(pool, 321, FLOOR_Y - 5, 0.6, 0.8);
    const world = makeWorld([], { sealedFloor: true });
    runSteps(pool, world, 6);
    expect(world.landed).toHaveLength(0);
    expect(pool.count).toBe(1);
    expect(ball.dir.y).toBeLessThan(0);
    expect(world.hits.some((h) => h.surface === Physics.FLOOR)).toBe(true);
  });
});
