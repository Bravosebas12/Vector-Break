# Delta for Game State

## MODIFIED Requirements

### Requirement: FSM states and transitions (HU-03 s1, HU-01 s4, HU-09, HU-11, HU-13)

One FSM MUST own flow with states `Loading`, `Title`, `Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver`. The FSM MUST start in `Loading`. Transitions MUST be: Loading -all assets settled-> Title; Title -left click-> Aiming (level 1 loaded, audio unlocked); Aiming -FIRE-> Firing; Simulating -FIRE (balls of the turn left)-> Firing; Firing -all balls of the group emitted-> Simulating; Simulating -no active balls and balls of the turn left to fire and cores remain-> Aiming (group end); Simulating -no active balls and no balls of the turn left to fire-> Resolving; Firing or Simulating -all cores destroyed-> Resolving (immediately, D-13.1); Firing or Simulating -turn time cap reached-> Resolving; Resolving -all cores destroyed-> Victory; Resolving -no shots left and cores remain-> GameOver; Resolving -otherwise-> Aiming. No transition MUST ever lead back to `Loading` or `Title` in v1. Illegal transitions MUST throw in dev.

#### Scenario: Group end returns to Aiming
- GIVEN `Simulating`, a turn of 5 balls with 2 fired and both landed, cores remaining
- WHEN the step runs
- THEN state is `Aiming`, the turn has 3 balls left to fire and shots used is unchanged

#### Scenario: Turn ends on its last ball
- GIVEN `Simulating`, a turn of 5 balls with 5 fired and 0 active
- WHEN the step runs
- THEN state is `Resolving`

#### Scenario: Victory the moment the last core falls
- GIVEN `Simulating`, a turn of 5 balls with 3 fired, 2 still in flight and the last core at 1 HP
- WHEN a ball destroys that core
- THEN in the same step no ball is active, state is `Resolving` and then `Victory`, and 2 balls were never fired

#### Scenario: Fire from Simulating
- GIVEN `Simulating` with a ball in flight and balls of the turn left to fire
- WHEN an accepted `FIRE` arrives
- THEN state is `Firing`

#### Scenario: Defeat
- GIVEN `Resolving` at the end of the last turn and 1 core active
- WHEN evaluated
- THEN state is `GameOver`

#### Scenario: Illegal transition
- GIVEN `Aiming`
- WHEN a transition to `Victory` is requested
- THEN an error is thrown

#### Scenario: Boot sequence
- GIVEN the page opens
- WHEN assets are still loading
- THEN the state is `Loading`; after all assets settle it is `Title`; after a left click it is `Aiming` on level 1

#### Scenario: Loading cannot skip Title
- GIVEN `Loading`
- WHEN a transition to `Aiming` is requested
- THEN an error is thrown

#### Scenario: Victory over game over
- GIVEN `Resolving`, 0 shots left and all cores destroyed
- WHEN evaluated
- THEN state is `Victory`

### Requirement: Speed keys (HU-05 s1/s3/s4, HU-13 S-13.2)

In `Firing` or `Simulating`, keys `1`, `2`, `4` MUST set the speed multiplier immediately. In `Aiming` they MUST NOT change it. The chosen speed MUST hold for the whole turn, between its groups included, and MUST reset to 1X when the next turn starts or a level loads, restarts or is skipped.

#### Scenario: Change in flight
- GIVEN `Simulating` at 1X
- WHEN `4` is pressed
- THEN the multiplier is 4 on the next step

#### Scenario: Ignored in Aiming
- GIVEN `Aiming` at 1X
- WHEN `2` is pressed
- THEN the multiplier stays 1

#### Scenario: Held between groups
- GIVEN mode 1, a turn of 5 balls, speed 4X set while the first ball flies
- WHEN that ball lands and the turn returns to `Aiming` with 4 balls left, and the next ball is fired
- THEN the multiplier is still 4

#### Scenario: Reset per turn
- GIVEN speed 4X during a turn
- WHEN the turn resolves and the next turn's `Aiming` starts
- THEN the multiplier is 1

### Requirement: Volley time cap (P3, HU-13 D-13.3, S-13.1)

A turn MUST end after 45 s of simulation time measured from its first `FIRE`, excluding pause. When the cap is reached, all active balls MUST be counted as landed, damage already dealt MUST be kept, the balls of the turn not fired yet MUST be lost, and the turn MUST resolve. The cap MUST NOT change the launcher x.

#### Scenario: Cap reached in a turn
- GIVEN a turn of 5 balls in mode 1, 2 fired and looping, 45 s of simulation time after the turn's first `FIRE`
- WHEN the step runs
- THEN active balls are 0, the 3 unfired balls are lost, the turn resolves and shots used grows by 1

#### Scenario: Cap measured from the first shot
- GIVEN a turn whose first `FIRE` was 40 s of simulation time ago and whose latest `FIRE` was 1 s ago
- WHEN 5 more seconds of simulation time pass with balls still looping
- THEN the turn resolves by the cap

#### Scenario: Cap after a landing
- GIVEN launcher x 540 and a turn whose first ball lands at `x = 700` before the cap ends the rest
- WHEN the turn resolves
- THEN the launcher x is 540

#### Scenario: Pause excluded
- GIVEN a turn at 40 s of simulation time
- WHEN the game is paused for 600 steps
- THEN the turn has not ended

## ADDED Requirements

### Requirement: Simultaneous fire (HU-13 AC1, AC3, AC6–AC8, AC11, D-13.4)

`FIRE` MUST be accepted in `Aiming`, `Firing` and `Simulating`, not paused, when all hold: there is a valid aim, the turn has balls left to fire, the previous group of the turn has emitted all its balls, and at least `EMIT_INTERVAL` (1/12 s) of simulation time has passed since the previous `FIRE` of the turn. Otherwise `FIRE` MUST change nothing. Each accepted `FIRE` emits one group in the current fire mode (`min(mode, balls left)`). The fire mode MUST stay locked while balls are in flight (HU-11). Balls in flight MUST never exceed the v1 cap of 50, which the turn's volley size (<= 50) guarantees.

#### Scenario: Fire with a ball in flight
- GIVEN a turn of 5 balls, mode 1, the first ball in flight
- WHEN the player clicks 0.1 s of simulation time later
- THEN the second ball leaves at once and 3 balls are left to fire in the turn

#### Scenario: Respects the fire mode
- GIVEN mode 2, a group of 2 in flight and 3 balls left
- WHEN the player fires
- THEN 2 more balls leave; the next `FIRE` emits the last 1

#### Scenario: No balls left
- GIVEN the 5 balls of the turn fired and some still in flight
- WHEN the player clicks
- THEN no ball leaves and the state does not change

#### Scenario: Cadence
- GIVEN a group just fired and balls left to fire
- WHEN the player fires again 0.05 s of simulation time later
- THEN that `FIRE` is ignored; a `FIRE` 0.09 s after the first one emits the next group

#### Scenario: Group still emitting
- GIVEN mode 3 and a group that has emitted 2 of its 3 balls
- WHEN `FIRE` arrives
- THEN it is ignored and the group finishes with 3 balls

#### Scenario: Paused
- GIVEN the game paused with balls in flight and balls left
- WHEN the player clicks
- THEN no ball leaves

#### Scenario: Mode locked in flight
- GIVEN mode 2 and balls in flight
- WHEN `M` is pressed
- THEN the mode stays 2
