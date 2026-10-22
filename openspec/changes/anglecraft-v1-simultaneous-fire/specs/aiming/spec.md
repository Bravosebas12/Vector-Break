# Delta for Aiming

## MODIFIED Requirements

### Requirement: Aim only in Aiming (HU-01 s1, HU-13 AC2)

Cursor movement MUST update the aim and the preview whenever the next `FIRE` could be accepted by state: in `Aiming`, and in `Firing` / `Simulating` while the turn has balls left to fire, not paused. With no balls left to fire, while paused and in every other state no preview is shown.

#### Scenario: Aim in flight
- GIVEN `Simulating` with balls in flight and balls of the turn left to fire
- WHEN the cursor moves
- THEN the preview follows it and the next `FIRE` uses that direction

#### Scenario: Not aiming
- GIVEN `Simulating` with every ball of the turn already fired
- WHEN the cursor moves
- THEN no aim preview is produced

### Requirement: Fire locks direction (HU-01 s4, HU-13)

When `FIRE` is accepted (see game-state "Simultaneous fire"), left-click or `Space` MUST lock the direction and the launcher x of that group and transition to `Firing`. Every ball of the group MUST leave from the locked x along the locked direction, even if the aim or the launcher change while it emits. `Space` default behavior MUST be prevented.

#### Scenario: Click fire
- GIVEN `Aiming` with direction `(0.6, -0.8)`
- WHEN left mouse button is pressed
- THEN state is `Firing` and the locked direction is `(0.6, -0.8)`

#### Scenario: Space fire
- GIVEN `Aiming`
- WHEN `Space` is pressed
- THEN state is `Firing` and the page does not scroll

#### Scenario: Group keeps its origin
- GIVEN mode 3, a group fired from x 540
- WHEN `D` is held while the group emits
- THEN all 3 balls of the group leave from x 540

#### Scenario: Fire with nothing left ignored
- GIVEN state `Simulating` with every ball of the turn fired
- WHEN left mouse button is pressed
- THEN no new group starts

### Requirement: Launcher movement (HU-10, HU-13 D-13.2, HU-14, D-10.2, D-10.3, D-14.1)

In `Aiming`, `Firing` and `Simulating`, not paused, a held `A` MUST move the launcher left and a held `D` right at 480 px/s of play time (independent of the speed multiplier), integrated on the fixed step. If a key is released having moved the launcher less than 8 px since its keydown, the launcher MUST be moved to exactly 8 px from where it was at that keydown (tap rule). With both keys held the launcher MUST NOT move; releasing one resumes the other. The launcher x MUST stay within `[50, 1030]` and MUST stop at the bound while the key stays held. Movement MUST NOT happen while paused or in any other state; a key held through `FIRE` keeps moving the launcher. Moving the launcher MUST NOT change the trajectory of balls already in flight.

During play only `A` / `D` MUST change the launcher x. Loading a level (start, next level, or a level skip) and restart (`R`) MUST set it to the level's starting x (`launcher.x` × board width).

#### Scenario: Hold left
- GIVEN `Aiming`, launcher x 540
- WHEN `A` is held for 0.5 s of play time
- THEN launcher x is 300 (±2)

#### Scenario: Hold right from a kept position
- GIVEN `Aiming`, launcher x 300 kept from the previous turn
- WHEN `D` is held for 0.5 s of play time
- THEN launcher x is 540 (±2)

#### Scenario: Tap
- GIVEN `Aiming`, launcher x 540
- WHEN `D` is pressed and released within one step
- THEN launcher x is 548

#### Scenario: Edge
- GIVEN `Aiming`, launcher x 100
- WHEN `A` is held for 2 s
- THEN launcher x is 50 throughout the last second

#### Scenario: Opposite keys
- GIVEN `Aiming`, launcher x 540
- WHEN `A` and `D` are both held for 0.5 s
- THEN launcher x is 540

#### Scenario: Move in flight
- GIVEN `Simulating` with balls in flight, launcher x 540
- WHEN `D` is held for 0.5 s of play time
- THEN launcher x is 780 (±2), the next group leaves from there and the balls in flight keep their trajectories

#### Scenario: Ignored while paused
- GIVEN paused with balls in flight, launcher x 540
- WHEN `A` is held for 0.5 s
- THEN launcher x is 540

#### Scenario: Restart returns to the start
- GIVEN level 2 and launcher x 300
- WHEN `R` is pressed
- THEN launcher x is 540

#### Scenario: Next level starts at its start
- GIVEN level 1 won with launcher x 300
- WHEN level 2 is loaded
- THEN launcher x is 540
