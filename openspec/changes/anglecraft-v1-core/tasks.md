# Tasks: AngleCraft v1 Core

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~6,600 total (tests ~50%), 14 PR slices of ~300-650 lines |
| 400-line budget risk | High (total); every slice stays under the 800-line review budget |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (slice 1) -> 2 -> 3 -> 4 -> 5a -> 5b -> 6a -> 6b -> 7a -> 7b -> 8a -> 8b -> 9a -> 9b |
| Delivery strategy | auto-chain (budget 800) |
| Chain strategy | feature-branch-chain (tracker: feature/anglecraft-v1) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Notes: slices 5, 6, 7, 9 are pre-split (each estimated at or above ~900 lines combined). Slice 8b is estimated ~550 lines, so it stays whole; 8a is separate. Runtime code is vanilla JS ES modules only, with zero runtime dependencies. Every GREEN task follows its RED task and runs `npx playwright test --project=<p> <file>`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Playwright + server + spikes | PR 1 (~330) | `npx playwright test tests/spikes tests/e2e/smoke.spec.js` | smoke boot at `/` | package.json, config, scripts/, tests/spikes, tests/e2e |
| 2 | Physics core | PR 2 (~520) | `npx playwright test --project=unit tests/unit/{vector,collision,physics,pool}.spec.js` | N/A: pure modules | engine/, ObjectPool, Ball, Rng, Layout |
| 3 | Level loading + traps | PR 3 (~600) | `--project=unit tests/unit/{level-validator,trap}.spec.js` | N/A: pure modules | Block, Multiplier, LevelValidator, TrapAnalysis, Board, LevelCatalog |
| 4 | Raycaster + reachability | PR 4 (~450) | `--project=unit tests/unit/{raycaster,reachability}.spec.js` | N/A: pure modules | Raycaster.js + its specs |
| 5a | FSM, input, session core | PR 5a (~600) | `--project=unit tests/unit/{fsm,input,session}.spec.js` | N/A: DOM-free session | Fsm, Input, EventRing, GameSession (core) |
| 5b | Volley economy, hook, boot | PR 5b (~600) | `--project=unit tests/unit/{volley,volley-cap,orbs}.spec.js` + hook e2e | `/?test=1` hook | GameSession economy, TestHook, main.js |
| 6a | Loop, viewport, atlas | PR 6a (~380) | `--project=browser tests/browser` | `/?test=1&loop=1` | Loop, Viewport, Atlas |
| 6b | Renderer, particles, stress | PR 6b (~450) | `--project=e2e tests/e2e/{loop-clock,stress}.spec.js` | `?test=1&loop=1&stress=1` | Renderer, Particles, Particle |
| 7a | strings + HudModel | PR 7a (~450) | `--project=unit tests/unit/hud-model.spec.js` | N/A: pure model | Hud.js, strings.js |
| 7b | Progression + storage + modals | PR 7b (~400) | `--project=unit tests/unit/progression.spec.js` + browser storage | `/?test=1` win flow | Progression.js, Hud modal wiring |
| 8a | Audio seam + WebAudio | PR 8a (~450) | `--project=unit tests/unit/audio-seam.spec.js` | `--project=browser webaudio.spec.js` | WebAudio.js, AudioSinks.js |
| 8b | AssetLoader + start screen | PR 8b (~550) | `--project=unit tests/unit/{asset-loader,title-screen}.spec.js` | `tests/e2e/start-screen.spec.js` | AssetLoader, TitleScreen, main.js boot |
| 9a | Levels 4-6 + content tests | PR 9a (~450) | `--project=unit tests/unit/level-content.spec.js` | N/A: JSON + pure tests | level{4,5,6}.json, level-content spec |
| 9b | Solutions + e2e L1-L6 | PR 9b (~300) | `--project=e2e tests/e2e/playthrough.spec.js` | seeded L1-L6 playthrough | solutions.json, playthrough spec |

## Slice 1: Test harness + spikes (test-harness; all HU)

