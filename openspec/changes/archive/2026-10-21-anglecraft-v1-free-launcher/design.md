# Design: AngleCraft v1 Free Launcher

## Context

`GameSession` stores the first landing x of each group in `run.firstLandX` (`physics.onLand`) and moves the launcher there in `endGroup()` and `resolve()` (D-10.1, D-11.3). The aim target (`run.aimTarget`) is already kept across groups and `reaim()` recomputes the direction from the current launcher x. Level load and restart already set `launcherX = level.launcher.x × board width` (540 on all six levels).

The seeded solutions (`tests/fixtures/solutions.json`, angles only) and the mode-1 plans (`tests/fixtures/solutions-mode1.json`, `x: null` = "stay where relocated") were found with relocation on, so they depend on it.

## Decisions

### D1. Remove relocation
Delete `run.firstLandX`, its reset in `fire()` / `resetRun()`, the `onLand` assignment and both `setLauncherX(run.firstLandX)` calls. `onLand` stays as a no-op physics callback (other listeners may hook it later). Nothing else reads `firstLandX` (renderer, HUD and tutorial read `launcherX` only).
**Why:** HU-14 AC1/AC2; deleting the rule is smaller and safer than a flag.

### D2. Starting x on load and restart (D-14.1)
No code change: `loadLevel()` and `RESTART` already set the level's starting x. Spec and tests make it explicit (AC4, AC5). HU-12's skip will go through `loadLevel()`, so it inherits the rule.

### D3. Fixtures with explicit launcher positions (answers PO open question 1)
In slice 1, while relocation still exists, a dev script replays each seeded solution and records the launcher x before every shot:
- `solutions.json`: each level gains `xs` (same length as `angles`; `xs[0]` is the level start 540).
- `solutions-mode1.json`: every `x: null` is replaced by the recorded x.

Replays place the launcher with `setLauncherX(x)` before each shot. While relocation exists this is a no-op (the recorded x equals the relocated x), which the suite proves; after slice 2 it is what keeps the solutions winning.
**Why:** any x in `[50, 1030]` is reachable with `A` / `D` (D-10.2), so a solution with explicit positions is a legal player plan. Every v1 solution stays achievable without relocation, so no rebalance is needed to keep levels 1–6 winnable; the felt difficulty is left to design review (OI-1).

### D4. Hook `setLauncherX(x)`
Test-only, guarded like the other hook methods; accepted in `Aiming` only, clamped to `[50, 1030]`, then `reaim()`. Session side: expose the existing internal `setLauncherX` as `session.setLauncherX`. Unit replays use it instead of writing `s.run.launcherX`.

### D5. Volley time cap
Only the wording changes: with no relocation the "capped balls are not landings" clause has no effect. The test "a cap after the first landing keeps that landing x" becomes "a cap never moves the launcher".

### D6. Test migration (slice 2)

| Test | Today | After |
|---|---|---|
| `fire-groups` CP-01 CP-22 | launcher relocates after each group | launcher unchanged after each group in modes 1 / 2 / 3; A / D still adjust between groups |
| `volley` "launcher shift" | first landing becomes launcher x | landing at mirrored x leaves launcher at 540 |
| `volley-cap` cap after first landing | keeps landing x | launcher unchanged |
| `launcher-move` CP-10 (×2) | compares with the relocated x | compares with the x before firing |
| playthrough e2e, visual screens, level solvability | angles only | angles plus `xs` / explicit `x` via `setLauncherX` |

CP-01 and CP-22 are marked superseded by HU-14 in `Design/casos/hu-10-11-casos-de-prueba.md`; their IDs stay (stable numbering) and their tests now assert the HU-14 rule.

### D7. Levels 4–6 in mode 1
After slice 2, re-run `scripts/search-mode-plans.mjs` for levels 4–6 with the launcher fixed. Informational only: the `test.fixme` stays until HU-13 or a rebalance (archived OI-1).

## Slices and files

| Slice | Files |
|---|---|
| 1 | `scripts/record-launcher-x.mjs` (new, dev-only), `tests/fixtures/solutions.json`, `tests/fixtures/solutions-mode1.json`, `src/js/system/GameSession.js` (expose `setLauncherX`), `src/js/system/TestHook.js`, `tests/e2e/playthrough.spec.js`, `tests/visual/screens.spec.js`, `tests/unit/level-solvability-modes.spec.js`, hook test |
| 2 | `src/js/system/GameSession.js`, `tests/unit/{fire-groups,volley,volley-cap,launcher-move}.spec.js`, new `tests/unit/free-launcher.spec.js`, `tests/e2e/free-launcher.spec.js`, `tests/unit/qa-coverage.spec.js`, `Design/casos/*`, `README.md`, `docs/visual-fidelity-comparison.md` |

## Open Items

- OI-1: PO open question 1 (balance with a fixed launcher). D3 keeps every level winnable; design review of the felt difficulty is pending, not blocking.
- OI-2: On archive, remove the aiming spec open item "Whether the launcher x shifts after a volley affects aim origin": HU-14 resolves it (it never shifts).
