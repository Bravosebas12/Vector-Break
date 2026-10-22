# Game State Specification

## Purpose

Single FSM, input-to-action mapping, pause, restart and speed control. Traces to HU-01 s4, HU-03 s1/s4/s5, HU-05 s1/s3/s4/s5, HU-09 and the out-of-scope list (HU-07).

## Requirements

### Requirement: FSM states and transitions (HU-03 s1, HU-01 s4, HU-09, HU-11)

One FSM MUST own flow with states `Loading`, `Title`, `Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver`. The FSM MUST start in `Loading`. Transitions MUST be: Loading -all assets settled-> Title; Title -left click-> Aiming (level 1 loaded, audio unlocked); Aiming -FIRE-> Firing; Firing -all balls of the group emitted-> Simulating; Simulating -no active balls and balls of the turn left to fire and cores remain-> Aiming (group end); Simulating -no active balls and (no balls of the turn left to fire or all cores destroyed)-> Resolving; Resolving -all cores destroyed-> Victory; Resolving -no shots left and cores remain-> GameOver; Resolving -otherwise-> Aiming. No transition MUST ever lead back to `Loading` or `Title` in v1. Illegal transitions MUST throw in dev.

#### Scenario: Group end returns to Aiming
- GIVEN `Simulating`, a turn of 5 balls with 2 fired and both landed, cores remaining
- WHEN the step runs
- THEN state is `Aiming`, the turn has 3 balls left to fire and shots used is unchanged

#### Scenario: Turn ends on its last ball
- GIVEN `Simulating`, a turn of 5 balls with 5 fired and 0 active
- WHEN the step runs
- THEN state is `Resolving`

#### Scenario: Victory mid-turn
- GIVEN `Simulating`, a turn of 5 balls with 1 fired, 0 active and all cores destroyed
- WHEN the step runs
- THEN state is `Resolving` and then `Victory`, with 4 balls never fired

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

### Requirement: Input mapping (HU-01 s4, HU-05, HU-03 s5, HU-10, HU-11)

The input layer MUST map events to actions: mousemove -> AIM, left mousedown or `Space` -> FIRE, `1|2|4` -> SET_SPEED, `R` -> RESTART, `P` -> PAUSE, `A` keydown -> MOVE_START(-1), `D` keydown -> MOVE_START(+1), `A` / `D` keyup -> MOVE_STOP(dir), `M` -> CYCLE_MODE. Letter keys MUST be case-insensitive. `R`, `P`, `M`, `A` and `D` MUST ignore key auto-repeat. Listeners (keydown and keyup) MUST be registered once at boot; on window blur every held key MUST be released. Right-click and `Esc` MUST do nothing in v1. In `Loading` every action MUST be ignored; in `Title` only a left mouse click MUST act.

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
- WHEN FIRE, AIM, SET_SPEED, RESTART, PAUSE, MOVE_START and CYCLE_MODE actions arrive
- THEN the state stays `Loading` and nothing else changes

### Requirement: Speed keys (HU-05 s1/s3/s4)

In `Firing` or `Simulating`, keys `1`, `2`, `4` MUST set the speed multiplier immediately. In `Aiming` they MUST NOT change it. Entering `Aiming` MUST reset the multiplier to 1X.

#### Scenario: Change in flight
- GIVEN `Simulating` at 1X
- WHEN `4` is pressed
- THEN the multiplier is 4 on the next step

#### Scenario: Ignored in Aiming
- GIVEN `Aiming` at 1X
- WHEN `2` is pressed
- THEN the multiplier stays 1

#### Scenario: Reset per turn
- GIVEN speed 4X during a turn
- WHEN the next `Aiming` is entered
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

## Open Items

- OI-1: `P` in `Resolving`, `Victory` and `GameOver` is not defined (assumed ignored).
- OI-2: Speed keys and `FIRE` while paused are not defined (assumed ignored).
- OI-3: Emission interval between balls in `Firing` (skill gives 0.08 s as an example) is not confirmed.
- OI-4: Resolved by HU-09: `R` is ignored in `Loading` and `Title`; asset loading happens only once at boot, so restart never waits on it.
