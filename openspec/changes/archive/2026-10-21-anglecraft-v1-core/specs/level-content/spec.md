# Level Content Specification

## Purpose

Rules for the six shipped levels: tutorial levels 1-3 and challenge levels 4-6. Traces to HU-06 s1-s4 and HU-08 s2/s4.

## Requirements

### Requirement: Level files (HU-06, HU-08)

Six files `src/levels/level1.json`..`level6.json` MUST exist, with JSON ids `level-01`..`level-06`, and each MUST pass `validateLevel`.

#### Scenario: All valid
- GIVEN the six files
- WHEN each is validated
- THEN all pass

### Requirement: Level 1 (HU-06 s1)

Level 1 MUST have `shots` 10, `startBalls` 3, one core of HP 100 at `(4,1)` with trap entry `(3,2)`, one orb of value 1, and light blocks (1-10 HP). The entry MUST be reachable with a single side-wall bounce.

#### Scenario: Wall bounce reachable
- GIVEN level 1 loaded
- WHEN reachability from the launcher is computed
- THEN an angle exists reaching `(3,2)` through exactly 1 side-wall bounce

#### Scenario: Data
- GIVEN level 1
- WHEN its JSON is read
- THEN shots 10, startBalls 3, core hp 100 at `(4,1)`

### Requirement: Level 2 (HU-06 s2)

Level 2 MUST have `shots` 12, `startBalls` 5, one core of HP 150 at `(7,1)` with entry `(6,2)`, one orb of value 1, and `indestructible` blocks intercepting every straight line from the launcher to the entry.

#### Scenario: No direct line
- GIVEN level 2
- WHEN straight rays are traced from the launcher to the entry over all valid angles
- THEN each is blocked by an `indestructible` block

#### Scenario: Obtuse path
- GIVEN level 2
- WHEN reachability is computed
- THEN at least one path with a wall bounce reaches the entry

### Requirement: Level 3 (HU-06 s3)

Level 3 MUST have `shots` 12, `startBalls` 8, a core of HP 400 at `(4,4)` inside a 3x3 titanium cavity with entry `(4,6)`, and two orbs of value 2. A ball entering the opening MUST bounce repeatedly in the cavity damaging the core before exiting.

#### Scenario: Repeated bounces
- GIVEN a ball entering at the opening
- WHEN simulated
- THEN it hits the core more than once before leaving the cavity

#### Scenario: Data
- GIVEN level 3
- WHEN read
- THEN shots 12, startBalls 8, core hp 400 at `(4,4)`, two orbs value 2

### Requirement: Challenge levels (HU-08 s2)

Levels 4, 5 and 6 MUST each combine at least two of: wall bounce, titanium obstacles, loop traps, orbs. Total core HP MUST be non-decreasing from level 4 to 5 and from 5 to 6.

#### Scenario: Core HP order
- GIVEN total core HP T4, T5, T6
- WHEN compared
- THEN `T4 <= T5 <= T6`

#### Scenario: Mechanics
- GIVEN each of levels 4-6
- WHEN mechanics are counted
- THEN each has at least two distinct mechanics

### Requirement: Structural rules (HU-08 s4)

Levels 4-6 MUST satisfy the schema, trap and reachability rules of levels 1-3.

#### Scenario: Validation
- GIVEN levels 4-6
- WHEN validated
- THEN each has at least 1 core in a trap with entry of 1-2 cells, reachable within 1 bounce

### Requirement: Completability (success criteria)

Levels 1 through 6 MUST be completable in a seeded end-to-end run.

#### Scenario: Seeded playthrough
- GIVEN fixed seed and a shot script per level
- WHEN each level is played in order
- THEN all six reach `Victory`

## Open Items

- OI-1: `shots`, `startBalls`, HP values, layouts and orb values for levels 4-6 are not defined (design/tuning inputs).
- OI-2: Resolved by P6: level 3 need not replicate any external reference; its content tests rely only on the authored constraints in this spec.
- OI-3: Level 1 "light blocks 1-10 HP" counts and positions are in the existing JSON, not restated here.
- OI-4: HU-08 s2 compares only levels 4, 5 and 6; no HP relation between level 3 and level 4 is required.
