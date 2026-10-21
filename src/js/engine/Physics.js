// Rules: .claude/skills/physics-collision-engine/SKILL.md
// Fixed-step ball physics with global substepping. No ball-vs-ball test exists:
// balls interact only with walls, ceiling, blocks and the floor (design P5).
// The hot path never allocates: scratch objects below are reused.
//
// World contract (duck-typed, all callbacks except blockAt are optional):
//   world.blockAt(col, row) -> block | null    block = { type, hp }; null when empty/destroyed
//   world.sealedFloor                          true: floor y = FLOOR_Y reflects (stress mode)
//   world.onSubstep(subDt)                     called at the start of every substep
//   world.onHit(ball, surface, block, col, row) a reflection happened (block is null for non-blocks)
//   world.onLand(ball)                         ball centre crossed FLOOR_Y moving down
// Damage rules (1 HP per hit, titanium immunity) belong to the session, which
// reacts to onHit; Physics only reflects.
import { Collision } from './Collision.js';
import {
  STEP,
  BALL_RADIUS,
  MIN_DIR_Y,
  MAX_SUBSTEPS,
  WALL_LEFT,
  WALL_RIGHT,
  CEILING_Y,
  FLOOR_Y,
  COLS,
  ROWS,
  CELL_W,
  CELL_H,
  GRID_X,
  GRID_H,
  cellMinX,
  cellMaxX,
  cellMinY,
  cellMaxY,
} from '../system/Layout.js';

const MAX_STEP_DISTANCE = BALL_RADIUS * 0.5;

// A ball (diameter 28) overlaps at most 2 columns x 2 rows of a 112 x 56 grid.
const MAX_CANDIDATES = 4;
const boxes = [];
const candidateCols = new Int8Array(MAX_CANDIDATES);
const candidateRows = new Int8Array(MAX_CANDIDATES);
const candidateBlocks = new Array(MAX_CANDIDATES).fill(null);
for (let i = 0; i < MAX_CANDIDATES; i++) boxes.push({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
const hit = { nx: 0, ny: 0, pen: 0 };

export class Physics {
  // steps = min(64, ceil(speed * mult * dt / (r * 0.5))); at least 1.
  static substepCount(speed, mult, dt) {
    const steps = Math.ceil((speed * mult * dt) / MAX_STEP_DISTANCE);
    return steps < 1 ? 1 : steps > MAX_SUBSTEPS ? MAX_SUBSTEPS : steps;
  }

  // Advances every active ball of `balls` (an ObjectPool) by one fixed step.
  // Balls that land are reported through world.onLand and released at the end of
  // the step. Returns the number of substeps executed (0 when no ball is active).
  static step(balls, world, mult, dt = STEP) {
    let maxSpeed = 0;
    for (let i = 0; i < balls.count; i++) {
      const speed = balls.items[i].speed;
      if (speed > maxSpeed) maxSpeed = speed;
    }
    if (maxSpeed === 0) return 0;

    const steps = Physics.substepCount(maxSpeed, mult, dt);
    const subDt = (dt * mult) / steps;
    for (let s = 0; s < steps; s++) {
      if (world.onSubstep) world.onSubstep(subDt);
      // `balls.count` is read live: onSubstep may emit new balls.
      for (let i = 0; i < balls.count; i++) {
        const ball = balls.items[i];
        if (!ball.landed) Physics.substepBall(ball, world, subDt);
      }
    }

    for (let i = 0; i < balls.count; ) {
      const ball = balls.items[i];
      if (ball.landed) balls.release(ball);
      else i++;
    }
    return steps;
  }

  static substepBall(ball, world, subDt) {
    const distance = ball.speed * subDt;
    ball.x += ball.dir.x * distance;
    ball.y += ball.dir.y * distance;

    Physics.collideBounds(ball, world);
    Physics.collideBlocks(ball, world);
    Physics.collideFloor(ball, world);
  }

  // Walls and ceiling are half-planes: push back inside, reflect only if approaching.
  static collideBounds(ball, world) {
    const r = BALL_RADIUS;
    if (ball.x - r < WALL_LEFT) {
      hit.nx = 1;
      hit.ny = 0;
      hit.pen = WALL_LEFT - (ball.x - r);
      Physics.report(ball, world, Physics.WALL, null, -1, -1);
    } else if (ball.x + r > WALL_RIGHT) {
      hit.nx = -1;
      hit.ny = 0;
      hit.pen = ball.x + r - WALL_RIGHT;
      Physics.report(ball, world, Physics.WALL, null, -1, -1);
    }
    if (ball.y - r < CEILING_Y) {
      hit.nx = 0;
      hit.ny = 1;
      hit.pen = CEILING_Y - (ball.y - r);
      Physics.report(ball, world, Physics.CEILING, null, -1, -1);
    }
  }

  static collideBlocks(ball, world) {
    const r = BALL_RADIUS;
    if (ball.y - r >= GRID_H) return;

    // Direct cell lookup (D4): cells touched by the ball's bounding box.
    let c0 = Math.floor((ball.x - r - GRID_X) / CELL_W);
    let c1 = Math.floor((ball.x + r - GRID_X) / CELL_W);
    let r0 = Math.floor((ball.y - r) / CELL_H);
    let r1 = Math.floor((ball.y + r) / CELL_H);
    if (c0 < 0) c0 = 0;
    if (c1 > COLS - 1) c1 = COLS - 1;
    if (r0 < 0) r0 = 0;
    if (r1 > ROWS - 1) r1 = ROWS - 1;

    let count = 0;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const block = world.blockAt(col, row);
        if (block === null) continue;
        const box = boxes[count];
        box.minX = cellMinX(col);
        box.maxX = cellMaxX(col);
        box.minY = cellMinY(row);
        box.maxY = cellMaxY(row);
        candidateCols[count] = col;
        candidateRows[count] = row;
        candidateBlocks[count] = block;
        count++;
      }
    }
    if (count === 0) return;

    // Several overlaps in one substep: resolve the deepest only.
    const index = Collision.deepest(ball.x, ball.y, r, boxes, count, hit);
    if (index < 0) return;
    Physics.report(ball, world, Physics.BLOCK, candidateBlocks[index], candidateCols[index], candidateRows[index]);
  }

  static collideFloor(ball, world) {
    if (ball.y <= FLOOR_Y) return;
    if (world.sealedFloor) {
      hit.nx = 0;
      hit.ny = -1;
      hit.pen = ball.y - FLOOR_Y;
      Physics.report(ball, world, Physics.FLOOR, null, -1, -1);
    } else if (ball.dir.y > 0) {
      ball.landed = true;
      if (world.onLand) world.onLand(ball);
    }
  }

  // Applies the pending `hit` to the ball and notifies the world when it reflected.
  static report(ball, world, surface, block, col, row) {
    if (Collision.resolve(ball, hit) && world.onHit) world.onHit(ball, surface, block, col, row);
  }
}

Physics.WALL = 1;
Physics.CEILING = 2;
Physics.BLOCK = 3;
Physics.FLOOR = 4;
