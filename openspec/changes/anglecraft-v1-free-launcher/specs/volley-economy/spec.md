# Delta for Volley Economy

## MODIFIED Requirements

### Requirement: Turn-end synchronization (HU-03 s1, HU-14)

A group MUST end only when all its balls were emitted and active balls == 0. A turn MUST end when a group ends and either no ball of the turn is left to fire or all cores are destroyed. A ball reaching the floor MUST be deactivated and released to the pool. Landing balls MUST NOT change the launcher x: between groups and between turns the launcher MUST stay where the player left it (HU-14, supersedes D-10.1 and D-11.3).

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
