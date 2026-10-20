---
name: physics-collision-engine
description: "Trigger: physics, collision, ball vs brick, AABB, reflection, raycast, aim preview, tunneling, substep. AngleCraft vector physics and collision rules."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "1.0"
---

## Activation Contract

Use when writing or changing ball movement, ball-vs-block/wall collision, the aim preview ray, or simulation speed handling in AngleCraft (Canvas + Vanilla JS).

## Hard Rules

- Represent direction as a **unit vector**; speed is a separate scalar. Re-normalize after every reflection: `len = Math.hypot(x, y); x /= len; y /= len`.
- Guard normalization: if `len < 1e-6`, keep the previous direction.
- Clamp launch angle so `|dir.y| >= 0.05` (no perfectly horizontal infinite loops).
- Collisions are **perfectly elastic**: speed magnitude never changes on bounce.
- Reflection formula is mandatory: `R = D - 2(D·N)N` with `N` unit length.
- Never allocate vectors in the hot path; mutate pooled `{x, y}` objects or scalar locals.
- Physics runs only inside fixed-timestep updates (see `canvas-renderer-opt`), never in render.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Circle vs AABB | Closest-point test (below) |
| Center inside AABB (deep penetration) | Push out along axis of minimum overlap, normal = that axis |
| Closest point equals a corner | Normal = normalized `(center - corner)` |
| Hit several blocks in one substep | Resolve the deepest overlap only, re-test next substep |
| Speed multiplier 2X / 4X | Increase substeps, never the per-step displacement |

## Execution Steps

1. **Circle vs AABB**: `cx = clamp(ball.x, r.minX, r.maxX)`, `cy = clamp(ball.y, r.minY, r.maxY)`; `dx = ball.x - cx`, `dy = ball.y - cy`; collision when `dx*dx + dy*dy < radius*radius`.
2. **Resolve**: `dist = sqrt(d²)`; `N = (dx, dy) / dist`; move ball out by `radius - dist` along `N`; reflect only if `D·N < 0` (approaching).
3. **Substepping**: `maxStep = radius * 0.5`; `steps = ceil(speed * speedMultiplier * dt / maxStep)`; `subDt = dt * speedMultiplier / steps`; integrate + collide per substep. Cap `steps` at 64.
4. **Predictive aim ray (1 bounce)**: march/ray-test from launcher along `D` against walls and blocks (ray vs AABB slab method, expanded by ball radius = Minkowski sum). At first hit point `P` with normal `N`, compute `R = D - 2(D·N)N` and draw a segment of fixed length from `P` along `R`. Never draw a second bounce.
5. The preview must use the exact same collision geometry as the simulation.

## Output Contract

- Pure modules with no DOM access: `src/js/engine/` (`Vector2D.js`, `Physics.js`, `Collision.js`) and `src/js/system/Raycaster.js`.
- Unit tests for: corner hit, edge hit, deep penetration, reflection preserving speed, 4X speed no tunneling through a 1-cell brick.

## References

- `../canvas-renderer-opt/SKILL.md` — fixed timestep owner.
- `../game-loop-state-manager/SKILL.md` — speed keys 1/2/4.
