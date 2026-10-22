# Archive Report: anglecraft-v1-free-launcher

**Project**: vector-break (AngleCraft)
**Archived on**: 2026-10-21
**Archived to**: `openspec/changes/archive/2026-10-21-anglecraft-v1-free-launcher/`
**Traces to**: HU-14 (free launcher position), `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`, QA cases CP-36..CP-44 (`Design/casos/hu-14-casos-de-prueba.md`)
**Archive status**: closed (no blocking issue)

## 1. Final State

| Item | Final state |
|------|-------------|
| Tasks | 14/14 `[x]` in `tasks.md` |
| Delivery | PRs #39 (slice 1) and #40 (slice 2) merged into `feature/anglecraft-v1-free-launcher`; tracker PR #41 merged to `main` |
| Verify | full suite 3 times on slice 2: exit 0, 599 passed, 3 skipped (known `test.fixme`, levels 4-6 in mode 1) |
| QA traceability | CP-01..CP-44 all referenced by test titles (`tests/unit/qa-coverage.spec.js`); CP-01 and CP-22 marked superseded by HU-14 |
| Decisions | D-14.0 (relocation removed, supersedes D-10.1 / D-11.3), D-14.1 (`R` returns to the level start) |

### Open items carried

- **OI-1 (balance)**: every v1 solution still wins with the same shots thanks to the recorded launcher positions (design D3), so levels 1-6 stay winnable without a rebalance. The felt difficulty without relocation is pending design review. The mode-1 search for levels 4-6 with the launcher fixed (design D7) finished after the archive: no win, core left at 30 / 211 / 239 HP after 12 / 13 / 15 turns (70 / 89 / 132 groups). The result is the same as with relocation, so HU-14 neither helps nor hurts those levels in mode 1; the checks remain `test.fixme` until HU-13 or a rebalance.
- **HU-12 dependency**: AC4's "Saltar nivel" path is added to CP-40 when HU-12 exists (S-QA6).

## 2. Spec Sync (openspec/specs/)

| Domain | Action | Detail |
|--------|--------|--------|
| aiming | Modified 2 | Launcher movement (only A / D during play; load and restart set the level start), Preview from the moved launcher (stable after landings) |
| game-state | Modified 1 | Volley time cap (the cap never moves the launcher) |
| test-harness | Modified 2, added 1 | Flag-gated test hook (`setLauncherX`), Traceability to the QA cases (CP-36..CP-44); added Solutions with launcher positions |
| volley-economy | Modified 1 | Turn-end synchronization (no relocation) |

Every MODIFIED requirement was written as the complete new text, so the merge was a by-name replacement with no manual composition. Scenario diff after the merge: only volley-economy "Relocation after a group" was removed (superseded by "Fixed after a group", "Fixed across turns", "Fixed in every mode"); every other existing scenario was kept.

The aiming open item OI-2 ("whether the launcher x shifts after a volley affects aim origin") was marked resolved by HU-14 in `openspec/specs/aiming/spec.md` (ID kept).

## 3. Learnings

1. Writing complete MODIFIED requirements (the lesson from the previous archive) made this archive a mechanical merge.
2. Recording the state a rule produced before removing it (launcher x per shot) kept the regression fixtures valid across a behavior change, with a no-op proof in the first slice.
