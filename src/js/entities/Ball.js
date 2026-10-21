// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Pooled ball: direction is a unit vector, speed a separate scalar (px/s at 1X).
import { Vector2D } from '../engine/Vector2D.js';
import { ObjectPool } from '../system/ObjectPool.js';
import { MAX_VOLLEY } from '../system/Layout.js';

export class Ball {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.dir = new Vector2D(0, -1);
    this.speed = 0;
    this.active = false;
    this.landed = false;
    this.emitIndex = 0;
    this.poolIndex = -1;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.dir.set(0, -1);
    this.speed = 0;
    this.active = false;
    this.landed = false;
    this.emitIndex = 0;
  }

  // The ball pool is preallocated once (50 = MAX_VOLLEY) and never grows mid-turn.
  static createPool(size = MAX_VOLLEY) {
    return new ObjectPool(() => new Ball(), size);
  }
}
