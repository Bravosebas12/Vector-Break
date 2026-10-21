# Game State Specification

## Purpose

Single FSM, input-to-action mapping, pause, restart and speed control. Traces to HU-01 s4, HU-03 s1/s4/s5, HU-05 s1/s3/s4/s5, HU-09 and the out-of-scope list (HU-07).

## Requirements

### Requirement: FSM states and transitions (HU-03 s1, HU-01 s4, HU-09)

One FSM MUST own flow with states `Loading`, `Title`, `Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver`. The FSM MUST start in `Loading`. Transitions MUST be: Loading -all assets settled-> Title; Title -left click-> Aiming (level 1 loaded, audio unlocked); Aiming -FIRE-> Firing; Firing -all volley balls emitted-> Simulating; Simulating -no active balls-> Resolving; Resolving -all cores destroyed-> Victory; Resolving -no shots left and cores remain-> GameOver; Resolving -otherwise-> Aiming. No transition MUST ever lead back to `Loading` or `Title` in v1. Illegal transitions MUST throw in dev.

#### Scenario: Boot sequence
- GIVEN the page opens
- WHEN assets are still loading
- THEN the state is `Loading`; after all assets settle it is `Title`; after a left click it is `Aiming` on level 1

#### Scenario: Loading cannot skip Title
- GIVEN `Loading`
- WHEN a transition to `Aiming` is requested
- THEN an error is thrown

#### Scenario: Turn continues
- GIVEN `Firing` with 3 of 5 balls emitted and 0 active balls
- WHEN a ball lands
- THEN state remains `Firing` or `Simulating`, never `Resolving`

#### Scenario: Turn ends
- GIVEN `Simulating`, volley size 5, emitted 5, active 0
- WHEN the step runs
- THEN state is `Resolving`

#### Scenario: Victory over game over
- GIVEN `Resolving`, 0 shots left and all cores destroyed
- WHEN evaluated
- THEN state is `Victory`

#### Scenario: Defeat
- GIVEN `Resolving`, 0 shots left and 1 core active
- WHEN evaluated
- THEN state is `GameOver`

#### Scenario: Illegal transition
- GIVEN `Aiming`
- WHEN a transition to `Victory` is requested
- THEN an error is thrown

### Requirement: Input mapping (HU-01 s4, HU-05, HU-03 s5)

The input layer MUST map events to actions: mousemove -> AIM, left mousedown or `Space` -> FIRE, `1|2|4` -> SET_SPEED, `R` -> RESTART, `P` -> PAUSE. `R` and `P` MUST ignore key auto-repeat. Listeners MUST be registered once at boot. Right-click and `Esc` MUST do nothing in v1. In `Loading` every action MUST be ignored; in `Title` only a left mouse click MUST act (it starts the game, see `start-screen`), and every other action MUST be ignored.

#### Scenario: Input ignored in Loading
- GIVEN `Loading`
- WHEN FIRE, AIM, SET_SPEED, RESTART and PAUSE actions arrive
- THEN the state stays `Loading` and nothing else changes

#### Scenario: Auto-repeat ignored
- GIVEN `R` held with `repeat = true`
- WHEN repeated keydowns arrive
- THEN only the first triggers a restart

#### Scenario: Esc and right-click inert
- GIVEN any state
- WHEN `Esc` is pressed or the right mouse button is pressed
- THEN state and speed are unchanged and no menu or cancel occurs

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

A volley MUST end after 45 s of simulation time measured from `FIRE`, excluding pause. When the cap is reached, all remaining balls MUST be counted as landed, damage already dealt MUST be kept, and the turn MUST proceed to `Resolving`. Balls ended by the cap MUST NOT count as landings for the next launcher x.

#### Scenario: Cap reached
- GIVEN `Simulating` with 3 balls looping and 45 s of volley simulation time elapsed
- WHEN the step runs
- THEN active balls are 0, state is `Resolving` and block HP reflects all damage dealt before the cap

#### Scenario: Launcher unchanged when none landed
- GIVEN a volley in which no ball reached the floor before the cap, with launcher x 540
- WHEN the next `Aiming` starts
- THEN the launcher x is 540

#### Scenario: Pause excluded
- GIVEN a volley at 40 s of simulation time
- WHEN the game is paused for 600 steps
- THEN the volley has not ended

### Requirement: Session start (HU-03 s3c)

Each session MUST start at level 1, regardless of stored records. There MUST be no level selector.

#### Scenario: Records present
- GIVEN `localStorage` holds a 3-star record for level 3
- WHEN the game opens and the title screen is clicked
- THEN level 1 is loaded

## Open Items

- OI-1: `P` in `Resolving`, `Victory` and `GameOver` is not defined (assumed ignored).
- OI-2: Speed keys and `FIRE` while paused are not defined (assumed ignored).
- OI-3: Emission interval between balls in `Firing` (skill gives 0.08 s as an example) is not confirmed.
- OI-4: Resolved by HU-09: `R` is ignored in `Loading` and `Title`; asset loading happens only once at boot, so restart never waits on it.
