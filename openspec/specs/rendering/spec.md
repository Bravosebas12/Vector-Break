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

A block's displayed HP number MUST update in real time, centered on the block, in JetBrains Mono 700 20 px, colored per type: standard `#E9FFFB`, reinforced `#FFE1B3`, core `#FFE0F0`. Indestructible blocks MUST NOT show a number. Remaining-HP feedback MUST use the crack overlays: `crack_30` at >= 30% damage, `crack_60` at >= 60%, `crack_90` at >= 90%. Per-HP color variants are deferred until design delivers them (pending item 2.5).

#### Scenario: Number decreases
- GIVEN a core with HP 300 hit once (d)
- WHEN rendered
- THEN the displayed number is `300 - d`

#### Scenario: Overlay changes with damage
- GIVEN a block with max HP 10
- WHEN its HP goes 10, 7, 4, 1
- THEN the overlay is none, `crack_30`, `crack_60`, `crack_90`

#### Scenario: Steel shows no number
- GIVEN an indestructible block
- WHEN rendered
- THEN no text is drawn on it

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

Sprites MUST come from the atlas at the scale chosen from `devicePixelRatio`. Every entity that has an atlas frame MUST be drawn with it; primitives are allowed only for assets that do not exist yet (particles, hit flash, spark). Mapping:

| Entity | Frame | Destination size (logical px) |
|---|---|---|
| standard block | `brick_low` | 112x56 |
| reinforced block | `brick_mid` | 112x56 |
| core block | `brick_high` | 112x56 |
| indestructible block | `brick_steel` | 112x56 |
| damage overlay | `crack_30` / `crack_60` / `crack_90` | 112x56 |
| ball | `ball` | 64x64, centered (sprite core radius equals `BALL_RADIUS`) |
| multiplier orb | `orb_splitter` | 64x64, centered (hex radius 22 ~ `ORB_RADIUS` 24) |
| aim cursor | `cursor_crosshair` | 64x64, hotspot at its center |
| aim dots | `traj_dot` | 16x16 |
| aim bounce | `traj_bounce` | 32x32 |
| aim impact | `traj_impact` | 48x48 |

Until sprites are re-exported, 128x64 brick sprites MUST be scaled to 112x56. If the atlas failed to load, the placeholder frames MAY be used and the game MUST keep running.

#### Scenario: Brick size
- GIVEN a brick drawn
- WHEN its destination rect is read
- THEN it is 112x56

#### Scenario: Sprite per block type
- GIVEN a level with one block of each type
- WHEN the static layer is drawn with a loaded atlas
- THEN `drawImage` is called with frames `brick_low`, `brick_mid`, `brick_high` and `brick_steel` for standard, reinforced, core and indestructible respectively, and no `fillRect` is used for a block body

#### Scenario: Ball sprite
- GIVEN 3 active balls
- WHEN a frame renders
- THEN 3 `ball` frames are drawn at 64x64 centered on each interpolated ball position

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

### Requirement: Board surface

The board MUST be drawn as in the mockup: panel fill `rgba(10,13,18,.78)`, a 32 px decorative grid in `rgba(255,255,255,.025)`, and the launch line at `FLOOR_Y` (956) as a 1 px horizontal gradient from transparent to `#2A2E39` (15%-85%) to transparent, inset 40 px from both sides. The surface MUST be part of the static layer.

#### Scenario: Launch line
- GIVEN the static layer
- WHEN the pixel row at board y = 956 is sampled at x = 540
- THEN its color is within tolerance of `#2A2E39`

### Requirement: Aim preview styling (HU-01)

While `Aiming`, the preview MUST be drawn with `traj_dot` sprites every 28 px along the predicted path starting 36 px from the launcher, with opacity `1 - 0.55 * s / total` (s = distance along the path). The first predicted contact MUST be marked with `traj_impact` when it is a block and with `traj_bounce` when it is a wall or the ceiling; dots continue along the reflected segment. The `cursor_crosshair` sprite MUST follow the mouse over the board and the system cursor MUST be hidden there. Path geometry is unchanged (raycaster, 1 bounce).

#### Scenario: Dot spacing
- GIVEN a straight preview segment 280 px long
- WHEN the preview renders
- THEN 9 dots are drawn at 36, 64, ..., 260 px with decreasing opacity

#### Scenario: Cursor hidden on board
- GIVEN the pointer over the board
- WHEN the computed CSS cursor of the board is read
- THEN it is `none`

### Requirement: Launcher styling

The launcher MUST be drawn as in the Key Art: a cyan (`#00F5D4`) dashed ring of radius 16 (dash 16.99/5) with a soft cyan glow around a white core of radius 7. When firing is not possible (not `Aiming`, or paused) the ring MUST use the muted text color and no glow.

#### Scenario: Disabled launcher
- GIVEN the state is `Simulating`
- WHEN the launcher renders
- THEN its ring color is `#8A93A6` and no glow is drawn

### Requirement: Orb label (A11)

Each uncaptured orb MUST show its value as `+V` in JetBrains Mono 700 at the upper right of the orb sprite (inside the orb's cell, so it never covers a neighbouring block), in cyan.

#### Scenario: Orb value
- GIVEN an orb with value 3
- WHEN it renders
- THEN the text `+3` is drawn at the upper right of the `orb_splitter` sprite

### Requirement: Particle colors per block type (HU-02 s2)

Destruction particles MUST use the block type color: cyan for standard, amber for reinforced, magenta/violet for core, steel for indestructible. Shapes stay procedural until particle sprites are delivered.

#### Scenario: Reinforced burst
- GIVEN a reinforced block destroyed
- WHEN the burst is emitted
- THEN every particle color is `#FF9E00`

## Open Items

- OI-1: HP-to-color thresholds and crack overlay mapping (`crack_30/60/90`) are not defined.
- OI-2: Particle pool size (512 is an example in the skill) and burst shape are not fixed.
- OI-3: Resolved by HU-09: loading visuals are the title and progress screen defined in `start-screen`.
