# Delta for Test Harness

## MODIFIED Requirements

### Requirement: Traceability to the QA cases

Automated tests MUST reference the QA case IDs in their titles: `CP-01`…`CP-35` from `Design/casos/hu-10-11-casos-de-prueba.md`, `CP-36`…`CP-44` from `Design/casos/hu-14-casos-de-prueba.md`, `CP-45`…`CP-58` from `Design/casos/hu-12-casos-de-prueba.md` and `CP-59`…`CP-74` from `Design/casos/hu-13-casos-de-prueba.md`. Every AC of HU-10, HU-11, HU-12, HU-13 and HU-14 MUST be covered by at least one automated test. Superseded cases keep their IDs and their tests assert the newer rule: CP-01 and CP-22 (HU-14), CP-10 (HU-13, movement in flight).

#### Scenario: Coverage check
- GIVEN the test titles
- WHEN they are searched for `CP-` IDs
- THEN every case in the four coverage matrices appears at least once

### Requirement: Solutions with launcher positions (HU-14, HU-13)

The seeded solutions MUST store the launcher x for every shot (`xs` next to `angles` in `tests/fixtures/solutions.json`). Replays MUST place the launcher with `setLauncherX` before each shot. Levels 1–6 MUST be won by their solution in `'turn'` mode, and also in fire mode 1 by firing each turn's balls one per `FIRE` every `EMIT_INTERVAL` along the solution's angle (HU-13), with the same number of shots and the same score. The greedy mode-1 plans of HU-11 (`solutions-mode1.json`) are retired: they waited for every group to land and do not fit the turn time cap of HU-13.

#### Scenario: Replay before and after HU-14
- GIVEN the recorded positions
- WHEN the solutions are replayed with relocation on (slice 1) and off (slice 2)
- THEN every level that was won is won in the same number of shots

#### Scenario: Mode 1 with rapid fire
- GIVEN the v1 solution of level 4, 5 or 6 and its launcher positions
- WHEN each turn is fired in mode 1 with one `FIRE` every `EMIT_INTERVAL`
- THEN the level is won in the same number of shots and with the same score as in `'turn'` mode
