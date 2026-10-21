# Proposal: AngleCraft v1 Core

## Intent

The repo is a scaffold of empty stubs. Deliver a playable v1 browser game (HU-01..HU-06, HU-08, HU-09) in vanilla JS + Canvas 2D, built with strict TDD on Playwright. Decisions are binding per `state.yaml` `confirmed_decisions`.

## Scope

### In Scope
- Playwright 1.63.0 (dev-only), `package.json` (`"type":"module"`), `node:http` static server
- Physics (balls pass through each other, P5), aiming preview (1 bounce), FSM with `P` pause, speed keys 1/2/4, `R` restart
- HU-09 start screen (P7): centered title, blocking load of sprites/levels/audio/music with progress, input ignored while loading, click to start (unlocks audio, loads L1)
- Orbs (`+V`, cap 50 per volley in v1, applies to all later volleys), stars/score/records in `localStorage`
- Rendering, HUD (no PRECISION), victory/defeat modals, audio (WAV music, unlock on the title click)
- 6 levels: L1-L3 existing tutorial, L4-L6 new challenge levels; session always starts at L1

### Out of Scope
- HU-07 main menu, level select, settings, full pause screen, `Esc`, right-click cancel, precision metric
- Volleys above 50 balls and the 200-ball performance target (deferred to the levels 8-10 spec)
- OGG music, sprite re-export, Opera/Firefox/Edge automation

## Capabilities

### New Capabilities
- `test-harness`: runner, static server, flag-gated test hook
- `physics`: vectors, circle-AABB, substepping, pools
- `aiming`: raycaster, 1-bounce preview, angle clamp
- `level-loading`: `validateLevel`, entities, board layout (B1)
- `game-state`: FSM (incl. `Loading`, `Title`), input actions, pause, restart, speed
- `start-screen`: title, blocking asset loading with progress, click to start (HU-09)
- `volley-economy`: shots, volleys, orbs (A2, A10, A10_v1_cap)
- `rendering`: loop, atlas, particles, DPR mouse mapping
- `hud`: telemetry/control panels, modals
- `progression`: stars, score, records, next-level unlock, end of content
- `audio`: SFX, music loop, gesture unlock
- `level-content`: tutorial L1-L3 and challenge L4-L6 rules

### Modified Capabilities
None

## Approach

Layered pure ES modules (`engine`, `entities`, `system`) plus a DOM-free `GameSession.step(dt)` (fixed STEP 1/120, seeded RNG). `main.js` is a thin rAF/DOM adapter. A `?test=1` hook exposes `step`, `snapshot`, `loadLevel`, `fire`, `setSeed`. Audio sits behind a recording/null seam.

## Delivery Slicing (auto-chain, <= 800 lines each)

| # | Slice | HU |
|---|---|---|
| 1 | test-harness + spikes (clock, ESM, server) | all |
| 2 | physics | HU-02, HU-05 |
| 3 | level-loading | HU-06 s4, HU-08 s4 |
| 4 | aiming | HU-01 |
| 5 | game-state (incl. `Loading`/`Title` FSM rows) + volley-economy (split if > 800) | HU-01, HU-03, HU-04, HU-05, HU-09 s1 |
| 6 | rendering | HU-02 |
| 7 | hud + progression | HU-03, HU-08 s1/s3 |
| 8 | audio + start-screen (boot loader, title/progress render, click unlock; split 8a audio / 8b start-screen if > 800) | HU-02, HU-04, HU-09 |
| 9 | L4-L6 JSON + tuning + e2e L1-L6 | HU-06, HU-08 s2 |

## Affected Areas

| Area | Impact |
|---|---|
| `package.json`, `playwright.config.js`, `scripts/static-server.mjs`, `tests/` | New |
| `src/js/{engine,entities,system}/*.js`, `src/js/main.js`, `index.html` | Modified |
| `src/levels/level{4,5,6}.json` | New |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| 50 balls at 4X misses 60 FPS | Low | Substep cap, pools, direct cell lookup, no ball-ball tests |
| e2e non-determinism | Med | Fixed step, seeded RNG, `page.clock` |
| L4-L6 balance/reachability | Med | Raycaster reachability tests |
| Slices 5/7 exceed 800 lines | Med | Pre-split at tasks |
| 62 MB decoded WAV | Low | Blocking `Loading` state with progress (HU-09) |

## Rollback Plan

Each slice is an isolated PR; revert it in reverse chain order. No runtime deps or data migrations; clearing `anglecraft*` `localStorage` keys resets records.

## Dependencies

- `@playwright/test` 1.63.0, Chromium download, Node 24

## Success Criteria

- [ ] `npx playwright test` green on Chromium
- [ ] L1-L6 pass `validateLevel` and reachability
- [ ] Seeded e2e plays L1 to L6 victory
- [ ] No runtime dependency in `package.json`
- [ ] 50 simultaneously active balls at 4X hold ~60 FPS (200 deferred to levels 8-10)
- [ ] Title screen blocks input until loaded; click starts L1 with audio
