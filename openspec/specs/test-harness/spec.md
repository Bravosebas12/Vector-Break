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

When the page is loaded with `?test=1`, the game MUST expose `window.__ANGLECRAFT__` offering `step(n)` (advance `n` fixed steps of 1/120 s), `snapshot()` (serializable game state), `loadLevel(x)`, `fire(angle)`, `aim(x, y)`, `action(a)`, `setSeed(seed)`, `setVolley(n)` (`n <= 50`), `start()` (same path as the Title left click) and `audioLog()`. Without the flag the hook MUST NOT be present.

Every hook method other than `snapshot()` MUST throw `NOT_READY` while the session state is `Loading`; tests wait for state `Title`. `loadLevel(x)` called from `Title` MUST be a legal Title -> Aiming transition (tests may skip `start()`).

The following query flags MUST be honored only together with `?test=1`: `&loop=1` lets requestAnimationFrame step the session; `&audio=1` enables real sample loading (otherwise a Recording sink is used and audio assets settle immediately); `&stress=1` sets `sealedFloor` and `volleyCapS` to `Infinity`.

#### Scenario: Hook present with flag
- GIVEN the page loaded at `/?test=1` and the session state is `Title`
- WHEN the hook is inspected
- THEN `step`, `snapshot`, `loadLevel`, `fire`, `aim`, `action`, `setSeed`, `setVolley`, `start` and `audioLog` are functions
- AND calling `loadLevel` from `Title` moves the session to `Aiming`

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

## Open Items

- OI-1: Node-side ESM import under the runner is unverified (R3); first slice spike confirms it.
- OI-2: Behavior of `performance.now`/rAF under `page.clock` (16 vs 16.67 ms cadence) is unverified (R1).
