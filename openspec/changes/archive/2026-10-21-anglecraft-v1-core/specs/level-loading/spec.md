# Level Loading Specification

## Purpose

Loading and validating static level JSON, entity types and board layout (decision B1). Traces to HU-06 s4, HU-08 s4, HU-02 (block types) and HU-04 s1.

## Requirements

### Requirement: Schema fields (HU-06 s4)

A level MUST contain `id`, `name`, `grid`, `launcher`, `shots`, `startBalls` and `blocks[]`. It MUST satisfy `level.schema.json`. Grid defaults to 9 columns by 12 rows; row 0 is the top.

#### Scenario: Valid level
- GIVEN `src/levels/level1.json`
- WHEN `validateLevel` runs
- THEN it returns valid with no errors

#### Scenario: Missing field
- GIVEN a level without `shots`
- WHEN `validateLevel` runs
- THEN it reports an error naming `shots`

### Requirement: Block types and HP ranges (HU-02)

Allowed types and HP are: `standard` 1-15, `reinforced` 20-80, `core` 100-500, `indestructible` and `multiplier` with no HP. A block MUST be rejected when its HP is outside its range.

#### Scenario: HP out of range
- GIVEN a `standard` block with hp 16
- WHEN validated
- THEN the level is rejected

#### Scenario: HP on indestructible
- GIVEN an `indestructible` block with an hp value
- WHEN validated
- THEN the level is rejected

### Requirement: Grid integrity (HU-06 s4)

Cells MUST be integers within the grid bounds, and no two blocks MAY share a cell.

#### Scenario: Out of bounds
- GIVEN a block at col 9 in a 9-column grid
- WHEN validated
- THEN the level is rejected

#### Scenario: Duplicate cell
- GIVEN two blocks at `(4,1)`
- WHEN validated
- THEN the level is rejected

### Requirement: Core and loop-trap rules (HU-06 s4, HU-08 s4)

A level MUST contain at least 1 `core`. Each core MUST sit in a loop trap: a cavity bounded by `indestructible` or high-HP blocks with one entry of 1-2 cells. Validation MUST reject: a core with no adjacent trap, an entry wider than 2 cells, and a fully closed trap.

#### Scenario: No core
- GIVEN a level with no `core`
- WHEN validated
- THEN the level is rejected

#### Scenario: Wide entry
- GIVEN a trap with an entry 3 cells wide
- WHEN validated
- THEN the level is rejected

#### Scenario: Closed trap
- GIVEN a core completely enclosed
- WHEN validated
- THEN the level is rejected

### Requirement: Core reachability (HU-06 s1/s2, HU-08 s4)

Each core MUST be reachable by at least one path of at most 1 bounce from a valid launcher angle, verified with the aim raycaster.

#### Scenario: Unreachable core
- GIVEN a core whose entry is shielded from every valid angle
- WHEN validated
- THEN the level is rejected

### Requirement: Hard failure (HU-06 s4)

An invalid level MUST produce a hard error and MUST NOT be partially loaded.

#### Scenario: No partial state
- GIVEN an invalid level passed to `loadLevel`
- WHEN loading fails
- THEN an error is raised and the previous game state is unchanged

### Requirement: Board layout B1 (HU-06, HU-08)

Bricks MUST be 112x56 in a 9x12 grid of 1008x672, centered horizontally at the top of the 1080x1000 board. Cell `(c, r)` MUST map to `x = 36 + 112c`, `y = 56r`. The launch line MUST be at `y = 956`. The launcher x MUST be `launcher.x` times the board width at level start.

#### Scenario: Cell mapping
- GIVEN cell `(4, 1)`
- WHEN its board rectangle is computed
- THEN it is `x 484..596, y 56..112`

#### Scenario: Launcher start
- GIVEN `launcher.x = 0.5`
- WHEN the level loads
- THEN the launcher is at `x = 540, y = 956`

### Requirement: Entities (HU-02, HU-04 s1)

The loader MUST create block entities with `hp`, `type` and cell, and multiplier entities with `value`. Multiplier orbs MUST NOT collide.

#### Scenario: Orb entity
- GIVEN a `multiplier` with value 2
- WHEN loaded
- THEN an orb entity with `value = 2` exists and it is not a solid obstacle

## Open Items

- OI-1: The machine-checkable definition of "high-HP" for trap walls (threshold) is not stated.
- OI-2: Whether `launcher.x` may be non-0.5 and its valid range is not stated.
- OI-3: The sprite scale (128x64 to 112x56) is a rendering concern; layout is independent.
