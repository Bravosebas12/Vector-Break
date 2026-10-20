---
name: canvas-renderer-opt
description: "Trigger: render, canvas, draw, requestAnimationFrame, game loop timing, fixed timestep, object pool, particles, offscreen canvas. AngleCraft rendering performance rules."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "1.0"
---

## Activation Contract

Use when touching the main loop, drawing code, balls, particles, or anything allocated during gameplay in AngleCraft.

## Hard Rules

- **Object pooling is mandatory** for balls and particles. `new Ball()` / `new Particle()` / object literals inside `update` or `render` are FORBIDDEN during gameplay. Pools are preallocated at level load.
- Pools expose `acquire()` / `release(obj)`; objects have `active` flag and `reset()`. Iterate with index loops, swap-remove on release (no `splice`, no `filter`).
- Main loop uses `requestAnimationFrame` with a **fixed timestep** `STEP = 1/120 s`, independent of monitor Hz (60/144/240).
- Clamp frame delta to `0.25 s` to avoid spiral of death after tab switch.
- Render interpolates with `alpha = accumulator / STEP`.
- Static grid/background is drawn once to an **offscreen canvas** and blitted with one `drawImage`; redraw it only when a block changes (dirty flag).
- No `ctx.save/restore` per entity; batch by style (set `fillStyle` once per color group).

## Decision Gates

| Need | Action |
|------|--------|
| Pool exhausted (balls) | Grow pool at level load from level JSON ball count; never mid-turn |
| Pool exhausted (particles) | Drop the new particle (cosmetic), never allocate |
| Block destroyed or HP text changed | Mark grid layer dirty |
| `OffscreenCanvas` unsupported | Fallback to `document.createElement('canvas')` not attached to DOM |

## Execution Steps

1. Loop skeleton:
   ```js
   let acc = 0, last = performance.now();
   function frame(now) {
     acc += Math.min((now - last) / 1000, 0.25); last = now;
     while (acc >= STEP) { update(STEP); acc -= STEP; }
     render(acc / STEP);
     requestAnimationFrame(frame);
   }
   ```
2. Layers: `bgLayer` (offscreen, grid + static blocks) → main canvas: blit bg, dynamic blocks hit-flash, balls, particles, UI/aim ray.
3. Particles: fixed-size pool (e.g. 512) with `x, y, vx, vy, life, color`; update decrements `life`, releases at `<= 0`.
4. Handle `devicePixelRatio` once on resize: scale backing store, `ctx.setTransform(dpr,0,0,dpr,0,0)`.

## Output Contract

- Loop in `src/js/main.js`, pool in `src/js/system/ObjectPool.js`, pooled entities in `src/js/entities/`.
- Sprites come from the atlas `assets/sprites/spritesheet@{1,2,3}x.{png,json}`; pick the scale from `devicePixelRatio`.
- Zero allocations per frame verifiable in DevTools memory timeline during simulation.

## References

- `../physics-collision-engine/SKILL.md` — physics runs inside `update(STEP)`.
