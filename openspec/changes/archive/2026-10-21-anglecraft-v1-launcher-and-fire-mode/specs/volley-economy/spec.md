# Delta for Volley Economy

## MODIFIED Requirements

### Requirement: Shot equals volley (HU-03 s1/s2, HU-11 AC3, AC6)

A shot (turn) MUST be one volley: the whole volley fired in one or more groups, from the first group's `FIRE` to `Resolving`. `level.shots` MUST be the maximum. Shots used MUST increase by 1 when the turn reaches `Resolving`; shots left = `shots - used`. Group ends inside a turn MUST NOT change shots used.
(Previously: shots used increased on FIRE; one FIRE fired the whole volley.)

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

### Requirement: Volley size (HU-04 s2, HU-11 AC2, AC7)

The volley size of a turn MUST be fixed when the turn starts (`startBalls`, grown by orbs at earlier `Resolving`s, capped at 50 in v1). Each `FIRE` MUST emit a group of `min(fireMode, balls left to fire in the turn)` balls, in sequence, along the locked direction, at the v1 emission interval. Balls fired across the groups of a turn MUST equal the volley size unless the level ends first.

#### Scenario: Group sizes
- GIVEN level 2 (`startBalls` 5), mode 2
- WHEN the player fires three groups
- THEN they emit 2, 2 and 1 balls

#### Scenario: Group limited by balls left
- GIVEN a turn with 2 balls left and mode 3
- WHEN `FIRE` is accepted
- THEN exactly 2 balls are emitted

### Requirement: Turn-end synchronization (HU-03 s1, D-11.3)

A group MUST end only when all its balls were emitted and active balls == 0. A turn MUST end when a group ends and either no ball of the turn is left to fire or all cores are destroyed. A ball reaching the floor MUST be deactivated and released to the pool. The first landing x of each group MUST become the launcher x for the next `Aiming` (within the turn or of the next turn).
(Previously: relocation once per turn.)

#### Scenario: Relocation after a group
- GIVEN mode 2 and the first ball of the first group lands at `x = 620`
- WHEN the group ends and `Aiming` starts
- THEN the launcher x is 620

#### Scenario: Landing while emitting
- GIVEN a group of 3, emitted 2, both landed
- WHEN the 2nd ball lands
- THEN the group does not end

### Requirement: Volley growth (HU-04 s2, A10, D-11.4)

Orb values captured in any group of a turn MUST accumulate as pending `K` and MUST be added at that turn's `Resolving` to the volley size of all following turns, capped at 50. The current turn's volley size MUST NOT change.
(Previously: same rule with one group per turn.)

#### Scenario: Orb in the first group
- GIVEN a turn of 5 balls, mode 1, and the first ball captures a `+2` orb
- WHEN the remaining 4 balls are fired
- THEN the turn ends after 5 balls in total and the next turn's volley is 7
