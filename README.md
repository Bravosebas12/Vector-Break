# AngleCraft

A physics brick-breaker puzzle for desktop browsers. Aim, fire a volley of balls and use bounces, titanium deflectors and loop traps to destroy every core in as few shots as possible.

Built with **vanilla JavaScript ES modules and Canvas 2D**: the game has no runtime dependencies, frameworks or build step.

## Requirements

| Requirement | Needed for |
|---|---|
| [Node.js](https://nodejs.org/) 22, 24 or 26 (tested with 24) | Local server and tests |
| A desktop browser: Chrome, Edge, Firefox or Opera (last 2 versions) | Playing |

The game must be served over HTTP. Opening `index.html` directly (`file://`) does not work because browsers block ES modules and asset loading from local files.

## Play locally

No packages are needed to play:

```bash
node scripts/static-server.mjs
```

Open http://127.0.0.1:4173 and click to start once loading finishes. Use `--port <n>` or the `PORT` environment variable to change the port.

### Controls

| Input | Action |
|---|---|
| Mouse | Aim (shows a one-bounce preview) |
| Left click / `Space` | Fire |
| `1` / `2` / `4` | Simulation speed 1X / 2X / 4X (while balls are in flight) |
| `P` | Pause / resume |
| `R` | Restart the level |
| `Enter` or click | Modal action (next level / restart) |

Every session starts at level 1. Best records (stars, score, shots) are stored in `localStorage`.

## Run the tests

Tests use [Playwright](https://playwright.dev/) `@playwright/test` 1.63.0, the project's only (development) dependency.

```bash
npm ci                            # install dev dependencies
npx playwright install chromium   # one-time browser download
npx playwright test               # full suite (unit, browser and e2e projects)
```

Playwright starts the static server automatically. Useful variants:

```bash
npx playwright test --project=unit        # Node-side pure-module tests only
npx playwright test tests/e2e             # end-to-end tests only
```

### Test hooks

Adding `?test=1` to the URL exposes a deterministic hook on `window.__ANGLECRAFT__` (`step`, `snapshot`, `loadLevel`, `fire`, `setSeed`, ...). Extra flags: `&loop=1` (real animation loop), `&audio=1` (real Web Audio) and `&stress=1` (sealed-floor stress mode).

## Project structure

```
index.html, styles.css     Entry page and UI design tokens
src/js/main.js             Boot: assets, input, audio and render wiring
src/js/engine/             Vector math, collision, physics
src/js/entities/           Ball, Block, Multiplier, Particle
src/js/system/             Game session/FSM, levels, raycaster, renderer, HUD, audio, progression
src/levels/                Level JSON files (level1-level6)
assets/                    Sprite atlas, audio and video
scripts/static-server.mjs  Zero-dependency local server
tests/                     unit, browser, e2e, spikes and fixtures
openspec/                  Specs (source of truth) and archived changes
Design/                    User stories, UI mockup and design requests
.claude/skills/            Project skills used for AI-assisted development
```

## Known gap and next steps

The v1 visuals do not yet match the delivered design (sprites, colors, fonts, HUD layout, logo). The diagnosis and the plan to fix it are in [`docs/plan-fidelidad-visual.md`](docs/plan-fidelidad-visual.md).

## Specifications

The behavior of the game is specified in [`openspec/specs/`](openspec/specs/) (12 capabilities). The full history of the first release (exploration, proposal, design, tasks and verification) is archived in [`openspec/changes/archive/2026-10-21-anglecraft-v1-core/`](openspec/changes/archive/2026-10-21-anglecraft-v1-core/).
