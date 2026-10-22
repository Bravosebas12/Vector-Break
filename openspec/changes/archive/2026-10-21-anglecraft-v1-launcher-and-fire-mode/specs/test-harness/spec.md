# Delta for Test Harness

## MODIFIED Requirements

### Requirement: Flag-gated test hook (all HU)

As in v1, plus: the hook MUST expose `setFireMode(v)` with `v` in {1, 2, 3, 'turn'} and `move(dir, seconds)` that holds `A` (dir -1) or `D` (dir +1) for the given play time through the session (stepping included). `'turn'` is test-only: one `FIRE` emits every ball left in the turn, reproducing v1 behavior; it MUST NOT be reachable from game input. `fire(angle)` keeps its contract (aim then FIRE one group in the current mode).
(Previously: no fire-mode or movement methods.)

#### Scenario: v1 behavior preserved for legacy tests
- GIVEN `?test=1`, level 2 loaded and `setFireMode('turn')`
- WHEN `fire(angle)` is called and the session is stepped until `Aiming`, `Victory` or `GameOver`
- THEN exactly 5 balls were emitted by that single `FIRE` and shots used is 1

#### Scenario: Turn mode unreachable from input
- GIVEN the real game (no `?test=1`)
- WHEN any key or HUD control is used
- THEN the mode is always 1, 2 or 3

## ADDED Requirements

### Requirement: Traceability to the QA cases

Automated tests for this change MUST reference the QA case IDs (`CP-01`…`CP-35` from `Design/casos/hu-10-11-casos-de-prueba.md`) in their titles, and every AC of HU-10 and HU-11 MUST be covered by at least one automated test.

#### Scenario: Coverage check
- GIVEN the test titles
- WHEN they are searched for `CP-` IDs
- THEN every case in the coverage matrix appears at least once
