// Rules: .claude/skills/physics-collision-engine/SKILL.md
// Aim preview and reachability tracing. A ball of radius r moving along a ray is a point moving
// against the obstacles grown by r: walls and ceiling shift inward, a block becomes a rounded
// rectangle (slab test on the rect grown by r, then a circle of radius r on each corner). This is
// exactly the Minkowski geometry the simulation resolves with Collision.circleAabb (design D5).
import { Vector2D } from '../engine/Vector2D.js';
import { isTrapWallType } from '../entities/Block.js';
import {
  BALL_RADIUS,
  CEILING_Y,
  FLOOR_Y,
  MIN_DIR_Y,
  WALL_LEFT,
  WALL_RIGHT,
  cellMaxX,
  cellMaxY,
  cellMinX,
  cellMinY,
} from './Layout.js';

export const REFLECT_LENGTH = 180; // px of the single post-bounce preview segment

export const SWEEP_ANGLES = 3600;

const R = BALL_RADIUS;

export class Raycaster {
  // Unit aim direction from `origin` towards `cursor`: always upward, |dir.y| >= MIN_DIR_Y, the
  // horizontal sign kept. Returns null when the cursor sits on the origin.
  static aimDirection(origin, cursor) {
    const dir = new Vector2D();
    if (!dir.setNormalized(cursor.x - origin.x, cursor.y - origin.y)) return null;
    // Upward only: a near-horizontal or downward cursor lands on the clamp, keeping the x sign.
    if (dir.y > -MIN_DIR_Y) dir.set((dir.x < 0 ? -1 : 1) * Math.sqrt(1 - MIN_DIR_Y * MIN_DIR_Y), -MIN_DIR_Y);
    return dir;
  }

  // First contact of the ball centre with a wall, the ceiling or any non-orb block, then one
  // reflected segment of fixed length (never a second bounce). `maxBounces` is capped at 1.
  static cast(origin, dir, board, maxBounces = 1) {
    const contact = Raycaster.trace(origin.x, origin.y, dir.x, dir.y, board.blocks, false);
    if (contact === null || maxBounces < 1) return { contact, reflected: null };
    const out = new Vector2D(dir.x, dir.y);
    out.reflect(contact.nx, contact.ny);
    out.clampMinAbsY(MIN_DIR_Y);
    return {
      contact,
      reflected: {
        dx: out.x,
        dy: out.y,
        x1: contact.x + out.x * REFLECT_LENGTH,
        y1: contact.y + out.y * REFLECT_LENGTH,
      },
    };
  }

  // Nearest contact along (ox,oy) + t*(dx,dy) (unit dir), t >= 0, or null.
  // Result: { x, y, t, nx, ny, surface: wall-left|wall-right|ceiling|block|floor, blockType }.
  static trace(ox, oy, dx, dy, blocks, withFloor) {
    let best = null;
    const take = (t, nx, ny, surface, blockType) => {
      if (t < 0 || (best !== null && t >= best.t)) return;
      best = { x: ox + dx * t, y: oy + dy * t, t, nx, ny, surface, blockType };
    };
    if (dx < 0) take((WALL_LEFT + R - ox) / dx, 1, 0, 'wall-left', null);
    if (dx > 0) take((WALL_RIGHT - R - ox) / dx, -1, 0, 'wall-right', null);
    if (dy < 0) take((CEILING_Y + R - oy) / dy, 0, 1, 'ceiling', null);
    if (withFloor && dy > 0) take((FLOOR_Y - oy) / dy, 0, -1, 'floor', null);
    for (const b of blocks) {
      const hit = blockHit(ox, oy, dx, dy, b);
      if (hit !== null) take(hit.t, hit.nx, hit.ny, 'block', b.type);
    }
    return best;
  }

  // Reachability from `launcher`: 3600 angles in [asin 0.05, pi - asin 0.05], at most one
  // reflection. `target` is a list of {col,row}. A path reaches it when the ball centre enters a
  // target cell, or touches a target block, before any obstacle. The post-bounce segment is
  // unbounded: it runs to the next surface or the floor. `static` geometry = blockers only
  // (what the ball cannot remove); `preview` = every non-orb block.
  // Returns [{ angle, bounces, surfaces: [{ surface, blockType }] }] for the reaching angles.
  static sweep(board, launcher, target, geometry = 'preview') {
    const blocks = geometry === 'static' ? board.blocks.filter((b) => isTrapWallType(b.type)) : board.blocks;
    const lo = Math.asin(MIN_DIR_Y);
    const span = Math.PI - 2 * lo;
    const found = [];
    for (let i = 0; i < SWEEP_ANGLES; i++) {
      const angle = lo + (span * i) / (SWEEP_ANGLES - 1);
      const path = tracePath(blocks, launcher, angle, target);
      if (path !== null) found.push({ angle, ...path });
    }
    return found;
  }
}

