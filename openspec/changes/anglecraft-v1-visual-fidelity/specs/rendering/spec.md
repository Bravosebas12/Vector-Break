# Delta for Rendering

## MODIFIED Requirements

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
(Previously: only crack overlays used the atlas; all other entities were procedural.)

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

### Requirement: HP feedback (HU-02 s1)

A block's displayed HP number MUST update in real time, centered on the block, in JetBrains Mono 700 20 px, colored per type: standard `#E9FFFB`, reinforced `#FFE1B3`, core `#FFE0F0`. Indestructible blocks MUST NOT show a number. Remaining-HP feedback MUST use the crack overlays: `crack_30` at >= 30% damage, `crack_60` at >= 60%, `crack_90` at >= 90%. Per-HP color variants are deferred until design delivers them (pending item 2.5).
(Previously: HP feedback was a procedural tint ramp per type.)

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

## ADDED Requirements

### Requirement: Board surface

The board MUST be drawn as in the mockup: panel fill `rgba(10,13,18,.78)`, a 32 px decorative grid in `rgba(255,255,255,.025)`, and the launch line at `FLOOR_Y` (956) as a 1 px horizontal gradient from transparent to `#2A2E39` (15%-85%) to transparent, inset 40 px from both sides. The surface MUST be part of the static layer.

#### Scenario: Launch line
- GIVEN the static layer
- WHEN the pixel row at board y = 956 is sampled at x = 540
- THEN its color is within tolerance of `#2A2E39`

### Requirement: Aim preview styling (HU-01)

While `Aiming`, the preview MUST be drawn with `traj_dot` sprites every 28 px along the predicted path starting 36 px from the launcher, with opacity `1 - 0.55 * s / total` (s = distance along the path). A `traj_bounce` sprite MUST mark the bounce point and a `traj_impact` sprite MUST mark the predicted contact. The `cursor_crosshair` sprite MUST follow the mouse over the board and the system cursor MUST be hidden there. Path geometry is unchanged (raycaster, 1 bounce).

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

Each uncaptured orb MUST show its value as `+V` in JetBrains Mono 700 below the orb sprite, in cyan.

#### Scenario: Orb value
- GIVEN an orb with value 3
- WHEN it renders
- THEN the text `+3` is drawn below the `orb_splitter` sprite

### Requirement: Particle colors per block type (HU-02 s2)

Destruction particles MUST use the block type color: cyan for standard, amber for reinforced, magenta/violet for core, steel for indestructible. Shapes stay procedural until particle sprites are delivered.

#### Scenario: Reinforced burst
- GIVEN a reinforced block destroyed
- WHEN the burst is emitted
- THEN every particle color is `#FF9E00`
