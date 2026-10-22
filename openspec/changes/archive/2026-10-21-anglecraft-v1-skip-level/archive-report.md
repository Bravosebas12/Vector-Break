# Archive Report: anglecraft-v1-skip-level

**Project**: vector-break (AngleCraft)
**Archived on**: 2026-10-21
**Archived to**: `openspec/changes/archive/2026-10-21-anglecraft-v1-skip-level/`
**Traces to**: HU-12 (skip level without classification), `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`, QA cases CP-45..CP-58 (`Design/casos/hu-12-casos-de-prueba.md`)
**Archive status**: closed with one open item (design review, not blocking)

## 1. Final State

| Item | Final state |
|------|-------------|
| Tasks | 13/13 `[x]` in `tasks.md` |
| Delivery | PRs #45 (slice 1) and #46 (slice 2) merged into `feature/anglecraft-v1-skip-level`; tracker PR #47 merged to `main` |
| Verify | full suite 3 times on slice 2: exit 0, 634 passed, 3 skipped (known `test.fixme`, levels 4-6 in mode 1) |
| QA traceability | CP-01..CP-58 all referenced by test titles (`tests/unit/qa-coverage.spec.js`); HU-14 CP-40 skip path covered by CP-58 |
| Decisions | D-12.1 (no confirmation), D-12.2 (`N`), D-12.3 (forward only), D-12.4 (victory modal unchanged), D-12.5 (sin resolver mark) |

### Open items carried

- **OI-1 (design review)**: the compact `Saltar nivel [N]` button on the right of the CONTROL header (the panel had 61 px free) and the secondary button under `Reiniciar puzzle` on the defeat modal. If design changes the layout, the 6 game baselines are regenerated.
- **HU-07**: the level selector will read `progression.status(index)` (`resolved` / `unsolved` / `unplayed`); the mark is persisted under `anglecraft.v1.skipped`.
- The progression spec open items OI-3 / OI-4 (unlock persistence, same-session gating) are unchanged: HU-12 does not touch the win gate.

## 2. Spec Sync (openspec/specs/)

| Domain | Action | Detail |
|--------|--------|--------|
| game-state | Modified 1, added 1 | Input mapping (`N` -> SKIP, allowed while paused); added Skip level |
| progression | Modified 1, added 1 | Unlock (a skip loads N+1 without a win); added Skip without classification |
| hud | Modified 3 | Control panel (header button, ATAJOS row), Defeat modal (second button), Button actions (Saltar nivel; none on victory) |
| audio | Modified 1 | Event sounds (`SKIP` -> `sfx_ui_confirm`, never victory or stars) |
| test-harness | Modified 1 | Traceability to the QA cases (CP-45..CP-58) |

Every MODIFIED requirement was written as the complete new text. Scenario diff after the merge: none removed; 19 added across game-state (7), hud (5), progression (6) and audio (1).

## 3. Learnings

1. Measuring the real free space of a panel before specifying a new control turned a layout risk into a design decision (header button) instead of a late regression.
2. `PRESS` confirms only when the state changes; an action that confirms itself (`SKIP`) has to opt out to avoid a double confirm sound.
