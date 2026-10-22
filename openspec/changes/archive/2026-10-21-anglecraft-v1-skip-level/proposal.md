# Proposal: AngleCraft v1 Skip Level

## Intent

Let the player move on to the next level at any time with `N`, without solving the current one (HU-12), so nobody gets stuck on a hard puzzle and demos or level reviews can reach every level. A skipped level does not classify: no stars, score or record, and it stays marked "sin resolver" for the future level selector (HU-07). Source: `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md` (HU-12, AC1–AC11) and `Design/casos/hu-12-casos-de-prueba.md` (CP-45..CP-58).

## Confirmed decisions (PO, 2026-10-21)

| ID | Decision |
|---|---|
| D-12.1 | Skipping is immediate, with no confirmation. |
| D-12.2 | The key is `N`. |
| D-12.3 | Forward only: no way back to the previous level. |
| D-12.4 | The victory modal is unchanged: it offers "Siguiente nivel", not "Saltar". |
| D-12.5 | Skipped levels are marked "sin resolver" for the future level selector (HU-07). |

## Scope

### In Scope
- Input: `N` → `SKIP` (auto-repeat ignored); allowed in `Aiming`, `Firing`, `Simulating`, `Resolving`, `GameOver` and while paused; ignored in `Loading`, `Title` and `Victory`.
- Session: `SKIP` loads the next level with its initial values, clearing balls in flight and pause, without resolving the turn (no stars, score, record or victory sound); nothing on the last level.
- Progression: "sin resolver" marker persisted per level; a later win records normally and clears it; an existing record is never touched by a skip.
- HUD: `Saltar nivel` [`N`] in the CONTROL header and in ATAJOS; second button on the defeat modal; disabled on the last level.
- Audio: skip confirmation sound (existing `sfx_ui_confirm`).
- Tests for CP-45..CP-58 and the HU-14 AC4 skip path (CP-40).

### Out of Scope
- The level selector itself (HU-07): only the marker it will read.
- Going back to a previous level (D-12.3).
- New sound assets or sprites.

## Capabilities

### Modified Capabilities
- `game-state`: input mapping (`N`), new skip requirement.
- `progression`: unlock wording (skip bypasses the lock without classifying), new skip-without-classification requirement.
- `hud`: control panel (header action, ATAJOS row), defeat modal, button actions.
- `audio`: event sounds (skip).
- `test-harness`: traceability to CP-45..CP-58.

## Approach

`Input` maps `N` to `SKIP`; `allows` admits it in play states, in `GameOver` and while paused. `GameSession.skip()` marks the level through `progression.markSkipped(index)` and calls `loadLevel(index + 1)` directly (not `next()`, which keeps the win gate for "Siguiente nivel"); `loadLevel` already releases balls, clears pause and recenters the launcher. `resolve()` is never reached, so no record, star or victory event is produced. `Progression` keeps a persisted set of skipped levels under `anglecraft.v1.skipped`; `submit()` removes a level from it. The HUD adds the action from the pure model to the DOM view.

## Delivery Slicing (auto-chain on `feature/anglecraft-v1-skip-level`, <= 800 lines each)

| # | Slice | Capabilities |
|---|---|---|
| 1 | Skip in the session: `N`, `SKIP`, progression marker, audio event (unit) | game-state, progression, audio |
| 2 | HUD and flows: CONTROL header button, ATAJOS, defeat modal, e2e and visual baselines, docs | hud, test-harness |

## Rollback

Revert slice 2 to hide the controls (the key stays); revert slice 1 to remove the action. The `anglecraft.v1.skipped` key is additive and ignored by older code.

## Risks

| Risk | Mitigation |
|---|---|
| The CONTROL panel has 61 px free and must keep fitting 1000 px | Button in the header (no extra height); only the ATAJOS row is added (38 px); the existing fit test guards it; layout reviewed with design (OI-1) |
| Skipping resolves the turn by accident and records a result | `skip()` never calls `resolve()`; tests assert no `STARS`, no `STATE 6` and an unchanged record |
| Skip unlocks levels like a win | The win set is not touched; "Siguiente nivel" keeps its gate |
