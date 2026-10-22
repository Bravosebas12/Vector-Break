# Delta for Game State

## MODIFIED Requirements

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

## ADDED Requirements

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
