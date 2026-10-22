# Proposal: AngleCraft v1 Launcher Movement and Fire Mode

## Intent

Give the player two new levers before each shot: move the launcher with `A` / `D` (HU-10) and fire the turn's volley in groups of 1, 2 or 3 balls instead of the whole volley in one sequence (HU-11). Teach both in the tutorial levels (D-T.1). Source: `Design/hu-10-11-lanzador-y-modo-de-disparo.md` (27 AC) and `Design/casos/hu-10-11-casos-de-prueba.md` (35 test cases).

## Design sources

| Source | Content |
|---|---|
| Claude Design canvas [AngleCraft — Tutorial y modo de disparo](https://claude.ai/artifact/BU6xTioBfQoAEgJuBCHFtk) | 01 level 1 with the A / D hint, 02 level 2 with the fire-mode hint and highlighted MODO section, 03 component sheet (hint spec, MODO selector states, launcher states, BOLAS of the turn) |
| v1 mockup and tokens | `Design/Game UI/…`, `src/js/system/Theme.js`, `styles.css` |

## Confirmed decisions (PO, 2026-10-21)

| ID | Decision |
|---|---|
| D-10.1 | Automatic relocation to the first landing ball is kept; `A` / `D` adjust afterwards. |
| D-10.2 | `A` / `D` move freely over the whole bottom width and stop at the board edges (x 50 / 1030) even while held. |
| D-10.3 | 480 px/s while held; a tap moves exactly 8 px. |
| D-11.1 | Option A: the turn's volley is fired in groups of 1, 2 or 3; the turn ends when every ball of the volley has been fired and has landed. Level shots (turns) are unchanged. |
| D-11.2 | The mode gives no advantage: score, stars and records keep the v1 rules. |
| D-11.3 | The launcher relocates after each group, to the first landing of that group. |
| D-11.4 | Orbs captured in any group grow the volley of the following turns (v1 rule). |
| D-T.1 | Tutorial hints: `A` / `D` on level 1, fire mode on level 2; once per session. |

## Scope

### In Scope
- Input: `A` / `D` hold-to-move with tap rule, `M` cycles the mode; key release tracking.
- Session: launcher movement in `Aiming`; turn split into groups; group-end returns to `Aiming`; turn counted at `Resolving`; launcher relocation per group; volley time cap per group.
- HUD: MODO DE DISPARO selector (1 / 2 / 3, disabled in flight, limited state), BOLAS shows balls left to fire in the turn, ATAJOS gains Mover lanzador and Modo, launcher states (ready, moving, at edge, disabled).
- Tutorial hints on levels 1 and 2 (new capability).
- Test harness: hook support for fire modes, migration of v1 tests, new unit / e2e / visual tests for the 35 cases.
- Re-validation of the six levels' solutions.

### Out of Scope
- New levels, rebalancing beyond re-validating solutions, alternative layouts (AZERTY), menu (HU-07), new sounds (mode change reuses `sfx_ui_click`).

## Capabilities

### New Capabilities
- `tutorial-hints`: in-game hints for the tutorial levels.

### Modified Capabilities
- `game-state`: input mapping (A, D, M, key release), FSM group-end transition, volley time cap per group.
- `volley-economy`: shot = turn counted at `Resolving`, groups within a turn, relocation per group.
- `aiming`: launcher movement and preview from the moved launcher.
- `hud`: MODO selector, BOLAS of the turn, ATAJOS, launcher states.
- `test-harness`: fire-mode hook and test migration.

## Approach

Extend the DOM-free `GameSession` with a `fireMode` and per-turn counters (`turnBalls`, `turnFired`, `groupSize`); keep `Resolving` for the end of a turn only, so orbs, stars and score keep their v1 code paths. Input tracks held keys and dispatches `MOVE_START` / `MOVE_STOP`; movement is integrated in `step(dt)` with play time (independent of the speed multiplier). HUD and hints render from pure models (`Hud.js`) through `HudDom.js`, as in the visual-fidelity change.

## Delivery Slicing (auto-chain on `feature/anglecraft-v1-launcher-and-fire-mode`, <= 800 lines each)

| # | Slice | Capabilities |
|---|---|---|
| 1 | Test seam: hook `setFireMode` (incl. test-only `'turn'`), migrate v1 tests | test-harness |
| 2 | Launcher movement (input, session, preview) | game-state, aiming |
| 3 | Fire groups within a turn (FSM, counters, relocation, cap) | game-state, volley-economy |
| 4 | HUD: MODO selector, BOLAS of the turn, ATAJOS, launcher states | hud |
| 5 | Tutorial hints | tutorial-hints |
| 6 | Level re-validation, e2e for the 35 cases, visual baselines, docs | test-harness |

## Risks

| Risk | Mitigation |
|---|---|
| ~500 v1 tests assume one FIRE = whole volley | Slice 1 first: test-only `'turn'` mode keeps them valid; new behavior covered by new tests. |
| Puzzles become easier (free launcher, re-aim between groups) | Slice 6 re-validates solutions; balance review with design noted as follow-up. |
| Hold-to-move feels different across frame rates | Movement integrated on the fixed step; tap rule defined on key release. |
| CONTROL panel overflow with a new section | Section paddings from the design canvas (22 px); visual test at 1920×1080. |

## Rollback

Each slice is one PR on the tracker branch; revert the slice. The `'turn'` fire mode reproduces v1 behavior exactly, so reverting slices 2–5 leaves a v1-equivalent game.

## Success Criteria

- The 27 AC of HU-10 / HU-11 pass through automated tests mapped to CP-01..CP-35.
- All six levels remain solvable within their shots in mode 1.
- Visual baselines updated after design approval of the canvas.
- Existing suite green; no runtime dependencies.
