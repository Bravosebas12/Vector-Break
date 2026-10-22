# Delta for Game State

## MODIFIED Requirements

### Requirement: FSM states and transitions (HU-03 s1, HU-01 s4, HU-09, HU-11)

One FSM MUST own flow with states `Loading`, `Title`, `Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver`. The FSM MUST start in `Loading`. Transitions MUST be: Loading -all assets settled-> Title; Title -left click-> Aiming (level 1 loaded, audio unlocked); Aiming -FIRE-> Firing; Firing -all balls of the group emitted-> Simulating; Simulating -no active balls and balls of the turn left to fire and cores remain-> Aiming (group end); Simulating -no active balls and (no balls of the turn left to fire or all cores destroyed)-> Resolving; Resolving -all cores destroyed-> Victory; Resolving -no shots left and cores remain-> GameOver; Resolving -otherwise-> Aiming. No transition MUST ever lead back to `Loading` or `Title` in v1. Illegal transitions MUST throw in dev.
(Previously: Firing ended when the whole volley was emitted and Simulating always went to Resolving.)

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

### Requirement: Input mapping (HU-01 s4, HU-05, HU-03 s5, HU-10, HU-11)

The input layer MUST map events to actions: mousemove -> AIM, left mousedown or `Space` -> FIRE, `1|2|4` -> SET_SPEED, `R` -> RESTART, `P` -> PAUSE, `A` keydown -> MOVE_START(-1), `D` keydown -> MOVE_START(+1), `A` / `D` keyup -> MOVE_STOP(dir), `M` -> CYCLE_MODE. Letter keys MUST be case-insensitive. `R`, `P`, `M`, `A` and `D` MUST ignore key auto-repeat. Listeners (keydown and keyup) MUST be registered once at boot; on window blur every held key MUST be released. Right-click and `Esc` MUST do nothing in v1. In `Loading` every action MUST be ignored; in `Title` only a left mouse click MUST act.
(Previously: no A, D, M or key release.)

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

### Requirement: Volley time cap (P3)

A group MUST end after 45 s of simulation time measured from its `FIRE`, excluding pause. When the cap is reached, all active balls of the group MUST be counted as landed, damage already dealt MUST be kept, and the group MUST end (group end or turn end per the FSM). Balls ended by the cap MUST NOT count as landings for the next launcher x.
(Previously: measured per volley.)

#### Scenario: Cap reached in a group
- GIVEN a group of 2 balls looping for 45 s of simulation time, with 3 balls of the turn left to fire
- WHEN the step runs
- THEN active balls are 0, state is `Aiming` and the launcher x is unchanged

## ADDED Requirements

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
