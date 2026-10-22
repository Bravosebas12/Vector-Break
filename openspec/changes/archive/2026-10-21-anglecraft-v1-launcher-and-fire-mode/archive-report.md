# Archive Report: anglecraft-v1-launcher-and-fire-mode

**Project**: vector-break (AngleCraft)
**Archived on**: 2026-10-21
**Archived to**: `openspec/changes/archive/2026-10-21-anglecraft-v1-launcher-and-fire-mode/`
**Traces to**: HU-10 (move the launcher with A / D) and HU-11 (fire mode 1 / 2 / 3), `Design/hu-10-11-lanzador-y-modo-de-disparo.md`, QA cases CP-01..CP-35
**Archive status**: closed with open items (no blocking issue)

## 1. Final State

| Item | Final state |
|------|-------------|
| Tasks | 22/22 `[x]` in `tasks.md` |
| Delivery | PRs #30-#34 and #36 (slices 1-6) merged into `feature/anglecraft-v1-launcher-and-fire-mode`; tracker PR #29 merged to `main` |
| Verify | 587 passed, 3 skipped (`test.fixme`), three consecutive runs at slice 6; full suite green on `main` after PR #29 |
| QA traceability | every CP-01..CP-35 appears in at least one test title (`tests/unit/qa-coverage.spec.js`) |

### Open items carried

- **OI-1 (balance)**: levels 1-3 are won in mode 1 in 2 turns (plans in `tests/fixtures/solutions-mode1.json`). Levels 4-6 were not solved by the greedy search (`scripts/search-mode-plans.mjs`) in mode 1 or 3; their mode-1 checks are `test.fixme` until HU-13 (simultaneous firing) or a rebalance.
- **OI-2**: hint animation under `prefers-reduced-motion` (fade only), to confirm with design.
- **Design approval**: Claude Design canvas `BU6xTioBfQoAEgJuBCHFtk` pending approval.

## 2. Spec Sync (openspec/specs/)

Merged after `anglecraft-v1-visual-fidelity`.

| Domain | Action | Detail |
|--------|--------|--------|
| aiming | Added 2 | Launcher movement, Preview from the moved launcher |
| game-state | Modified 3, added 1 | FSM states and transitions, Input mapping, Volley time cap; added Fire mode |
| hud | Modified 2, added 1 | Telemetry panel, Control panel; added Launcher states |
| test-harness | Modified 1, added 1 | Flag-gated test hook; added Traceability to the QA cases |
| tutorial-hints | Created | 3 requirements |
| volley-economy | Modified 4 | Shot equals volley, Volley size, Turn-end synchronization, Volley growth |

### Destructive-delta warning (config rule `archive`) and how it was handled

Several MODIFIED requirements in this change listed only the new behavior and its new scenarios, so a plain replacement would have deleted v1 content that is still valid. The merge was done by hand for those:

- **Composed text**: hud Telemetry panel and Control panel ("As in the visual-fidelity HUD, except…" / "MUST add…") and test-harness Flag-gated test hook ("As in v1, plus…") now hold the full requirement with the HU-10/11 changes folded in.
- **Scenarios kept** (still true): game-state Boot sequence, Loading cannot skip Title, Victory over game over, Input ignored in Loading (now also MOVE_START and CYCLE_MODE), Pause excluded (per group); volley-economy First volley (over the turn's groups), Growth, Cap, Reset on restart; hud Pips (new legend), Number above 12, No precision, Status indicator, Speed display, Launch button (one group), Removed shortcuts; test-harness Hook present with flag (plus `setFireMode`, `move`), Hook not ready while loading, Hook absent without flag.
- **Scenarios removed** (superseded by fire groups): game-state Turn continues, Turn ends, Cap reached, Launcher unchanged when none landed; volley-economy Count on fire, Launcher shift.

## 3. Learnings

1. Write MODIFIED requirements as the complete new text with every scenario that still holds; "as in v1, plus" deltas force a manual merge at archive time.
2. Archive changes that touch the same requirement in merge order.
