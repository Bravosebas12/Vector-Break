# Delta for Game State

## MODIFIED Requirements

### Requirement: Volley time cap (P3)

A group MUST end after 45 s of simulation time measured from its `FIRE`, excluding pause. When the cap is reached, all active balls of the group MUST be counted as landed, damage already dealt MUST be kept, and the group MUST end (group end or turn end per the FSM). The cap MUST NOT change the launcher x.

#### Scenario: Cap reached in a group
- GIVEN a group of 2 balls looping for 45 s of simulation time, with 3 balls of the turn left to fire
- WHEN the step runs
- THEN active balls are 0, state is `Aiming` and the launcher x is unchanged

#### Scenario: Cap after a landing
- GIVEN launcher x 540 and a group whose first ball lands at `x = 700` before the cap ends the rest
- WHEN the group ends
- THEN the launcher x is 540

#### Scenario: Pause excluded
- GIVEN a group at 40 s of simulation time
- WHEN the game is paused for 600 steps
- THEN the group has not ended