- [x] 1.1 Create `package.json` (`"type":"module"`, only devDep `@playwright/test` `1.63.0`, no `dependencies`); run `npm install` and `npx playwright install chromium`. (Dev-only runner)
- [x] 1.2 Create `playwright.config.js`: projects `unit` (no browser), `browser` and `e2e` (chromium); `webServer` runs `node scripts/static-server.mjs --port 4173`. (Automation projects)
- [x] 1.3 RED `tests/spikes/server.spec.js`: `..`, `%2e%2e`, absolute path, backslash -> 403/404; POST -> 405; `.js` is `text/javascript`, `.wav` is `audio/wav`, `/` is 200. (Threat matrix: static server path routing)
- [x] 1.4 GREEN `scripts/static-server.mjs`: 127.0.0.1, decode + `path.resolve` + root prefix check, MIME map, stream, GET/HEAD only, no listing. (Static server)
- [x] 1.5 Spike S1 `tests/spikes/clock.spec.js` + `tests/blank.html`: `clock.install()` before `goto`; `runFor(1000)` gives 58-63 rAF calls, `performance.now()` delta 1000 +-1 ms, monotonic. Fail: drop real-loop e2e (hook stepping only). (OI-2)
- [x] 1.6 Spike S2 `tests/spikes/esm.spec.js`: Node-side import of `src/js/engine/Vector2D.js`, no transform error. Fail: run pure tests via `page.evaluate` import. (OI-1)
- [x] 1.7 Spike S3 in `tests/spikes/server.spec.js`: server starts on Windows; two consecutive runs pass (no orphan port). Fail: `reuseExistingServer: false` + port from env.
- [x] 1.8 `tests/e2e/smoke.spec.js`: `/` loads with no console errors; `tests/e2e/` host check. (Single command)
- [x] 1.9 Amend `openspec/changes/anglecraft-v1-core/specs/test-harness/spec.md` hook requirement: add `start()`, `setVolley(n <= 50)`, `NOT_READY` while `Loading`, `loadLevel` from `Title` as a legal Title -> Aiming transition, `&stress=1`, `&loop=1`, `&audio=1`, `audioLog()`, `aim`, `action`; update both scenarios. (Design Interfaces)

## Slice 2: Physics (physics; HU-02, HU-05)

- [x] 2.1 RED `tests/unit/vector.spec.js` (unit-vector direction, scalar speed, renormalize) -> GREEN `src/js/engine/Vector2D.js`. (Unit direction)
- [x] 2.2 RED `tests/unit/collision.spec.js` (closest-point, corner normal, deepest-only, reflect only if `D.N<0`, `|dir.y|>=0.05`) -> GREEN `src/js/engine/Collision.js`. (Circle vs AABB, Elastic reflection)
- [x] 2.3 GREEN `src/js/system/Layout.js` (board/grid/walls/floor 956/`MAX_VOLLEY=50`/launcher range) and `src/js/system/Rng.js` (seeded). (Board B1, Determinism)
- [x] 2.4 RED `tests/unit/pool.spec.js` (50 preallocated, `acquire()` null when empty, no growth) -> GREEN `src/js/system/ObjectPool.js`, `src/js/entities/Ball.js`. (Pools)
- [x] 2.5 RED `tests/unit/physics.spec.js` (no tunneling at 1200 px/s x4, substep `min(64,ceil)`, titanium reflection, wall/ceiling half-planes, crossing balls keep direction) -> GREEN `src/js/engine/Physics.js`. (Substepping, No ball-vs-ball, Titanium, Fixed-step)

## Slice 3: Level loading (level-loading; HU-06 s4, HU-08 s4)

- [x] 3.1 GREEN `src/js/entities/Block.js`, `src/js/entities/Multiplier.js` (types, HP ranges, orb radius 24). (Entities, Block types)
- [x] 3.2 RED `tests/unit/level-validator.spec.js`: schema fields, HP ranges, grid integrity, `LAUNCHER_OUT_OF_RANGE`, hard failure -> GREEN `src/js/system/LevelValidator.js`. (Schema, Grid, Hard failure)
- [x] 3.3 RED `tests/unit/trap.spec.js`: `TRAP_CLOSED`, `TRAP_ENTRY_TOO_WIDE`, 1-2 cell entry, pocket 1..12, standard never a wall -> GREEN `src/js/system/TrapAnalysis.js`. (Core and loop-trap, P4)
- [x] 3.4 RED atomic-load test (failed `loadLevel` keeps old state) -> GREEN `src/js/system/Board.js`, `src/js/system/LevelCatalog.js`. (Board B1, No partial state)
- [x] 3.5 Wire `validateLevel` to call `TrapAnalysis` and static reachability stub (completed in 4.4). (Core reachability)

## Slice 4: Aiming (aiming; HU-01)

- [x] 4.1 RED `tests/unit/raycaster.spec.js`: rounded-rect Minkowski hit, 1 bounce, second segment 180 px, clamp `|dir.y|>=0.05`, orbs ignored -> GREEN `src/js/system/Raycaster.js`. (First-contact, Single segment, Angle clamp)
- [x] 4.2 RED `tests/unit/reachability.spec.js`: sweep 3600 angles, `static` vs `preview` geometry, unbounded post-bounce segment -> GREEN `Raycaster.sweep`. (Reachability checking)
- [x] 4.3 RED validator test: unreachable core -> error -> GREEN hook `Reachability.sweep` into `LevelValidator.js`. (Core reachability)

