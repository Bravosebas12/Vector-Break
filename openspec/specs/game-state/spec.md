# Game State Specification

## Purpose

Single FSM, input-to-action mapping, pause, restart and speed control. Traces to HU-01 s4, HU-03 s1/s4/s5, HU-05 s1/s3/s4/s5, HU-09 and the out-of-scope list (HU-07).

## Requirements

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

### Requirement: Input mapping (HU-01 s4, HU-05, HU-03 s5, HU-10, HU-11, HU-12)

The input layer MUST map events to actions: mousemove -> AIM, left mousedown or `Space` -> FIRE, `1|2|4` -> SET_SPEED, `R` -> RESTART, `P` -> PAUSE, `A` keydown -> MOVE_START(-1), `D` keydown -> MOVE_START(+1), `A` / `D` keyup -> MOVE_STOP(dir), `M` -> CYCLE_MODE, `N` -> SKIP. Letter keys MUST be case-insensitive. `R`, `P`, `M`, `A`, `D` and `N` MUST ignore key auto-repeat. Listeners (keydown and keyup) MUST be registered once at boot; on window blur every held key MUST be released. Right-click and `Esc` MUST do nothing in v1. In `Loading` every action MUST be ignored; in `Title` only a left mouse click MUST act. While paused only `PAUSE`, `RESTART` and `SKIP` MUST act.

#### Scenario: Auto-repeat ignored
- GIVEN `A` held, producing keydowns with `repeat = true`
- WHEN they arrive
- THEN only the first produces MOVE_START

#### Scenario: Blur releases keys
- GIVEN `D` held in `Aiming`
- WHEN the window loses focus
- THEN movement stops as if `D` were released

#### Scenario: Esc and right-click inert
- GIVEN any state
- WHEN `Esc` or the right mouse button is pressed
- THEN state, speed, mode and launcher are unchanged

#### Scenario: Input ignored in Loading
- GIVEN `Loading`
- WHEN FIRE, AIM, SET_SPEED, RESTART, PAUSE, MOVE_START, CYCLE_MODE and SKIP actions arrive
- THEN the state stays `Loading` and nothing else changes

#### Scenario: N held
- GIVEN level 1 in `Aiming`
- WHEN `N` is held, producing one keydown and then keydowns with `repeat = true`
- THEN exactly one level is skipped (level 2 is active)

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

### Requirement: Pause (HU-05 s5)

In `Aiming`, `Firing` or `Simulating`, `P` MUST freeze the simulation, show the pause overlay and preserve all state; `P` again MUST resume the previous state exactly.

#### Scenario: Freeze and resume
- GIVEN `Simulating` with ball positions `S0`
- WHEN `P` is pressed, 600 steps elapse, then `P` is pressed again
- THEN positions equal `S0` during pause and motion continues from `S0` afterwards

#### Scenario: Pause in Aiming
- GIVEN `Aiming`
- WHEN `P` is pressed
- THEN the overlay is shown and `FIRE` is ignored until resumed

### Requirement: Restart (HU-03 s4/s5)

`R` MUST reload the current level and set state `Aiming` from any gameplay state (`Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver`), within 500 ms. `R` MUST be ignored in `Loading` and `Title`. Shots, score, volley size and speed MUST return to level-start values.

#### Scenario: Restart mid-turn
- GIVEN `Simulating` with 2 shots used
- WHEN `R` is pressed
- THEN state is `Aiming`, shots used is 0 and all blocks are at their level HP

#### Scenario: Restart from GameOver
- GIVEN `GameOver`
- WHEN `R` is pressed
- THEN the level is reloaded in less than 500 ms and state is `Aiming`

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

### Requirement: Session start (HU-03 s3c)

Each session MUST start at level 1, regardless of stored records. There MUST be no level selector.

#### Scenario: Records present
- GIVEN `localStorage` holds a 3-star record for level 3
- WHEN the game opens and the title screen is clicked
- THEN level 1 is loaded

### Requirement: Fire mode (HU-11 AC1, AC9–AC11)

The session MUST hold a fire mode in {1, 2, 3}, reset to 1 whenever a level loads or restarts. `CYCLE_MODE` MUST change it 1 → 2 → 3 → 1 and `SET_MODE(v)` MUST set it; both MUST be accepted only in `Aiming` and not paused. Changing the mode MUST emit `UI_CLICK`. The speed keys MUST NOT change the mode.

#### Scenario: Cycle
- GIVEN `Aiming` with mode 1
- WHEN `M` is pressed three times
- THEN the mode reads 2, 3, then 1

#### Scenario: Locked in flight
- GIVEN `Simulating` with mode 2
- WHEN CYCLE_MODE or SET_MODE(1) arrives
- THEN the mode stays 2

#### Scenario: Reset on load
- GIVEN mode 3 on level 2
- WHEN `R` is pressed or level 3 loads
- THEN the mode is 1

### Requirement: Skip level (HU-12, D-12.1–D-12.4)

`SKIP` MUST load the following level immediately, with no confirmation, from `Aiming`, `Firing`, `Simulating`, `Resolving` and `GameOver`, also while paused. Balls in flight MUST be removed and pause cleared; the new level MUST start in `Aiming` with its initial values (turns, volley size, launcher at the level start, fire mode 1). The current turn MUST NOT be resolved. `SKIP` MUST do nothing on the last level and in `Loading`, `Title` and `Victory`. There MUST be no action that loads a previous level (D-12.3); only a page reload starts again from level 1.

#### Scenario: Skip from Aiming
- GIVEN level 2 in `Aiming` with 3 turns used and the launcher at x 300
- WHEN `N` is pressed
- THEN level 3 is in `Aiming` with 0 turns used, its `startBalls` volley, launcher x 540 and fire mode 1

#### Scenario: Skip with balls in flight
- GIVEN level 2 in `Simulating` with 4 balls in flight
- WHEN `N` is pressed
- THEN no ball is active and level 3 is in `Aiming`

#### Scenario: Skip while paused
- GIVEN level 2 paused
- WHEN `N` is pressed
- THEN level 3 is in `Aiming` and not paused

#### Scenario: Skip from defeat
- GIVEN the defeat of level 4
- WHEN `N` is pressed
- THEN level 5 is in `Aiming`

#### Scenario: Last level
- GIVEN level 6 in `Aiming`
- WHEN `N` is pressed
- THEN level 6 stays active and nothing changes

#### Scenario: Ignored in Victory and outside levels
- GIVEN `Victory` on level 2, or `Title`
- WHEN `N` is pressed
- THEN the state and level are unchanged

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

## Open Items

- OI-1: `P` in `Resolving`, `Victory` and `GameOver` is not defined (assumed ignored).
- OI-2: Resolved by HU-13: while paused `FIRE` and the speed keys are ignored (see "Simultaneous fire", scenario Paused).
- OI-3: Resolved by HU-13 (D-13.4): the emission interval and the minimum cadence between shots are both `EMIT_INTERVAL` = 1/12 s of simulation time.
- OI-4: Resolved by HU-09: `R` is ignored in `Loading` and `Title`; asset loading happens only once at boot, so restart never waits on it.
