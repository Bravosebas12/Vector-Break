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

### Requirement: Aim only in Aiming (HU-01 s1)

Cursor movement MUST update the preview only in `Aiming`; no preview is shown in other states.

#### Scenario: Not aiming
- GIVEN state `Simulating`
- WHEN the cursor moves
- THEN no aim preview is produced

### Requirement: Fire locks direction (HU-01 s4)

In `Aiming` with a valid angle, left-click or `Space` MUST lock the direction and transition to `Firing`. `Space` default behavior MUST be prevented.

#### Scenario: Click fire
- GIVEN `Aiming` with direction `(0.6, -0.8)`
- WHEN left mouse button is pressed
- THEN state is `Firing` and the locked direction is `(0.6, -0.8)`

#### Scenario: Space fire
- GIVEN `Aiming`
- WHEN `Space` is pressed
- THEN state is `Firing` and the page does not scroll

#### Scenario: Fire outside Aiming ignored
- GIVEN state `Simulating`
- WHEN left mouse button is pressed
- THEN no new volley starts

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

## Open Items

- OI-1: Fixed length of the reflected preview segment is not specified.
- OI-2: Whether the launcher x shifts after a volley affects aim origin (see `volley-economy`).
- OI-3: Whether a cursor below the launcher line (non-upward aim) is a valid angle is not stated.
