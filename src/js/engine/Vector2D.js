// Rules: .claude/skills/physics-collision-engine/SKILL.md
// Mutable 2D vector. Methods mutate in place so the hot path never allocates.

const MIN_LENGTH = 1e-6;

export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // Sets this vector to the unit vector of (x, y). Below MIN_LENGTH the previous
  // value is kept and false is returned.
  setNormalized(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len < MIN_LENGTH) return false;
    this.x = x / len;
    this.y = y / len;
    return true;
  }

  // R = D - 2(D.N)N for unit N, applied only when approaching (D.N < 0).
  // The result is re-normalized. Returns true when a reflection happened.
  reflect(nx, ny) {
    const dot = this.x * nx + this.y * ny;
    if (dot >= 0) return false;
    this.setNormalized(this.x - 2 * dot * nx, this.y - 2 * dot * ny);
    return true;
  }

  // Guarantees |y| >= minAbsY while keeping unit length. The sign of y is kept
  // (downward when y is 0) and the sign of x is kept (positive when x is 0).
  clampMinAbsY(minAbsY) {
    if (Math.abs(this.y) >= minAbsY) return this;
    const y = this.y < 0 ? -minAbsY : minAbsY;
    const x = Math.sqrt(1 - minAbsY * minAbsY);
    this.x = this.x < 0 ? -x : x;
    this.y = y;
    return this;
  }
}
