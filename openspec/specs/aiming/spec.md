# Aiming Specification

## Purpose

Predictive aim preview with exactly one bounce, angle clamp, and fire command. Traces to HU-01 s1-s4 and HU-06 s1/s2 (reachability via preview).

## Requirements

### Requirement: First-contact projection (HU-01 s1)

In `Aiming`, when the cursor moves, the system MUST compute the path from the launcher along the aim direction to the first contact with any wall or block of any type, using the same collision geometry as the simulation (ball expanded by its radius). The path MUST be drawn.

#### Scenario: Hits a block
- GIVEN `Aiming`, launcher at `(540, 956)`, a block occupying the cell `(4,1)` and nothing in between
- WHEN the cursor is at `(540, 100)`
- THEN the preview ends at the block's bottom face offset by the ball radius, with normal `(0, 1)`

#### Scenario: Hits a wall
- GIVEN `Aiming` and an empty column to the left
- WHEN the cursor points up-left
- THEN the preview ends at the left wall offset by the ball radius

#### Scenario: Titanium counts
- GIVEN an `indestructible` block first in line
- WHEN the preview is computed
- THEN it ends at that block like any other surface

### Requirement: Single reflected segment (HU-01 s2)

From contact point `P` with normal `N`, the system MUST draw one segment of fixed length along `R = u - 2(u.n)n`. The system MUST NOT draw a second bounce.

#### Scenario: One bounce
- GIVEN direction `u = (0.6, -0.8)` hitting normal `(0, 1)`
- WHEN the preview is computed
- THEN the reflected segment direction is `(0.6, 0.8)` and its length equals the fixed constant

#### Scenario: Reflected segment hits a surface
- GIVEN a reflected segment that would reach another wall
- WHEN drawn
- THEN it is still of fixed length and no further segment exists

### Requirement: Angle clamp (HU-01 s3)

When `|dir.y| < 0.05` the direction MUST be limited so `|dir.y| = 0.05`, preserving the horizontal sign and unit length.

#### Scenario: Near horizontal
- GIVEN cursor producing direction `(0.9999, -0.01)`
- WHEN the aim is computed
- THEN `dir.y` is `-0.05` and the vector length is 1 within 1e-9

#### Scenario: Valid angle untouched
- GIVEN direction `(0.6, -0.8)`
- WHEN the aim is computed
- THEN the direction is unchanged

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

### Requirement: Reachability checking (HU-06 s1/s2, HU-08 s4)

A reachability query MUST report whether a given target cell is reachable from some valid launcher angle with at most one wall or block bounce, using the same raycaster.

#### Scenario: Reachable
- GIVEN level 1 loaded
- WHEN the query targets the core trap entry cell `(3,2)`
- THEN it returns at least one angle with a path of at most 1 bounce

#### Scenario: Blocked
- GIVEN a trap entry fully sealed by `indestructible` blocks
- WHEN the query runs
- THEN it returns no angle

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

### Requirement: Preview from the moved launcher (HU-10 AC2, AC3, AC8, HU-14 AC6)

The aim preview and the fired group MUST originate at the current launcher x. When the launcher moves, the preview MUST be recomputed in the same frame from the new origin toward the current pointer target. When balls land, the preview origin and its target MUST NOT change.

#### Scenario: Group origin
- GIVEN the launcher moved from 540 to 300 in `Aiming`
- WHEN `FIRE` is accepted
- THEN every ball of the group starts at x 300

#### Scenario: Stable preview after landing
- GIVEN launcher x 300 and the pointer on a board point P
- WHEN the group's balls land elsewhere and `Aiming` starts with the pointer unmoved
- THEN the preview starts at x 300 and points at P with the same direction as before the shot

## Open Items

- OI-1: Fixed length of the reflected preview segment is not specified.
- OI-2: Resolved by HU-14: the launcher x never shifts after a group or a turn; the aim origin changes only with `A` / `D`, level load and restart.
- OI-3: Whether a cursor below the launcher line (non-upward aim) is a valid angle is not stated.