## Slice 5a: FSM, input, session core (game-state; HU-01, HU-03, HU-05, HU-09 s1)

- [x] 5a.1 RED `tests/unit/fsm.spec.js`: table rows incl. `Loading -> Title`, `Loading -> Aiming` throws, no return to Loading/Title -> GREEN `src/js/system/Fsm.js`. (FSM states)
- [x] 5a.2 RED `tests/unit/input.spec.js`: `Loading` ignores all, `Title` only pointer FIRE, right-click/`Esc` inert, key map 1/2/4/P/R/Space -> GREEN `src/js/system/Input.js`. (Input mapping, Speed keys)
- [x] 5a.3 GREEN `src/js/system/EventRing.js` + test `tests/unit/session.spec.js` case: 1024 ring, overwrite oldest, `eventOverflow` counted, state unaffected. (D2)
- [x] 5a.4 RED session tests: `setLoadProgress` -> Title, `loadLevel` atomic, AIM only in Aiming, FIRE locks direction -> GREEN `src/js/system/GameSession.js` core (`createSession`, `dispatch`, `step`, `snapshot`). (Aim only in Aiming, Fire locks direction)
- [x] 5a.5 RED pause/restart/NEXT gating tests (paused only PAUSE/RESTART act; PAUSE ignored in Resolving/Victory/GameOver; RESTART clears paused) -> GREEN in `GameSession.js`. (Pause, Restart)

## Slice 5b: Volley economy, hook, boot (volley-economy; HU-03, HU-04, HU-05)

- [ ] 5b.1 RED `tests/unit/volley.spec.js`: emission spacing equal at 1X/2X/4X (`simTime`), first ball on FIRE, last-ball-lands-while-Firing, Resolving order Victory > GameOver > Aiming, launcher x from first landing -> GREEN `GameSession.js` emission + Resolving. (Shot=volley, Turn-end sync, Volley size)
- [ ] 5b.2 RED `tests/unit/orbs.spec.js`: capture once per orb per substep, `pendingBonus` reset after Resolving, volley capped at 50 -> GREEN orb capture + growth in `GameSession.js`. (Orb capture, Volley growth)
- [ ] 5b.3 RED `tests/unit/volley-cap.spec.js`: 45 s `volleySimTime` releases balls, damage kept, `VOLLEY_CAPPED`, launcher x unchanged if none landed; `sealedFloor`/`volleyCapS` config -> GREEN cap + stress config. (Volley time cap, D11)
- [ ] 5b.4 RED block-damage test (1 hit = 1 HP, destroy at 0) -> GREEN damage in `Physics`/session. (Block damage and destruction)
- [ ] 5b.5 RED e2e `tests/e2e/hook.spec.js` (hook present with `?test=1`, absent without, `NOT_READY` in Loading, replay equality at `setSeed(42)`) -> GREEN `src/js/system/TestHook.js` + `src/js/main.js` boot (levels only to `setLoadProgress`). (Flag-gated hook, Determinism)

## Slice 6a: Loop, viewport, atlas (rendering; HU-02, HU-01 s1)

- [ ] 6a.1 RED `tests/browser/viewport.spec.js`: `mapClientToLogical`, fit scale, DPR -> GREEN `src/js/system/Viewport.js`. (DPR and mouse mapping)
- [ ] 6a.2 RED `tests/browser/atlas.spec.js`: 128x64 -> 112x56 pre-scale once, OffscreenCanvas fallback, missing image -> placeholder -> GREEN `src/js/system/Atlas.js`. (Atlas and sprite scale, Assets missing)
- [ ] 6a.3 RED `tests/e2e/loop-clock.spec.js` (clamp 0.25, fixed STEP count under `page.clock`; skip per S1 fallback) -> GREEN `src/js/system/Loop.js`; wire `&loop=1`. (Fixed-timestep loop)

## Slice 6b: Renderer, particles, stress (rendering; HU-02, NFR Performance)

- [ ] 6b.1 RED particle pool tests (512, drop-on-full, 400 ms life) -> GREEN `src/js/entities/Particle.js`, `src/js/system/Particles.js`. (Destruction particles)
- [ ] 6b.2 GREEN `src/js/system/Renderer.js`: static bg layer (dirty), HP tint/cracks, flash, balls, aim, launcher; verified via hook-driven e2e smoke (no pixel asserts). (Static layer, HP feedback)
- [ ] 6b.3 RED `tests/e2e/stress.spec.js` + `tests/fixtures/stress-level.json`: `?test=1&loop=1&stress=1`, `setVolley(50)`, 4X, 600 frames <= 16.7 ms avg, `active==50`, pool `created` unchanged -> GREEN tune hot paths. (50 balls at 4X, Frame rate)

