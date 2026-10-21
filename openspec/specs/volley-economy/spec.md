# Volley Economy Specification

## Purpose

Shots, volleys, block damage and destruction, and orb-driven volley growth (decisions A2, A3, A10, A11). Traces to HU-02 s1/s2, HU-03 s1, HU-04 s1-s3.

## Requirements

### Requirement: Shot equals volley (HU-03 s1/s2)

A shot MUST be one volley, one `Aiming`-to-`Resolving` cycle. `level.shots` MUST be the maximum. Shots used MUST increase by 1 when `FIRE` is accepted; shots left = `shots - used`.

#### Scenario: Count on fire
- GIVEN level 1 (`shots` 10), 0 used
- WHEN `FIRE` is accepted
- THEN shots used is 1 and shots left is 9

#### Scenario: Last shot
- GIVEN 9 of 10 shots used
- WHEN the 10th is fired and the turn resolves with cores remaining
- THEN shots left is 0 and state becomes `GameOver`

### Requirement: Volley size (HU-04 s2)

The initial volley size MUST be `startBalls`. The volley MUST emit exactly that many balls, in sequence, along the locked direction. Volley size MUST NOT exceed 50 in v1 (A10_v1_cap); volleys of up to 200 balls are deferred to the levels 8-10 spec.

#### Scenario: First volley
- GIVEN level 2 (`startBalls` 5)
- WHEN the first shot is fired
- THEN exactly 5 balls are emitted over `Firing`

### Requirement: Turn-end synchronization (HU-03 s1)

A turn MUST end only when `emitted == volleySize` and active balls == 0. A ball reaching the floor MUST be deactivated and released to the pool. The first landing x of the turn MUST become the next launcher x.

#### Scenario: Landing while emitting
- GIVEN volley 5, emitted 2, the first 2 balls landed
- WHEN the 2nd ball lands
- THEN the turn does not end

#### Scenario: Launcher shift
- GIVEN the first ball of a turn lands at `x = 700`
- WHEN the next `Aiming` starts
- THEN the launcher x is 700

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

### Requirement: Volley growth (HU-04 s2, A10)

At `Resolving`, the pending `K` MUST be added to the volley size of all following volleys of the level, capped at 50 in v1. The volley size MUST persist across turns until the level reloads or restarts.

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