// Walks one reflection. Returns { bounces, surfaces } when a target is reached, else null.
function tracePath(blocks, launcher, angle, target) {
  const dir = new Vector2D(Math.cos(angle), -Math.sin(angle));
  let x = launcher.x;
  let y = launcher.y;
  const surfaces = [];
  for (let bounces = 0; bounces <= 1; bounces++) {
    const hit = Raycaster.trace(x, y, dir.x, dir.y, blocks, bounces === 1);
    if (target.some((c) => segmentEntersCell(x, y, dir.x, dir.y, hit === null ? Infinity : hit.t, c))) {
      return { bounces, surfaces };
    }
    if (hit === null) return null;
    surfaces.push({ surface: hit.surface, blockType: hit.blockType });
    if (hit.surface === 'block' && target.some((c) => touchesCell(hit, c))) return { bounces, surfaces };
    if (hit.surface === 'floor' || bounces === 1) return null;
    dir.reflect(hit.nx, hit.ny);
    dir.clampMinAbsY(MIN_DIR_Y);
    x = hit.x;
    y = hit.y;
  }
  return null;
}

// A contact point lies on the rounded rectangle of a cell when its distance to the cell rect is r.
function touchesCell(hit, cell) {
  const px = Math.min(Math.max(hit.x, cellMinX(cell.col)), cellMaxX(cell.col));
  const py = Math.min(Math.max(hit.y, cellMinY(cell.row)), cellMaxY(cell.row));
  return Math.abs(Math.hypot(hit.x - px, hit.y - py) - R) < 1e-6;
}

// Does the centre path (0 <= t <= tMax) pass through the cell rectangle?
function segmentEntersCell(ox, oy, dx, dy, tMax, cell) {
  const slab = (o, d, lo, hi) => {
    if (d === 0) return o >= lo && o <= hi ? [-Infinity, Infinity] : null;
    const a = (lo - o) / d;
    const b = (hi - o) / d;
    return a < b ? [a, b] : [b, a];
  };
  const sx = slab(ox, dx, cellMinX(cell.col), cellMaxX(cell.col));
  const sy = slab(oy, dy, cellMinY(cell.row), cellMaxY(cell.row));
  if (sx === null || sy === null) return false;
  const enter = Math.max(sx[0], sy[0], 0);
  return enter <= Math.min(sx[1], sy[1], tMax);
}

// Ray vs one block as a rounded rectangle. Returns { t, nx, ny } or null.
function blockHit(ox, oy, dx, dy, b) {
  const minX = cellMinX(b.col);
  const maxX = cellMaxX(b.col);
  const minY = cellMinY(b.row);
  const maxY = cellMaxY(b.row);
  let tIn = -Infinity;
  let tOut = Infinity;
  let axis = 0; // 0 = entered through an x face, 1 = through a y face
  for (const [o, d, lo, hi, ax] of [[ox, dx, minX - R, maxX + R, 0], [oy, dy, minY - R, maxY + R, 1]]) {
    if (d === 0) {
      if (o < lo || o > hi) return null;
      continue;
    }
    const a = (lo - o) / d;
    const c = (hi - o) / d;
    const near = Math.min(a, c);
    if (near > tIn) {
      tIn = near;
      axis = ax;
    }
    tOut = Math.min(tOut, Math.max(a, c));
  }
  if (tIn < 0 || tIn > tOut) return null;
  const px = ox + dx * tIn;
  const py = oy + dy * tIn;
  const cornerX = px < minX ? minX : px > maxX ? maxX : null;
  const cornerY = py < minY ? minY : py > maxY ? maxY : null;
  if (cornerX !== null && cornerY !== null) return cornerHit(ox, oy, dx, dy, cornerX, cornerY);
  return axis === 0 ? { t: tIn, nx: dx > 0 ? -1 : 1, ny: 0 } : { t: tIn, nx: 0, ny: dy > 0 ? -1 : 1 };
}

// Ray vs the corner circle (radius r). The ray is outside it at t = 0 (blocks never contain the origin).
function cornerHit(ox, oy, dx, dy, cx, cy) {
  const fx = ox - cx;
  const fy = oy - cy;
  const a = dx * dx + dy * dy;
  const half = fx * dx + fy * dy;
  const disc = half * half - a * (fx * fx + fy * fy - R * R);
  if (disc < 0) return null;
  const t = (-half - Math.sqrt(disc)) / a;
  if (t < 0) return null;
  return { t, nx: (fx + dx * t) / R, ny: (fy + dy * t) / R };
}
