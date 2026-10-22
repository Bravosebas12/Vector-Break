# Test Harness Specification

## Purpose

Defines the dev-only test tooling that makes every other capability verifiable: runner, static server, deterministic clock and a flag-gated test hook. Covers all HU (cross-cutting) and the non-functional constraints on dependencies and browsers.

## Requirements

### Requirement: Dev-only runner (all HU; NFR Dependencies)

The project MUST provide a `package.json` with `"type":"module"` and `@playwright/test` pinned to `1.63.0` under `devDependencies` only. `dependencies` MUST be absent or empty. `npx playwright test` MUST run all tests on Chromium on Node 24.

#### Scenario: No runtime dependency
- GIVEN the repository `package.json`
- WHEN its `dependencies` field is read
- THEN it is absent or `{}`
- AND `devDependencies["@playwright/test"]` equals `"1.63.0"`

#### Scenario: Single command
- GIVEN a clean checkout with `npm install` and `npx playwright install chromium` done
- WHEN `npx playwright test` is run
- THEN the Chromium project executes and exits with code 0 when all tests pass

### Requirement: Static server (all HU)

A static HTTP server on `node:http` MUST serve the repository root over `http://127.0.0.1`, started through the runner's `webServer` option with `reuseExistingServer`. It MUST serve `.js`/`.mjs` as `text/javascript`, `.json` as `application/json`, `.wav` as `audio/wav`, and MUST refuse paths that resolve outside the root.

#### Scenario: ES module served
- GIVEN the server is running
- WHEN `GET /src/js/main.js` is requested
- THEN status is 200 and `Content-Type` starts with `text/javascript`

#### Scenario: Path traversal refused
- GIVEN the server is running
- WHEN `GET /../package.json` (or an encoded equivalent) is requested
- THEN status is 403 or 404 and no file outside the root is returned

#### Scenario: Large audio served
- GIVEN `assets/audio/music_loop_95bpm_64bars.wav` (about 45 MB)
- WHEN it is requested
- THEN status is 200 with `Content-Type: audio/wav` and the full body is delivered

### Requirement: Flag-gated test hook (all HU)

When the page is loaded with `?test=1`, the game MUST expose `window.__ANGLECRAFT__` offering `step(n)` (advance `n` fixed steps of 1/120 s), `snapshot()` (serializable game state), `loadLevel(x)`, `fire(angle)` (aim then FIRE one group in the current mode), `aim(x, y)`, `action(a)`, `setSeed(seed)`, `setVolley(n)` (`n <= 50`), `start()` (same path as the Title left click), `audioLog()`, `setFireMode(v)` with `v` in {1, 2, 3, 'turn'}, `move(dir, seconds)` that holds `A` (dir -1) or `D` (dir +1) for the given play time through the session (stepping included), and `setLauncherX(x)` that places the launcher at `x` clamped to `[50, 1030]`, only in `Aiming`, and recomputes the aim (a shortcut for a position reachable with `A` / `D`). `'turn'` is test-only: one `FIRE` emits every ball left in the turn, reproducing v1 behavior; it MUST NOT be reachable from game input. Without the flag the hook MUST NOT be present.

Every hook method other than `snapshot()` MUST throw `NOT_READY` while the session state is `Loading`; tests wait for state `Title`. `loadLevel(x)` called from `Title` MUST be a legal Title -> Aiming transition (tests may skip `start()`).

The following query flags MUST be honored only together with `?test=1`: `&loop=1` lets requestAnimationFrame step the session; `&audio=1` enables real sample loading (otherwise a Recording sink is used and audio assets settle immediately); `&stress=1` sets `sealedFloor` and `volleyCapS` to `Infinity`.

#### Scenario: v1 behavior preserved for legacy tests
- GIVEN `?test=1`, level 2 loaded and `setFireMode('turn')`
- WHEN `fire(angle)` is called and the session is stepped until `Aiming`, `Victory` or `GameOver`
- THEN exactly 5 balls were emitted by that single `FIRE` and shots used is 1

#### Scenario: Turn mode unreachable from input
- GIVEN the real game (no `?test=1`)
- WHEN any key or HUD control is used
- THEN the mode is always 1, 2 or 3

#### Scenario: Hook present with flag
- GIVEN the page loaded at `/?test=1` and the session state is `Title`
- WHEN the hook is inspected
- THEN `step`, `snapshot`, `loadLevel`, `fire`, `aim`, `action`, `setSeed`, `setVolley`, `start`, `audioLog`, `setFireMode`, `move` and `setLauncherX` are functions
- AND calling `loadLevel` from `Title` moves the session to `Aiming`

#### Scenario: Place the launcher
- GIVEN `?test=1` and `Aiming`
- WHEN `setLauncherX(2000)` is called
- THEN the launcher x is 1030; called in `Simulating`, it changes nothing

#### Scenario: Hook not ready while loading
- GIVEN the page loaded at `/?test=1` and the session state is `Loading`
- WHEN any hook method other than `snapshot()` is called
- THEN it throws `NOT_READY`

