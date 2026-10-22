# Tasks: AngleCraft v1 Simultaneous Fire

Strict TDD: write or update the failing test first, then the code. One PR per slice to `feature/anglecraft-v1-simultaneous-fire`, <= 800 changed lines. Verify each slice with `npx playwright test` (3 runs, decide by exit code). Test titles carry the QA case IDs (`CP-xx`). Dependencies are installed in `C:\Users\Prueb\dev-deps\Vector-Break` (junction); never run `npm ci` inside the project.

## 1. Slice 1 - Fire in flight in the session (game-state, aiming, volley-economy)

- [x] 1.1 Test (unit, `input.spec.js`): `allows` admits FIRE, AIM and MOVE_START in `Firing` / `Simulating`, not paused.
- [x] 1.2 Test (unit, `simultaneous-fire.spec.js`): fire with a ball in flight (CP-59); aim in flight (CP-60); no balls left (CP-61); turn ends on the last landing (CP-62); immediate victory with balls removed and unfired balls kept unfired (CP-63); mode respected (CP-64); paused (CP-65); never more than 50 in flight (CP-66); move in flight and next group from there (CP-67); cap per turn from the first shot, unfired lost (CP-68); cadence 0.05 / 0.09 s (CP-69); speed held between groups and reset next turn (CP-70); group still emitting ignores FIRE and keeps its origin (CP-71); mode locked in flight.
- [x] 1.3 Test (unit): mode 1 fired every `EMIT_INTERVAL` emits each ball 0-1 step after the `'turn'` volley; v1 solutions win levels 1-6 in mode 1 with the same shots and score (CP-74, task 2.5 brought forward); remove the `test.fixme` and the retired mode-1 plans.
- [x] 1.4 Migrate the tests of design D7 (CP-10 superseded by HU-13, fire / aim gating, cap per group, speed reset, victory at turn end) and watch them fail against the current code.
- [x] 1.5 Implement D1-D6 (`Input.allows`, `GameSession.fire / emitBall / step / capVolley / resolve`, `Fsm` edges `Simulating → Firing`, `Firing → Resolving`).

## 2. Slice 2 - HUD and levels (hud, test-harness)

- [ ] 2.1 Test (unit, `hud-model.spec.js`): `LANZAR` enabled in flight with balls left, disabled with none left or paused (CP-61).
- [ ] 2.2 Test (browser, `launcher-states.spec.js`): ready in flight with balls left, disabled once all are fired (CP-72).
- [ ] 2.3 Test (e2e, `simultaneous-fire.spec.js`): real clicks / Space in flight, real `D` held in flight, sounds (CP-59, CP-61, CP-67).
- [ ] 2.4 Implement D8 (`Hud.js`, `Renderer.js` launcher state).
- [ ] 2.5 Record the levels 4-6 result in the archived OI-1 of `anglecraft-v1-launcher-and-fire-mode` (the replay itself landed in slice 1).
- [ ] 2.6 Baselines regenerated where the immediate victory or the launcher state changed them (reviewed); `qa-coverage.spec.js` covers CP-59..CP-74; CP-10 marked superseded; README, comparison doc, HU-12-14 status.

## 3. Close

- [ ] 3.1 Verify (3 full runs), PR from the tracker to `main`.
- [ ] 3.2 Archive: merge the deltas (complete MODIFIED texts), archive report.
