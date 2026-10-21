// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Fixed-size particle pool for destruction bursts (design E5: 400 ms, drop-on-full).
// Nothing here allocates after construction: a full pool simply drops the new particle.
import { Particle } from '../entities/Particle.js';
import { ObjectPool } from './ObjectPool.js';

export const PARTICLE_POOL_SIZE = 512;
export const PARTICLE_LIFE = 0.4; // seconds
const BURST_SPEED = 160; // px/s; three speed rings give the burst some depth
const TWO_PI = Math.PI * 2;

export class Particles {
  constructor(size = PARTICLE_POOL_SIZE) {
    this.pool = new ObjectPool(() => new Particle(), size);
    this.dropped = 0;
  }

  get active() {
    return this.pool.count;
  }

  // Emits up to `count` squares from (x, y); returns how many were actually spawned.
  burst(x, y, count, color) {
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      if (p === null) {
        this.dropped += count - i;
        break;
      }
      const angle = (i / count) * TWO_PI;
      const speed = BURST_SPEED * (1 + (i % 3) * 0.4);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = p.maxLife = PARTICLE_LIFE;
      p.size = 6 + (i % 2) * 2;
      p.color = color;
      spawned++;
    }
    return spawned;
  }

  // Backwards iteration: release swaps the last active particle into the freed slot.
  update(dt) {
    const items = this.pool.items;
    for (let i = this.pool.count - 1; i >= 0; i--) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
}
