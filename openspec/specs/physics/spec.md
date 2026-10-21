# Physics Specification

## Purpose

Ball motion and collision rules: vectors, circle-AABB resolution, elastic reflection, substepping at 1X/2X/4X, titanium behavior and object pools. Traces to HU-02 s3/s4, HU-05 s2 and NFR Rendimiento. Source of truth: `physics-collision-engine` and `canvas-renderer-opt` skills.

## Requirements

### Requirement: Unit direction, scalar speed (HU-02 s3)

Ball direction MUST be a unit vector and speed a separate scalar. After every reflection the direction MUST be re-normalized; if the vector length is below `1e-6` the previous direction MUST be kept.

#### Scenario: Normalization
- GIVEN direction `(0.6, -0.8)` reflected off a horizontal surface
- WHEN the new direction is computed
- THEN it is `(0.6, 0.8)` and its length is 1 within 1e-9

#### Scenario: Degenerate vector
- GIVEN a computed direction of length 1e-7
- WHEN normalization runs
- THEN the previous direction is retained

### Requirement: Circle vs AABB test (HU-02 s4)

A collision MUST be detected when the squared distance from the ball center to the closest point of the box is less than `radius^2`. For a corner contact the normal MUST be the normalized vector from that corner to the ball center. For a center inside the box the ball MUST be pushed out along the axis of minimum overlap, with that axis as the normal.

#### Scenario: Edge hit
- GIVEN box `x 36..148, y 0..56`, ball radius 14 at `(92, 68)`
- WHEN collision is tested
- THEN a collision exists with normal `(0, 1)` and penetration 2

#### Scenario: Corner hit
- GIVEN the same box and ball at `(156, 64)`, radius 14
- WHEN collision is tested
- THEN the normal is `(8, 8)/|(8, 8)|`, not an axis

#### Scenario: Deep penetration
- GIVEN ball center at `(100, 20)` inside the box
- WHEN collision is resolved
- THEN the ball is pushed out along the minimum-overlap axis

### Requirement: Elastic reflection (HU-02 s3)

Reflection MUST follow `R = D - 2(D.N)N` with unit `N`, applied only when `D.N < 0`. Speed magnitude MUST NOT change on any bounce, including against `indestructible` blocks and walls.

#### Scenario: Speed preserved
- GIVEN speed 900 and direction `(0.6, 0.8)` hitting normal `(0, -1)`
- WHEN the bounce resolves
- THEN direction is `(0.6, -0.8)` and speed is 900

#### Scenario: Separating ball unchanged
- GIVEN a ball overlapping a box with `D.N >= 0`
- WHEN resolution runs
- THEN the ball is pushed out but its direction is unchanged

### Requirement: Substepping without tunneling (HU-02 s4, HU-05 s2)

The engine MUST bound per-substep displacement to half the radius: `steps = ceil(speed * speedMultiplier * dt / (radius * 0.5))`, capped at 64, with `subDt = dt * speedMultiplier / steps`. Higher speed multipliers MUST increase substeps, never per-substep displacement. Among several simultaneous overlaps only the deepest MUST be resolved in that substep.

#### Scenario: 4X no tunneling
- GIVEN a ball moving straight at a one-cell brick (112x56) at speed multiplier 4X
- WHEN 1000 fixed steps run
- THEN the ball never ends on the far side of the brick without a recorded collision

#### Scenario: Cap
- GIVEN a speed and multiplier requiring more than 64 substeps
- WHEN a step runs
- THEN exactly 64 substeps are executed

### Requirement: Fixed-step execution (HU-05 s2)

Physics MUST run only in fixed updates of `STEP = 1/120 s` and never in render.

#### Scenario: Render does not move balls
- GIVEN balls in flight and the simulation paused
- WHEN several frames are rendered
- THEN ball positions in `snapshot()` do not change

### Requirement: No ball-vs-ball collision (HU-02 s5; P5)

Balls MUST NOT collide with each other: overlapping balls MUST pass through one another with direction and speed unchanged. Balls MUST interact only with walls, ceiling, blocks, orbs and the floor (landing). No ball-vs-ball test MUST run in the hot path.

#### Scenario: Crossing balls
- GIVEN ball A at `(500, 800)` with direction `(1, 0)` and ball B at `(528, 800)` with direction `(-1, 0)`, both radius 14, speed 1200, no other surface within 100 px
- WHEN 4 fixed steps run at 1X
- THEN both balls have overlapped at some substep, A still has direction `(1, 0)`, B still has direction `(-1, 0)`, both speeds are 1200, and no collision event was recorded

### Requirement: Titanium reflection (HU-02 s3)

A hit on an `indestructible` block MUST NOT reduce any durability and MUST reflect elastically.

#### Scenario: No damage
- GIVEN a ball hitting an `indestructible` block 100 times
- WHEN the snapshot is read
- THEN the block exists unchanged and ball speed is unchanged

### Requirement: Pools without hot-path allocation (NFR Rendimiento)

Balls and particles MUST come from preallocated pools exposing `acquire()` and `release(obj)`; objects MUST have an `active` flag and `reset()`. Release MUST be swap-remove. Pool growth MUST happen only at level load.

#### Scenario: Acquire/release
- GIVEN a pool of size 3 with 3 acquired objects
- WHEN one is released then `acquire()` is called
- THEN an object is returned with `active === true` and no new object is created

#### Scenario: Ball pool exhausted
- GIVEN the ball pool is empty mid-turn
- WHEN another ball is requested
- THEN the request fails without allocating (sizing is a level-load concern)

#### Scenario: Ball pool size
- GIVEN any level loaded
- WHEN the ball pool is inspected
- THEN it holds 50 preallocated balls (v1 volley cap)

### Requirement: 50 balls at 4X performance (NFR Rendimiento; E2_v1)

The simulation MUST sustain approximately 60 FPS with 50 simultaneously active balls (v1 volley cap) at 4X on a mid-range PC. The 200-ball target is deferred to the levels 8-10 spec.

#### Scenario: Load test
- GIVEN the sealed stress fixture in which balls cannot land, 4X, and a volley of 50 fully emitted so that 50 balls are active
- WHEN 600 frames are simulated and rendered in Chromium, measurement starting at the first frame where active == 50
- THEN average frame time is at most about 16.7 ms, active is still 50 at the end, and the ball pool created no new objects

## Open Items

- OI-1: Resolved in design: ball radius 14 (28 px sprite), speed 1200 px/s; collision scenarios use r = 14.
- OI-2: Damage dealt per ball hit is not stated (assumed 1 HP/hit by scenarios elsewhere pending confirmation).
- OI-3: Resolved by P5: balls never collide with each other.
