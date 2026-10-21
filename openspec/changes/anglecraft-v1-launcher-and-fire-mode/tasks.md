# Tasks: AngleCraft v1 Launcher Movement and Fire Mode

Strict TDD: write or update the failing test first, then the code. One PR per slice to `feature/anglecraft-v1-launcher-and-fire-mode`, <= 800 changed lines. Verify each slice with `npx playwright test` (3 runs, decide by exit code). Test titles carry the QA case IDs (`CP-xx`). Dependencies are installed in `C:\Users\Prueb\dev-deps\Vector-Break` (junction); never run `npm ci` inside the project.

## 1. Slice 1 - Test seam (test-harness)

- [x] 1.1 Test: `setFireMode('turn')` + `fire()` emits the whole volley and counts one shot (v1 behavior); `'turn'` not reachable from input.
- [x] 1.2 Add `run.fireMode` (only `'turn'` path active) and `hook.setFireMode`; pin `'turn'` in the six test sessions (`createSession({ fireMode: 'turn' })`) and, for e2e, in `?test=1` (main.js). `hook.move` moves to slice 2 with the movement it drives.
- [x] 1.3 Full suite green with no expectation changes.

## 2. Slice 2 - Launcher movement (game-state, aiming)

- [x] 2.1 Test (unit): `mapEvent` for `a`/`A`/`d`/`D` keydown/keyup, repeat ignored, `M` → CYCLE_MODE; `allows` gates MOVE_* to Aiming and not paused.
- [x] 2.2 Test (unit): hold 0.5 s = 240 px, tap = 8 px, 10 taps = 80 px, edges 50 / 1030 held, A+D = no move then resume, ignored in Firing/Simulating/paused/Victory/GameOver/Title, restart restores level x (CP-02, CP-03, CP-05..CP-11, CP-13..CP-15).
- [x] 2.3 Test (e2e): real keys move the launcher and the preview origin follows in the same frame (CP-04); blur releases keys; group fires from the moved x (CP-12).
- [x] 2.4 Implement Input (keyup, blur), session movement (D4), `LAUNCHER_MOVED` event.

## 3. Slice 3 - Fire groups (game-state, volley-economy)

- [ ] 3.1 Test (unit): group sizes 1/2/3 and limited by balls left (CP-20, CP-26); group end returns to Aiming without counting a shot (CP-21); shots counted at Resolving (CP-24); GameOver only after the last ball of the last turn (CP-25); victory mid-turn (CP-27).
- [ ] 3.2 Test (unit): relocation after each group (CP-22, CP-01); cap per group keeps launcher; orbs grow only following turns (CP-23).
- [ ] 3.3 Test (unit): mode default 1, reset on load/restart/next (CP-19); cycle and set; locked in flight (CP-28, CP-30); speed keys never change the mode (CP-32); same stars and score rule across modes (CP-31).
- [ ] 3.4 Implement D1–D3, D5 and the FSM edge Simulating → Aiming.

## 4. Slice 4 - HUD (hud)

- [ ] 4.1 Test (unit): `hudModel` mode block (active, limited, enabled) and BOLAS of the turn; ATAJOS order.
- [ ] 4.2 Test (browser): MODO section markup, dots, `M` keycap, amber limited state, disabled opacity; clicks dispatch SET_MODE (CP-29); ATAJOS rows (CP-16); BOLAS between groups and in flight (CP-33); panel fits 1000 px.
- [ ] 4.3 Test (browser): launcher states ready / moving / edge / disabled from cached sprites.
- [ ] 4.4 Implement D6 and D7.

## 5. Slice 5 - Tutorial hints (tutorial-hints)

- [ ] 5.1 Test (unit): `tutorialModel` shows move hint on level 1 and mode hint on level 2 only, once per session, hidden when paused or with a modal.
- [ ] 5.2 Test (e2e): appear and dismiss on move / fire / mode change; not shown again after restart or replay; shown again after reload (CP-17, CP-18, CP-34, CP-35); clicks pass through.
- [ ] 5.3 Implement D8 (model, DOM variants with caret, CSS animations, MODO highlight).

## 6. Slice 6 - Levels, visuals and docs (test-harness)

- [ ] 6.1 Solutions fixture still passes in `'turn'` mode; add a mode-1 solvability check per level.
- [ ] 6.2 Visual baselines: aiming (with move hint), level 2 (with mode hint), between groups; compare with the Claude Design canvas; update `docs/visual-fidelity-comparison.md`.
- [ ] 6.3 Coverage check: every CP-01..CP-35 appears in a test title.
- [ ] 6.4 README controls table (A, D, M); full suite 3 runs green.
