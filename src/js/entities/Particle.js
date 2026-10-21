// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Pooled destruction particle (square). `life` counts down in seconds; the pool releases it at <= 0.
export class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.color = '#fff';
    this.active = false;
    this.poolIndex = -1;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.active = false;
  }
}
