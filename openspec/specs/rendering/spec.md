# Rendering Specification

## Purpose

Fixed-timestep loop, canvas drawing, atlas, particles, DPR and mouse mapping. Traces to HU-02 s1/s2, HU-04 s3, HU-01 s1 and NFR Rendimiento.

## Requirements

### Requirement: Fixed-timestep loop (HU-05 s2)

The loop MUST use `requestAnimationFrame` with `STEP = 1/120 s`, independent of monitor refresh rate. Frame delta MUST be clamped to 0.25 s. Rendering MUST interpolate with `alpha = accumulator / STEP`.

#### Scenario: Refresh independence
- GIVEN 1 s of frames at 60 Hz and at 144 Hz
- WHEN logic steps are counted
- THEN both yield about 120 steps

#### Scenario: Tab switch
- GIVEN a 5 s gap between frames
- WHEN the next frame runs
- THEN at most 30 steps (0.25 s) execute

### Requirement: Static layer (HU-02 s2)

Static grid and blocks MUST be drawn to an offscreen layer and blitted once per frame; the layer MUST be redrawn only when a block is destroyed or its HP text changes. If `OffscreenCanvas` is unavailable a detached canvas MUST be used.

#### Scenario: No redraw when idle
- GIVEN a static board with balls moving and no hits
- WHEN 60 frames render
- THEN the layer redraw count is 0

#### Scenario: Redraw on destruction
- GIVEN a block destroyed in a step
- WHEN the next frame renders
- THEN the layer is redrawn once and the block is absent

### Requirement: HP feedback (HU-02 s1)

A block's displayed HP number MUST update in real time and its color MUST transition according to remaining HP.

#### Scenario: Number decreases
- GIVEN a core with HP 300 hit once (d)
- WHEN rendered
- THEN the displayed number is `300 - d`

#### Scenario: Color changes
- GIVEN a block crossing a color threshold
- WHEN rendered before and after
- THEN its sprite or tint differs

### Requirement: Destruction particles (HU-02 s2)

A destroyed block MUST emit an expanding particle burst from a fixed-size pool. When the pool is exhausted the new particle MUST be dropped without allocating.

#### Scenario: Burst
- GIVEN a block destroyed
- WHEN the next frames render
- THEN particles are active near the block cell and each is released at `life <= 0`

#### Scenario: Pool exhausted
- GIVEN all particles active
- WHEN another burst is requested
- THEN no particle is allocated and the game continues

### Requirement: Atlas and sprite scale (B1)

Sprites MUST come from the atlas at the scale chosen from `devicePixelRatio`. Until sprites are re-exported, 128x64 brick sprites MUST be scaled to 112x56.

#### Scenario: Brick size
- GIVEN a brick drawn
- WHEN its destination rect is read
- THEN it is 112x56

### Requirement: DPR and mouse mapping (HU-01 s1)

The backing store MUST be scaled by `devicePixelRatio` once on resize. Mouse coordinates MUST map to game coordinates correctly under CSS letterboxing (`object-fit: contain`) and any DPR.

#### Scenario: Letterboxed mapping
- GIVEN a 1920x1080 canvas displayed in a 1000x1000 window (letterboxed vertically)
- WHEN the cursor is at the center of the displayed canvas
- THEN the game coordinate is `(960, 540)` within 1 px

#### Scenario: DPR 2
- GIVEN `devicePixelRatio = 2`
- WHEN the cursor sits on a block's visible center
- THEN the mapped coordinate falls inside that block's cell

### Requirement: Frame rate (NFR Rendimiento)

The renderer MUST hold about 60 FPS with 50 balls at 4X (v1 volley cap, E2_v1), with no per-frame allocation during simulation. The 200-ball target is deferred to the levels 8-10 spec.

#### Scenario: Stress
- GIVEN 50 simultaneously active balls at 4X in the sealed stress fixture
- WHEN 600 frames run in Chromium, counted from the first frame with 50 active balls
- THEN average frame time is at most about 16.7 ms and 50 balls are still active at the end

### Requirement: Assets missing (HU-02)

Missing optional sprites (hit flash, spark, launcher) MUST NOT stop the game; placeholders or procedural drawing MAY be used.

#### Scenario: Missing sprite
- GIVEN the atlas lacks `hit_flash`
- WHEN a block is hit
- THEN the game runs without an error

## Open Items

- OI-1: HP-to-color thresholds and crack overlay mapping (`crack_30/60/90`) are not defined.
- OI-2: Particle pool size (512 is an example in the skill) and burst shape are not fixed.
- OI-3: Resolved by HU-09: loading visuals are the title and progress screen defined in `start-screen`.
