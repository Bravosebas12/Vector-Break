# Volley Economy Specification

## Purpose

Shots, volleys, block damage and destruction, and orb-driven volley growth (decisions A2, A3, A10, A11). Traces to HU-02 s1/s2, HU-03 s1, HU-04 s1-s3.

## Requirements

### Requirement: Shot equals volley (HU-03 s1/s2, HU-11 AC3, AC6)

A shot (turn) MUST be one volley: the whole volley fired in one or more groups, from the first group's `FIRE` to `Resolving`. `level.shots` MUST be the maximum. Shots used MUST increase by 1 when the turn reaches `Resolving`; shots left = `shots - used`. Group ends inside a turn MUST NOT change shots used.

#### Scenario: Count at turn end
- GIVEN level 2 (`shots` 12), 3 used, a turn with 1 ball left to fire
- WHEN that ball is fired and lands
- THEN shots used is 4

#### Scenario: No count between groups
- GIVEN level 2, 0 used, mode 2
- WHEN the first group lands and state returns to `Aiming`
- THEN shots used is still 0

#### Scenario: Last shot
- GIVEN 9 of 10 shots used
- WHEN the last ball of the 10th turn lands with cores remaining
- THEN shots left is 0 and state becomes `GameOver`

### Requirement: Volley size (HU-04 s2, HU-11 AC2, AC7, HU-13)

The volley size of a turn MUST be fixed when the turn starts (`startBalls`, grown by orbs at earlier `Resolving`s, capped at 50 in v1). Each `FIRE` MUST emit a group of `min(fireMode, balls left to fire in the turn)` balls, in sequence, from the locked launcher x along the locked direction, at the v1 emission interval (`EMIT_INTERVAL`, 1/12 s of simulation time). Groups of a turn MUST NOT interleave: a group starts only after the previous one has emitted all its balls. Balls fired across the groups of a turn MUST equal the volley size unless the level ends or the turn time cap is reached first. Mode 1 fired every `EMIT_INTERVAL` along one direction MUST emit like the whole v1 volley, each ball at most one fixed step later (a `FIRE` arrives between steps; v1 emits inside a step).

#### Scenario: Group sizes
- GIVEN level 2 (`startBalls` 5), mode 2
- WHEN the player fires three groups
- THEN they emit 2, 2 and 1 balls

#### Scenario: Group limited by balls left
- GIVEN a turn with 2 balls left and mode 3
- WHEN `FIRE` is accepted
- THEN exactly 2 balls are emitted

#### Scenario: First volley
- GIVEN level 2 (`startBalls` 5)
- WHEN the first turn is played in any fire mode
- THEN exactly 5 balls are emitted over the turn's groups

#### Scenario: Rapid mode 1 follows the v1 volley
- GIVEN the same level, seed, launcher x and angle
- WHEN one session fires the volley in `'turn'` mode and another fires it in mode 1 with a `FIRE` every `EMIT_INTERVAL`
- THEN every ball of the mode-1 session leaves 0 or 1 step after the same ball of the `'turn'` session

### Requirement: Turn-end synchronization (HU-03 s1, HU-13, HU-14)

A group MUST end only when all its balls were emitted and active balls == 0. A turn MUST end when no ball of the turn is left to fire and active balls == 0, when all cores are destroyed (immediately, removing the balls in flight, D-13.1), or when the turn time cap is reached. A ball reaching the floor MUST be deactivated and released to the pool. Landing balls MUST NOT change the launcher x: between groups and between turns the launcher MUST stay where the player left it (HU-14, supersedes D-10.1 and D-11.3).

#### Scenario: Fixed after a group
- GIVEN mode 1, launcher x 300, a turn with balls left, and a shot at 60° whose ball lands at `x = 875`
- WHEN the group ends and `Aiming` starts
- THEN the launcher x is 300

#### Scenario: Fixed across turns
- GIVEN launcher x 300 and the last ball of a turn landing at `x = 875`
- WHEN the turn resolves and the next turn's `Aiming` starts
- THEN the launcher x is 300

