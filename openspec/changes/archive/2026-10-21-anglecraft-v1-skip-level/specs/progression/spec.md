# Delta for Progression

## MODIFIED Requirements

### Requirement: Unlock (HU-06 s5, HU-03 s3, HU-12)

Through Siguiente nivel, level N+1 MUST be unavailable until level N has been won; winning level N MUST enable access to level N+1. Skipping (HU-12) MUST load level N+1 without a win and MUST NOT count as a win of level N.

#### Scenario: Locked
- GIVEN level 1 not won
- WHEN access to level 2 is attempted through Siguiente nivel
- THEN it is refused

#### Scenario: Unlock
- GIVEN level 1 won
- WHEN Siguiente nivel is used
- THEN level 2 loads

#### Scenario: Skip does not unlock like a win
- GIVEN level 1 skipped and level 2 active
- WHEN level 2 is won and Siguiente nivel is used
- THEN level 3 loads, and level 1 still has no record

## ADDED Requirements

### Requirement: Skip without classification (HU-12 AC4, AC5, AC9, D-12.5)

A skipped level MUST NOT produce stars, score, a record or the victory feedback. A stored record MUST never change because of a skip. A skipped level without a record MUST be marked "sin resolver" and the mark MUST persist in `localStorage` under keys prefixed `anglecraft`; a later win of that level MUST store its record normally and clear the mark. Each level's status MUST be one of `resolved` (has a record), `unsolved` (skipped, no record) or `unplayed`. Storage failures MUST NOT stop the game.

#### Scenario: No classification
- GIVEN level 2 without a record
- WHEN it is skipped
- THEN no record is stored for level 2, no `STARS` or victory state is emitted, and its status is `unsolved`

#### Scenario: Record kept
- GIVEN level 2 with a record of 2 stars and 900 points
- WHEN it is played again and skipped
- THEN the record is still 2 stars and 900 points and its status is `resolved`

#### Scenario: Win after skip
- GIVEN level 3 marked `unsolved`
- WHEN it is later won with 1 star
- THEN its record is stored and its status is `resolved`

#### Scenario: Mark persists
- GIVEN level 3 skipped
- WHEN the page reloads
- THEN the status of level 3 is `unsolved`

#### Scenario: Unavailable storage
- GIVEN `localStorage` throws
- WHEN a level is skipped
- THEN the next level loads without error
