# Tasks: AngleCraft v1 Free Launcher

Strict TDD: write or update the failing test first, then the code. One PR per slice to `feature/anglecraft-v1-free-launcher`, <= 800 changed lines. Verify each slice with `npx playwright test` (3 runs, decide by exit code). Test titles carry the QA case IDs (`CP-xx`). Dependencies are installed in `C:\Users\Prueb\dev-deps\Vector-Break` (junction); never run `npm ci` inside the project.

## 1. Slice 1 - Test seam: solutions with launcher positions (test-harness)

- [x] 1.1 Test: hook `setLauncherX` places and clamps in `Aiming`, does nothing in `Simulating`, throws `NOT_READY` in `Loading`; listed among the hook functions.
- [x] 1.2 Expose `session.setLauncherX` and add `hook.setLauncherX` (D4).
- [x] 1.3 Add `scripts/record-launcher-x.mjs` (dev-only): replays `solutions.json` in `'turn'` mode and the mode-1 plans, writes `xs` per level and replaces every `x: null` with the recorded x (D3).
- [x] 1.4 Replays place the launcher before each shot: `tests/e2e/playthrough.spec.js`, `tests/visual/screens.spec.js`, `tests/unit/level-solvability-modes.spec.js` (use `setLauncherX`, not `s.run.launcherX`).
- [x] 1.5 Full suite green with no expectation changes (the recorded x equals the relocated x).

## 2. Slice 2 - Free launcher (volley-economy, aiming, game-state, test-harness)

- [x] 2.1 Test (unit, `free-launcher.spec.js`): unchanged after a group in modes 1 / 2 / 3 (CP-36, CP-37); unchanged across turns (CP-38); only A / D move it, 300 → 540 (CP-39); next level and restart return to 540 (CP-40, CP-41); cap after a landing leaves it (CP-43).
- [x] 2.2 Test (e2e, `free-launcher.spec.js`): real keys move to 300, a shot lands elsewhere, the preview starts at 300 toward the same pointer (CP-42).
- [x] 2.3 Migrate tests that assert relocation (design D6): `fire-groups` CP-01 CP-22, `volley` launcher shift, `volley-cap` cap after first landing, `launcher-move` CP-10 (x2). Watch them fail against the current code.
- [x] 2.4 Implement D1: remove `run.firstLandX` and both relocation calls in `GameSession`.
- [x] 2.5 Solutions replay with the launcher fixed: levels 1–6 in `'turn'`, levels 1–3 in mode 1 (CP-44); re-run the mode-1 search for levels 4–6 and record the result in OI-1 (D7). Result: no win in mode 1, core left at 30 / 211 / 239 HP, the same as with relocation.
- [x] 2.6 `qa-coverage.spec.js` covers CP-36..CP-44; mark CP-01 / CP-22 superseded in `Design/casos/hu-10-11-casos-de-prueba.md`.
- [x] 2.7 Docs: README (the launcher stays where you leave it), `docs/visual-fidelity-comparison.md` section 8, `Design/hu-12-14-...md` status.

## 3. Close

- [x] 3.1 Verify (3 full runs), PR from the tracker to `main`.
- [x] 3.2 Archive: merge the deltas (complete MODIFIED texts), remove aiming open item OI-2 (design OI-2), archive report.
