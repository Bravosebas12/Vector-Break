# Proposal: AngleCraft v1 Free Launcher

## Intent

The launcher stays where the player left it with `A` / `D`, even when the balls land somewhere else (HU-14). Today it relocates to the first landing of each group (D-10.1, D-11.3), which players read as "it jumps back to the center". Source: `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md` (HU-14, AC1–AC6) and `Design/casos/hu-14-casos-de-prueba.md` (CP-36..CP-44).

## Confirmed decisions (PO, 2026-10-21)

| ID | Decision |
|---|---|
| D-14.0 | HU-14 supersedes D-10.1 and D-11.3 (automatic relocation) and HU-10 AC1 / HU-11 AC4. Landing balls never move the launcher. |
| D-14.1 | `R` (restart) returns the launcher to the level's starting x (center), the same as loading a level (next level, or level skip from HU-12). |

## Scope

### In Scope
- Session: remove the relocation after a group and at `Resolving`; the launcher x changes only by `A` / `D`, level load and restart.
- Volley time cap: drop the "capped balls do not count as landings" clause (no landing moves the launcher any more).
- Test harness: replay the seeded solutions with an explicit launcher x per shot, so every level stays winnable without relocation; hook `setLauncherX(x)`; migrate the tests that assert relocation (CP-01, CP-22).
- QA cases CP-36..CP-44 and their traceability.

### Out of Scope
- Level rebalancing (see design D3: the recorded positions keep every v1 solution reachable with `A` / `D`).
- HU-12 (level skip) and HU-13 (simultaneous firing); AC4's skip path is checked when HU-12 lands.
- Visual changes: no sprite, HUD or tutorial copy mentions relocation.

## Capabilities

### Modified Capabilities
- `volley-economy`: turn-end synchronization without relocation.
- `aiming`: launcher movement (only `A` / `D`, reset on load and restart) and a stable preview after landings.
- `game-state`: volley time cap wording.
- `test-harness`: `setLauncherX` hook and traceability to CP-36..CP-44.

## Approach

Delete `run.firstLandX` and its two `setLauncherX` calls in `GameSession` (`endGroup`, `resolve`); `aimTarget` is already kept across groups, so the preview stays put (AC6). Before removing the rule, record the launcher x that relocation produced before each shot of the seeded solutions and store it in the fixtures; replays then place the launcher explicitly, which is a legal player plan because `A` / `D` reach the whole width (D-10.2).

## Delivery Slicing (auto-chain on `feature/anglecraft-v1-free-launcher`, <= 800 lines each)

| # | Slice | Capabilities |
|---|---|---|
| 1 | Test seam: record launcher x per shot in the fixtures, hook `setLauncherX`, replays place the launcher; no behavior change | test-harness |
| 2 | Free launcher: remove relocation (TDD with CP-36..CP-44), migrate CP-01 / CP-22 and relocation tests, docs | volley-economy, aiming, game-state, test-harness |

## Rollback

Revert the slice 2 merge: relocation comes back and the slice 1 fixtures still pass, because the recorded x equals the relocated x.

## Risks

| Risk | Mitigation |
|---|---|
| Seeded solutions stop winning once the launcher no longer moves | Slice 1 records the positions while relocation still exists; the suite proves the replay is identical before slice 2 |
| Puzzles feel different without relocation (PO open question 1) | D3: every v1 solution stays reachable; the felt difficulty is reviewed with design as OI-1, not blocking |
| Tests that assert relocation silently keep passing | Slice 2 rewrites each of them to assert the opposite (launcher unchanged) |