#### Scenario: Hook absent without flag
- GIVEN the page loaded at `/`
- WHEN the hook is inspected
- THEN no test hook is exposed

### Requirement: Determinism (all HU)

Given the same level, seed and input sequence, `snapshot()` after the same number of `step(n)` calls MUST be identical across runs. Game logic MUST NOT depend on wall-clock time or unseeded randomness.

#### Scenario: Replay equality
- GIVEN level 1 loaded, `setSeed(42)`, then `fire(angle)` and `step(3000)`
- WHEN the same sequence is repeated in a fresh page
- THEN both `snapshot()` results are deeply equal

### Requirement: Browser support and automation scope (NFR Navegadores)

The game MUST target the last 2 desktop versions of Chrome, Edge, Firefox and Opera. Automated tests MUST run on Chromium only; Opera MUST be treated as supported via the shared Chromium engine with no manual Opera check.

#### Scenario: Automation projects
- GIVEN `playwright.config.js`
- WHEN its projects are listed
- THEN all browser projects are Chromium
- AND the Node-side unit project uses no browser

### Requirement: Pure-module testability (all HU)

Pure modules (`engine`, `entities`, `system` minus DOM-bound parts) MUST be importable and testable without a browser; DOM, Canvas, Audio and Storage behavior MUST be testable in the browser context.

#### Scenario: Node-side import
- GIVEN a test file with no `page` fixture
- WHEN it imports a pure engine module by explicit `.js` path
- THEN the import succeeds and its exports are callable

### Requirement: Visual snapshot tests

The suite MUST include Playwright screenshot tests (`expect(page).toHaveScreenshot()`) at a 1920x1080 viewport, DPR 1, Chromium, for these deterministic states: title (`Title`), level 1 `Aiming` with a fixed aim, level 1 paused, a victory with 2 stars and a defeat. Each capture MUST happen only after fonts and atlas have loaded, with a fixed RNG seed, the rAF loop stopped (a single explicit render through the test hook) and CSS animations disabled. Baselines MUST live in the repository and be updated only on purpose (`--update-snapshots`) after design approval.

#### Scenario: Stable capture
- GIVEN the visual tests
- WHEN they run with `--repeat-each=5`
- THEN every run passes against the same baselines

#### Scenario: Regression detected
- GIVEN a change that alters the board background color
- WHEN the visual tests run
- THEN the aiming snapshot fails with a pixel diff

### Requirement: Single-frame render hook

With `?test=1`, the test hook MUST expose `render()` that draws exactly one frame (canvas and HUD DOM) from the current session state at a caller-provided time, without starting the rAF loop. It MUST throw `NOT_READY` while `Loading`, like the other hook methods except `snapshot`.

#### Scenario: Render once
- GIVEN `?test=1` with level 1 loaded
- WHEN `render(0)` is called twice
- THEN the renderer frame counter increases by 2 and no rAF callback is scheduled

### Requirement: Design comparison document

For design sign-off, the change MUST produce `docs/visual-fidelity-comparison.md` placing each baseline next to the matching mockup or Key Art capture, listing every intentional deviation with its rule (A6, B1, C2, C3, HU-09).

#### Scenario: Deviations listed
- GIVEN the comparison document
- WHEN read
- THEN it lists the removed PRECISIÓN, Esc and right-click entries, the 9x12 board, and the centered title, each with its rule ID

### Requirement: Traceability to the QA cases

Automated tests MUST reference the QA case IDs in their titles: `CP-01`…`CP-35` from `Design/casos/hu-10-11-casos-de-prueba.md`, `CP-36`…`CP-44` from `Design/casos/hu-14-casos-de-prueba.md` and `CP-45`…`CP-58` from `Design/casos/hu-12-casos-de-prueba.md`. Every AC of HU-10, HU-11, HU-12 and HU-14 MUST be covered by at least one automated test. Cases superseded by HU-14 (CP-01, CP-22) keep their IDs and their tests assert the HU-14 rule.

#### Scenario: Coverage check
- GIVEN the test titles
- WHEN they are searched for `CP-` IDs
- THEN every case in the three coverage matrices appears at least once

### Requirement: Solutions with launcher positions (HU-14)

The seeded solutions MUST store the launcher x for every shot (`xs` next to `angles` in `tests/fixtures/solutions.json`; an explicit `x` for every step in `tests/fixtures/solutions-mode1.json`). Replays MUST place the launcher with `setLauncherX` before each shot. Levels 1–6 MUST be won by their solution in `'turn'` mode, and levels 1–3 by their mode-1 plan, with the launcher fixed (HU-14).

#### Scenario: Replay before and after HU-14
- GIVEN the recorded positions
- WHEN the solutions are replayed with relocation on (slice 1) and off (slice 2)
- THEN every level that was won is won in the same number of shots

## Open Items

- OI-1: Node-side ESM import under the runner is unverified (R3); first slice spike confirms it.
- OI-2: Behavior of `performance.now`/rAF under `page.clock` (16 vs 16.67 ms cadence) is unverified (R1).
