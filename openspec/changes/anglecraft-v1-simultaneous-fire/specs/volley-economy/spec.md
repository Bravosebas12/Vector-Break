# Delta for Volley Economy

## MODIFIED Requirements

### Requirement: Volley size (HU-04 s2, HU-11 AC2, AC7, HU-13)

The volley size of a turn MUST be fixed when the turn starts (`startBalls`, grown by orbs at earlier `Resolving`s, capped at 50 in v1). Each `FIRE` MUST emit a group of `min(fireMode, balls left to fire in the turn)` balls, in sequence, from the locked launcher x along the locked direction, at the v1 emission interval (`EMIT_INTERVAL`, 1/12 s of simulation time). Groups of a turn MUST NOT interleave: a group starts only after the previous one has emitted all its balls. Balls fired across the groups of a turn MUST equal the volley size unless the level ends or the turn time cap is reached first. Mode 1 fired every `EMIT_INTERVAL` along one direction MUST emit exactly like the whole v1 volley.

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

#### Scenario: Rapid mode 1 equals the v1 volley
- GIVEN the same level, seed, launcher x and angle
- WHEN one session fires the volley in `'turn'` mode and another fires it in mode 1 with a `FIRE` every `EMIT_INTERVAL`
- THEN both sessions have the same ball positions, block HP and score after every step

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
