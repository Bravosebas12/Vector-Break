# Progression Specification

## Purpose

Stars, score, persisted records, unlock and end of content (A1, A5, D1). Traces to HU-03 s2/s3/s3b/s3c, HU-06 s5, HU-08 s1/s3.

## Requirements

### Requirement: Star rating (HU-03 s2/s3; A1)

On victory with `T` shots used out of limit `N`: `T = 1` MUST give 3 stars; otherwise `T <= floor(N/2)` MUST give 2 stars; otherwise 1 star.

#### Scenario: Master shot
- GIVEN N = 10, T = 1
- WHEN rated
- THEN 3 stars

#### Scenario: Two stars boundary
- GIVEN N = 10 and T = 5
- WHEN rated
- THEN 2 stars

#### Scenario: One star
- GIVEN N = 10 and T = 6
- WHEN rated
- THEN 1 star

#### Scenario: Odd limit
- GIVEN N = 7 and T = 3
- WHEN rated
- THEN 2 stars, and T = 4 gives 1 star

### Requirement: Score (HU-03 s3b; A5)

Score MUST equal total damage dealt plus a fixed bonus per unused shot.

#### Scenario: Calculation
- GIVEN total damage 150, 4 unused shots and bonus B
- WHEN scored
- THEN score is `150 + 4B`

#### Scenario: Zero unused
- GIVEN 0 unused shots
- WHEN scored
- THEN score equals total damage

### Requirement: Record persistence (HU-03 s3)

On victory the best record per level (stars, score, shots used) MUST be stored in `localStorage` under keys prefixed `anglecraft`.

#### Scenario: First record
- GIVEN no record for level 1 (`shots` N = 10) and a bonus of 100 per unused shot (P1)
- WHEN the level is won using 4 shots with total damage 100 (2 stars since 4 <= 5; 6 unused shots give bonus 600)
- THEN a record `{stars:2, score:700, shots:4}` is stored

#### Scenario: Worse run keeps record
- GIVEN stored 3 stars
- WHEN a later run earns 1 star
- THEN the stored record is unchanged

#### Scenario: Unavailable storage
- GIVEN `localStorage` throws
- WHEN a record is saved
- THEN the game continues without error

### Requirement: Unlock (HU-06 s5, HU-03 s3)

Level N+1 MUST be unavailable until level N has been won. Winning level N MUST enable access to level N+1 (via Siguiente nivel).

#### Scenario: Locked
- GIVEN level 1 not won
- WHEN access to level 2 is attempted
- THEN it is refused

#### Scenario: Unlock
- GIVEN level 1 won
- WHEN Siguiente nivel is used
- THEN level 2 loads

### Requirement: Session start (HU-03 s3c; D1)

Every session MUST begin at level 1, irrespective of records.

#### Scenario: Fresh load
- GIVEN stored records for levels 1-5
- WHEN the page reloads and the title screen is clicked
- THEN level 1 is active

### Requirement: Chain and end of content (HU-08 s1/s3)

After level 3 comes 4, after 5 comes 6. After winning level 6 there MUST be no next level; the modal MUST state it is the last level.

#### Scenario: 5 to 6
- GIVEN level 5 won
- WHEN Siguiente nivel is used
- THEN level 6 loads

#### Scenario: End
- GIVEN level 6 won
- WHEN the victory modal appears
- THEN next-level access is not offered and Repetir works

## Open Items

- OI-1: Fixed bonus per unused shot (B) value is not stated.
- OI-2: Definition of "best" when comparing records (stars first, then score?) is not stated.
- OI-3: Whether unlock progress persists in `localStorage` is not stated (level select absent in v1).
- OI-4: Behavior of Siguiente nivel being permitted only after the same-session win vs persisted wins is unspecified.
