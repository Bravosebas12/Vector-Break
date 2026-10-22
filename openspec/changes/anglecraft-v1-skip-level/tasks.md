# Tasks: AngleCraft v1 Skip Level

Strict TDD: write or update the failing test first, then the code. One PR per slice to `feature/anglecraft-v1-skip-level`, <= 800 changed lines. Verify each slice with `npx playwright test` (3 runs, decide by exit code). Test titles carry the QA case IDs (`CP-xx`). Dependencies are installed in `C:\Users\Prueb\dev-deps\Vector-Break` (junction); never run `npm ci` inside the project.

## 1. Slice 1 - Skip in the session (game-state, progression, audio)

- [x] 1.1 Test (unit, `input.spec.js`): `n` / `N` → SKIP, repeat ignored; `allows` SKIP in Aiming, Firing, Simulating, Resolving, GameOver and paused; not in Loading, Title, Victory.
- [x] 1.2 Test (unit, `skip-level.spec.js`): skip from Aiming with turns used (CP-45), with balls in flight (CP-46), paused (CP-47), from GameOver (CP-49); last level does nothing (CP-52); ignored in Title / Victory (CP-54, CP-56); no `STARS`, no `STATE 6`, no record (CP-50); win set untouched, then win + NEXT works (CP-58); no action loads a previous level (CP-57); launcher at the level start (HU-14 CP-40 skip path).
- [x] 1.3 Test (unit, `progression.spec.js`): `markSkipped` / `status` / `submit` clears the mark; record kept on skip (CP-51, CP-55). Test (browser, `storage.spec.js`): mark persisted under `anglecraft.v1.skipped`, read back after reload, throwing storage tolerated.
- [x] 1.4 Test (unit): sound mapper plays `sfx_ui_confirm` on `SKIP`, nothing else.
- [x] 1.5 Implement D1–D4.

## 2. Slice 2 - HUD and flows (hud, test-harness)

- [x] 2.1 Test (unit, `hud-model.spec.js`): `control.skip` enabled / disabled (last level, Victory); ATAJOS ends with Saltar nivel `N` (CP-53); defeat buttons include Saltar nivel, disabled on the last level; victory unchanged (CP-56).
- [x] 2.2 Test (browser): header button markup and keycap, disabled style, panel fits 1000 px; defeat modal two buttons; clicks dispatch SKIP / PRESS SKIP (CP-48, CP-52, CP-53).
- [x] 2.3 Test (e2e, `skip-level.spec.js`): real `N` from play and from the defeat modal, sounds (CP-45, CP-48, CP-49, CP-50); marker after reload (CP-55).
- [x] 2.4 Implement D5 (`Hud.js`, `HudDom.js`, `strings.js`, `styles.css`).
- [x] 2.5 Visual baselines for the CONTROL panel and the defeat modal; design review requested as OI-1 (pending, not blocking).
- [x] 2.6 `qa-coverage.spec.js` covers CP-45..CP-58; CP-40 skip path noted in `Design/casos/hu-14-casos-de-prueba.md`; README (`N`), comparison doc, HU-12-14 status.

## 3. Close

- [ ] 3.1 Verify (3 full runs), PR from the tracker to `main`.
- [ ] 3.2 Archive: merge the deltas (complete MODIFIED texts), archive report.
