# Exploration: anglecraft-v1-core

Scope: HU-01..HU-06 as a playable browser game (vanilla JS ES modules + Canvas 2D, no runtime libraries) plus Playwright test bootstrap. Out of scope: main menu, level select, settings, full pause screen.

## Current State
- Scaffold only: `src/js/**` are empty class stubs; `main.js` has 2 comments. `index.html` has one 1920x1080 canvas + module script; `styles.css` has design tokens and `object-fit: contain`. No `package.json`, no Playwright.
- Levels (9x12, `launcher.x` 0.5):
  - L1: shots 10, startBalls 3, core 100 at (4,1), entry (3,2), 1 orb v1.
  - L2: shots 12, startBalls 5, core 150 at (7,1), entry (6,2), 1 orb v1.
  - L3: shots 12, startBalls 8, core 400 at (4,4) in 3x3 cavity, entry (4,6), 2 orbs v2.
- `level.schema.json` does not enforce grid bounds, unique cells, loop-trap rule or reachability; `validateLevel` must.
- Atlas: 14 frames (`brick_low/mid/high/steel` 128x64, `crack_30/60/90`, `ball` 32, `orb_splitter` 64, `cursor_crosshair`, `traj_dot/tile/bounce/impact`). 18 SFX + 45 MB WAV music.
- Missing assets: `hit_flash*`, `spark`, `particle_*`, `launcher*`, 112x56 re-export, 14 screen SFX, OGG music, video poster.
- UI mockup: left TELEMETRIA (STAGE, BOLAS pips active/remaining/used, TURNOS bar white > amber <=3 > magenta <=1, PUNTOS, PRECISION), board 1080x1000, right CONTROL (LANZAR, VELOCIDAD, ATAJOS: Mouse aim, Click fire, Right-click cancel, Esc menu), PAUSA overlay, RESUELTO/FALLIDO modals with PUNTOS, PRECISION, TIEMPO + record, 3 stars, buttons Repetir / Siguiente nivel / Reiniciar.

## Capability Map
| Capability | User stories |
|---|---|
| test-harness | all |
| physics | HU-02 s3/s4, HU-05 s2 |
| aiming | HU-01 |
| level-loading | HU-06 s4 |
| blocks | HU-02, HU-04 s1 |
| game-state | HU-01 s4, HU-03 s1/s4/s5, HU-05 |
| volley-economy | HU-04, HU-03 |
| rendering | HU-02 s1/s2 |
| audio | HU-02, HU-04 |
| hud | HU-03, HU-05 |
| progression | HU-03 s2/s3, HU-06 s5 |
| tutorial-levels | HU-06 |

## Approaches
- A: layered pure modules + thin `main.js`. **Recommended.**
- B: everything in `main.js`. Rejected (untestable).
- C: DOM-free `GameSession` driven by `step(dt)`. **Recommended together with A.**

## Slicing (auto-chain, <= 800 changed lines incl. tests)
| # | Slice | Est. lines | Depends on |
|---|---|---|---|
| 1 | test-harness: package.json (`"type":"module"`), Playwright config + webServer, static server, smoke test | ~150 | — |
| 2 | physics core: Vector2D, Collision, Physics, ObjectPool | ~450 | 1 |
| 3 | level-loading: validateLevel (bounds, unique cells, loop trap), Block/Multiplier, layout | ~550 | 1 |
| 4 | aiming: Raycaster, 1-bounce preview, angle clamp, reachability | ~400 | 2, 3 |
| 5 | game-state: FSM, input, GameSession, volley, orbs, speed keys, restart (split 5b volley-economy if > 800) | ~700 | 2, 3, 4 |
| 6 | rendering: loop, atlas, offscreen layer, particles, DPR + mouse mapping | ~650 | 5 |
| 7 | hud + progression: panels, modals, stars, localStorage, unlock | ~700 | 5, 6 |
| 8 | audio | ~500 | 5 |
| 9 | e2e playthrough L1-L3 + level tuning | ~400 | 6, 7, 8 |

## Testing a No-Build Game with Playwright
- Static server required (`file://` blocks ES modules and `fetch`). Recommended: `scripts/static-server.mjs` on `node:http` (~40 lines, `text/javascript` MIME, bound to 127.0.0.1, root-jailed), wired through Playwright `webServer` with `reuseExistingServer`.
- Pure modules: Node-side tests inside `@playwright/test` (no browser). Browser-side `page.evaluate` + dynamic `import()` for DOM/Canvas/Audio/Storage. Single runner.
- Determinism: flag-gated test hook (`?test=1` / `window.__ANGLECRAFT__`) exposing `step(n)` (STEP = 1/120), `snapshot()`, `loadLevel(json)`, `fire(angle)`, `setSeed`. rAF only drives `GameSession.update`. Seeded RNG injected. Audio asserted through a recording/null seam (headless AudioContext stays suspended).
- Install: `npm i -D @playwright/test` and `npx playwright install chromium`.

## Open Questions
Blocking: A1, A2, A3, A5, A6, A10, A11, B1, C1, C2, C3, D1, D3, E1, E2, E4 (see `state.yaml`).
Design with default: A4, A7, A8, A9, A12, B2-B6, C4-C6, D2, D4, D5, E3, E5-E12.

## Risks
- HUD scope can exceed 800 lines without scope decisions.
- Performance with 200+ balls at 4X (substep cap 64; may need a spatial grid; pool sizing depends on orb growth).
- Non-determinism (`Math.random`, `Date.now`, rAF-coupled logic) would make e2e flaky.
- Level balance/reachability only verifiable after physics + raycaster.
- 128x64 sprites vs 112x56 layout; 8 vs 9 columns.
- 45 MB WAV decode memory.
- Cursor mapping through `object-fit: contain` + DPR.
- Loop-trap rule needs a machine-checkable definition.
- Playwright browser download; OneDrive path may slow `node_modules`; ESM requires `"type":"module"` and explicit extensions; no linter/formatter.

## Ready for Proposal
No. Blocking product decisions pending.