## Slice 7a: strings + HudModel (hud; HU-03, HU-05 s1)

- [ ] 7a.1 GREEN `src/js/system/strings.js` (Spanish copy, incl. start-screen keys). (P2, E9)
- [ ] 7a.2 RED `tests/unit/hud-model.spec.js`: BOLAS/pips (A3), TURNOS colors (white, amber <=3, magenta <=1), TIEMPO `mm:ss`, control panel, pause overlay -> GREEN `src/js/system/Hud.js`. (Telemetry, Turns bar, Control panel, Pause overlay)
- [ ] 7a.3 RED modal model tests (victory stars/score/record, defeat PUNTOS + "Reiniciar puzzle [R]", `Enter` primary) -> GREEN modal model in `Hud.js`. (Victory/Defeat modal, Button actions)

## Slice 7b: Progression + modals (progression; HU-03, HU-08 s1/s3)

- [ ] 7b.1 RED `tests/unit/progression.spec.js`: stars (A1: 1 shot = 3, <= floor(50%) = 2), score = damage + 100 x unused (P1), best-record replace rule, unlock derived from records, `NEXT` gating, end of content -> GREEN `src/js/system/Progression.js`. (Star rating, Score, Unlock, Chain and end)
- [ ] 7b.2 RED `tests/browser/storage.spec.js`: `anglecraft.v1.records`, try/catch + memory fallback, restart never touches records -> GREEN storage in `Progression.js`. (Record persistence, Session start)
- [ ] 7b.3 Wire Victory/GameOver modals and `Progression` into `GameSession.js` + `Renderer.js`; RED e2e win flow via hook. (Victory modal)

## Slice 8a: Audio (audio; HU-02, HU-04)

- [ ] 8a.1 RED `tests/unit/audio-seam.spec.js`: Null/Recording sinks, `audioLog`, combo ladder, voice limits, event-to-sound mapping, synth recipes keyed by name -> GREEN `src/js/system/AudioSinks.js`. (Test seam, Combo ladder, Event sounds)
- [ ] 8a.2 RED `tests/browser/webaudio.spec.js`: `unlock()` creates the realtime context, fixed chain, gapless music loop, synth fallback on failed sample, volume persistence -> GREEN `src/js/system/WebAudio.js`. (Gesture unlock, Fixed chain, Music loop, Fallback, Volume)

## Slice 8b: Start screen (start-screen; HU-09)

- [ ] 8b.1 RED `tests/unit/asset-loader.spec.js`: per-asset settle progress, failed audio settles and lands in `failed[]`, level fetch/validate failure rejects -> GREEN `src/js/system/AssetLoader.js` with OfflineAudioContext decode. (Blocking loading, Failed audio)
- [ ] 8b.2 RED `tests/unit/title-screen.spec.js`: title at (960, 470), 600x12 progress bar, pulsing prompt, no board/HUD -> GREEN `src/js/system/TitleScreen.js`. (Centered title, Ready prompt)
- [ ] 8b.3 RED `tests/e2e/start-screen.spec.js`: input ignored in Loading, key on Title ignored, click -> Aiming L1 with `audioLog` unlock + music, 404 sample still reaches Title (`page.route`), `loadError` on bad level -> GREEN wire boot in `src/js/main.js`. (Input ignored, Start on click)

## Slice 9a: Levels 4-6 (level-content; HU-06, HU-08 s2/s4)

- [ ] 9a.1 RED `tests/unit/level-content.spec.js`: L1-L3 authored cells and `isTrapEntry` entries (L1 `(4,1)`/`[(3,2)]`, L2 `(7,1)`/`[(6,2)]`, L3 `(4,4)`/`[(4,6)]`), L1 bounce path, L2 no direct line -> GREEN adjust `src/levels/level{1,2,3}.json` only if needed. (Levels 1-3)
- [ ] 9a.2 RED L4-L6 constraints (`shots` 10-15, `startBalls` 3-10, HP 100-500 with `T4<=T5<=T6`, >= 2 mechanics, validate + reachability) -> GREEN `src/levels/level{4,5,6}.json`. (Challenge levels, Structural rules)

## Slice 9b: Solutions + playthrough (level-content; Completability)

- [ ] 9b.1 GREEN `tests/fixtures/solutions.json`: seeded angle sequences L1-L6 found via hook.
- [ ] 9b.2 RED `tests/e2e/playthrough.spec.js`: Title start, L1 -> L6 Victory in order, records written, NEXT gating, end-of-content notice -> GREEN tune levels if any fails. (Completability, Chain and end)
- [ ] 9b.3 Final run of `npx playwright test` green; confirm `package.json` has no `dependencies`.
