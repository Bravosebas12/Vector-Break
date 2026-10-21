// Rules: .claude/skills/physics-collision-engine/SKILL.md
// Circle vs AABB. All functions write into caller-provided `out` objects
// ({ nx, ny, pen }) so the hot path never allocates.
import { MIN_DIR_Y } from '../system/Layout.js';

export class Collision {
  // Closest-point test. Collision when the squared distance from the centre to the
  // closest point of the box is below r^2. Corner contact: normal = normalized
  // (centre - corner). Centre inside the box: push out along the minimum-overlap axis.
  static circleAabb(cx, cy, r, minX, minY, maxX, maxY, out) {
    const px = cx < minX ? minX : cx > maxX ? maxX : cx;
    const py = cy < minY ? minY : cy > maxY ? maxY : cy;
    const dx = cx - px;
    const dy = cy - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;

    if (d2 > 0) {
      const dist = Math.sqrt(d2);
      out.nx = dx / dist;
      out.ny = dy / dist;
      out.pen = r - dist;
      return true;
    }

    // Centre inside (or exactly on the boundary of) the box.
    const left = cx - minX;
    const right = maxX - cx;
    const top = cy - minY;
    const bottom = maxY - cy;
    let min = left;
    out.nx = -1;
    out.ny = 0;
    if (right < min) {
      min = right;
      out.nx = 1;
      out.ny = 0;
    }
    if (top < min) {
      min = top;
      out.nx = 0;
      out.ny = -1;
    }
    if (bottom < min) {
      min = bottom;
      out.nx = 0;
      out.ny = 1;
    }
    out.pen = min + r;
    return true;
  }

  // Tests the first `count` boxes ({ minX, minY, maxX, maxY }) and keeps only the
  // deepest overlap in `out`. Returns its index, or -1 when nothing overlaps.
  // Ties keep the lowest index.
  static deepest(cx, cy, r, boxes, count, out) {
    let best = -1;
    let bestPen = 0;
    for (let i = 0; i < count; i++) {
      const b = boxes[i];
      if (!Collision.circleAabb(cx, cy, r, b.minX, b.minY, b.maxX, b.maxY, Collision.scratch)) continue;
      if (Collision.scratch.pen > bestPen) {
        bestPen = Collision.scratch.pen;
        best = i;
        out.nx = Collision.scratch.nx;
        out.ny = Collision.scratch.ny;
        out.pen = Collision.scratch.pen;
      }
    }
    return best;
  }

  // Pushes `ball` ({ x, y, dir }) out along the hit normal, then reflects its
  // direction only when approaching (D.N < 0) and re-clamps |dir.y| >= MIN_DIR_Y.
  // Speed is never touched. Returns true when a reflection happened.
  static resolve(ball, hit) {
    ball.x += hit.nx * hit.pen;
    ball.y += hit.ny * hit.pen;
    if (!ball.dir.reflect(hit.nx, hit.ny)) return false;
    ball.dir.clampMinAbsY(MIN_DIR_Y);
    return true;
  }
}

Collision.scratch = { nx: 0, ny: 0, pen: 0 };
