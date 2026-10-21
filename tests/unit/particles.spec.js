import { test, expect } from '@playwright/test';
import { Particle } from '../../src/js/entities/Particle.js';
import { Particles, PARTICLE_POOL_SIZE, PARTICLE_LIFE } from '../../src/js/system/Particles.js';

test.describe('Particles', () => {
  test('preallocates a fixed pool of 512 and never creates more', () => {
    const p = new Particles();
    expect(PARTICLE_POOL_SIZE).toBe(512);
    expect(p.pool.size).toBe(512);
    expect(p.pool.created).toBe(512);
    p.burst(100, 100, 32, '#fff');
    p.update(0.1);
    expect(p.pool.created).toBe(512);
  });

  test('a burst activates `count` particles near the origin, expanding outwards', () => {
    const p = new Particles();
    expect(p.burst(200, 300, 12, '#0ff')).toBe(12);
    expect(p.active).toBe(12);
    const before = p.pool.items.slice(0, 12).map((q) => Math.hypot(q.x - 200, q.y - 300));
    p.update(0.1);
    const after = p.pool.items.slice(0, 12).map((q) => Math.hypot(q.x - 200, q.y - 300));
    before.forEach((d, i) => expect(after[i]).toBeGreaterThan(d));
    expect(new Set(p.pool.items.slice(0, 12).map((q) => `${q.vx.toFixed(2)},${q.vy.toFixed(2)}`)).size).toBe(12);
  });

  test('particles live 400 ms and are released at life <= 0', () => {
    const p = new Particles();
    expect(PARTICLE_LIFE).toBe(0.4);
    p.burst(0, 0, 12, '#fff');
    p.update(0.39);
    expect(p.active).toBe(12);
    p.update(0.02);
    expect(p.active).toBe(0);
    expect(p.pool.items.every((q) => !q.active)).toBe(true);
  });

  test('a released particle is reset and reusable', () => {
    const q = new Particle();
    q.life = 1;
    q.vx = 5;
    q.reset();
    expect(q.life).toBe(0);
    expect(q.vx).toBe(0);
  });

  test('exhausted pool drops the new particles without allocating', () => {
    const p = new Particles(10);
    expect(p.burst(0, 0, 8, '#fff')).toBe(8);
    expect(p.burst(0, 0, 8, '#fff')).toBe(2);
    expect(p.dropped).toBe(6);
    expect(p.burst(0, 0, 4, '#fff')).toBe(0);
    expect(p.active).toBe(10);
    expect(p.pool.created).toBe(10);
    p.update(1);
    expect(p.active).toBe(0);
    expect(p.burst(0, 0, 4, '#fff')).toBe(4); // recovers
  });
});