#### Scenario: Fixed in every mode
- GIVEN launcher x 300 and mode 2 or 3
- WHEN each group of the turn lands
- THEN the launcher x is 300 at every `Aiming` of the turn

#### Scenario: Landing while emitting
- GIVEN a group of 3, emitted 2, both landed
- WHEN the 2nd ball lands
- THEN the group does not end

#### Scenario: Turn ends with the last ball in flight
- GIVEN every ball of the turn fired simultaneously and 2 still in flight
- WHEN the last of them lands
- THEN the turn resolves (orbs, victory or defeat) and shots used grows by 1

#### Scenario: Victory removes the balls in flight
- GIVEN 3 balls in flight and 2 balls left to fire
- WHEN one ball destroys the last core
- THEN no ball is active, the 2 balls are never fired and the level is won

### Requirement: Block damage and destruction (HU-02 s1/s2)

A ball hit on a damageable block (`standard`, `reinforced`, `core`) MUST reduce its HP and the displayed number in real time. At HP 0 the block MUST be destroyed and its cell MUST be free immediately for the remaining balls. Total damage MUST accumulate for scoring.

#### Scenario: Consecutive hits
- GIVEN a core with HP 300 hit by 3 balls (damage per hit d)
- WHEN the hits resolve
- THEN HP is `300 - 3d`

#### Scenario: Destruction opens path
- GIVEN a standard block with HP 1 and a second ball behind the first
- WHEN the first ball destroys it
- THEN the second ball passes through the freed cell

#### Scenario: Overkill
- GIVEN a block with HP 1 hit by two balls in the same substep
- WHEN resolved
- THEN HP is not below 0 and the block is destroyed once

### Requirement: Orb capture (HU-04 s1/s3)

On first touch of a `multiplier` orb with value `V` by any ball, the ball MUST pass through without bouncing, the orb MUST be removed and `+V` pending balls MUST be registered. If several balls touch it in the same substep the value MUST be added once.

#### Scenario: Pass through
- GIVEN an orb `V = 2` on a ball's path
- WHEN the ball reaches it
- THEN direction and speed are unchanged and the orb is gone

#### Scenario: Same-substep touch
- GIVEN 3 balls overlap an orb with `V = 2` in one substep
- WHEN resolved
- THEN pending is exactly 2

### Requirement: Volley growth (HU-04 s2, A10, D-11.4)

Orb values captured in any group of a turn MUST accumulate as pending `K` and MUST be added at that turn's `Resolving` to the volley size of all following turns, capped at 50. The current turn's volley size MUST NOT change.

#### Scenario: Orb in the first group
- GIVEN a turn of 5 balls, mode 1, and the first ball captures a `+2` orb
- WHEN the remaining 4 balls are fired
- THEN the turn ends after 5 balls in total and the next turn's volley is 7

#### Scenario: Growth
- GIVEN level 3 (`startBalls` 8) and a turn capturing both orbs (`K = 4`)
- WHEN the turn resolves
- THEN every later volley is 12 balls

#### Scenario: Cap
- GIVEN volley size 48 and `K = 5`
- WHEN the turn resolves
- THEN the next volley is 50

#### Scenario: Reset on restart
- GIVEN volley size 12
- WHEN `R` is pressed
- THEN volley size is `startBalls` and removed orbs return

### Requirement: Orb visuals contract (A11, HU-04 s3)

The orb MUST show the `+V` label. Asset names `orb_splitter` and `sfx_orb_split` MUST be kept.

#### Scenario: Label
- GIVEN an orb `V = 2`
- WHEN rendered
- THEN `+2` is visible on it

## Open Items

- OI-1: Damage per ball hit is not stated (scenarios use symbol d; assumed 1).
- OI-2: Ball emission interval and floor y (launch line 956 vs board bottom) for "reaches the floor" are not stated.
- OI-3: Whether orbs captured in a turn that ends in `Victory`/`GameOver` matter is moot but unspecified.
