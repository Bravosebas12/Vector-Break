# Proposal: AngleCraft v1 Visual Fidelity

## Intent

v1 plays correctly (451 tests) but does not look like the delivered design. Bricks, ball, orbs, crosshair and aim preview are drawn with primitives although the 14 atlas sprites exist (and are byte-identical to the mockup's `BBSprites` generator); colors differ (`#0B0F24` vs `#0E1117`); fonts are `system-ui`; the HUD panels, pause overlay and modals do not follow the mockup; the title screen ignores the Key Art. This change makes the game **look** like the design without changing **how it plays**.

Input: `docs/plan-fidelidad-visual.md` and the design analysis of 2026-10-21.

## Design sources (visual source of truth)

| Source | Path |
|---|---|
| Game UI mockup (3 screens, 1920x1080) | `Design/Game UI/Game UI (standalone) (1).html`, `pantallas-game-ui.pdf` |
| Sprite kit spec | `Design/Sprite Kit/especificacion-sprite-kit.pdf` |
| Key Art (title screen) | `Design/Logo/Kit de sprites puzzle brick breaker.pdf` and Claude artifact `YDDd14kwvRNSevPLUnEV9A` |
| Sprites | `assets/sprites/spritesheet@{1,2,3}x` + `assets/sprites/svg/` (verified identical to the mockup) |

Game rules keep precedence over the mockup (skills, `openspec/specs/`, confirmed decisions A6, B1, C2, C3).

## Confirmed decisions (this change)

| ID | Decision |
|---|---|
| V1 | HUD panels, pause overlay and result modals are DOM/CSS layered over the canvas. The canvas draws only the background and the board. |
| V2 | Title screen uses the Key Art exported as a static image, with wordmark, loading bar and prompt on top. |
| V3 | Mockup elements removed by v1 rules stay out: PRECISIÓN (A6), `Esc` menu (C2), right-click cancel (C3). Their slots are filled with v1 data (see design D6). |
| V4 | Board geometry stays B1 (9x12 cells of 112x56). Sprites are scaled from 128x64 until re-export. |
| V5 | Fonts are self-hosted woff2 extracted from the mockup (IBM Plex Sans, JetBrains Mono, Latin subsets). No CDN. |

## Scope

### In Scope
- Shared color tokens (CSS custom properties + one JS module for canvas).
- Fonts: `assets/fonts/*.woff2`, `@font-face`, canvas text waits for `document.fonts`.
- Stage: fixed 1920x1080 logical stage scaled with CSS (letterboxed), canvas + DOM HUD inside it.
- Board: mockup background, board panel, sprite bricks + HP text, cracks, ball, orb (`+V`), launcher, aim preview (dots, bounce, impact), crosshair cursor, particle colors per block type.
- HUD (DOM): TELEMETRÍA and CONTROL panels, keycaps, pips, turns bar, speed selector, clickable buttons.
- Pause overlay and victory/defeat modals (DOM) with the mockup composition.
- Title screen with Key Art.
- Visual regression: Playwright `toHaveScreenshot` baselines for title, aiming, paused, victory, defeat.

### Out of Scope
- HU-07 menu, level select, settings, full pause screen, levels 7-10.
- New design assets not yet delivered (particles, hit flash, spark, launcher sprite, per-HP colors, 112x56 re-export, OGG music): placeholders stay where no asset exists.
- Missing UI sounds (pause, speed, turns, victory, stars, defeat) and the trailer.
- Any change to physics, FSM, scoring, levels or audio behavior.

## Capabilities

### New Capabilities
- `visual-theme`: tokens, fonts, 1920x1080 stage and DOM/canvas layering.

### Modified Capabilities
- `rendering`: sprites for every entity that has one; HP feedback via crack overlays; aim preview, cursor, launcher styling.
- `hud`: DOM panels, pause overlay and modals following the mockup; button actions.
- `start-screen`: Key Art background, wordmark and progress styling.
- `test-harness`: visual snapshot tests.

## Approach

Keep `Hud.js` (pure models) as the single source of HUD data; add `HudDom.js` that renders those models into static DOM nodes and only patches text/attributes when values change. Replace `HudView.js` canvas drawing and canvas hit-testing with DOM buttons dispatching existing actions (`FIRE`, `PAUSE`, `RESTART`, `SET_SPEED`, `PRESS`). The renderer swaps primitives for atlas frames inside the existing static-layer / dynamic-layer structure, so performance rules (no per-frame allocation, static layer redraw only on change) still hold.

## Delivery Slicing (auto-chain on `feature/anglecraft-v1-visual-fidelity`, <= 800 lines each)

| # | Slice | Capabilities |
|---|---|---|
| 1 | Theme foundations: tokens, fonts, stage, visual test scaffolding | visual-theme, test-harness |
| 2 | Board sprites and aim preview | rendering |
| 3 | DOM HUD panels + pause overlay | hud |
| 4 | DOM result modals | hud |
| 5 | Title screen with Key Art | start-screen |
| 6 | Visual baselines + design sign-off doc | test-harness |

## Affected Areas

`index.html`, `styles.css`, `assets/fonts/` (new), `assets/art/` (new), `src/js/main.js`, `src/js/system/{Renderer,HudView,Hud,TitleScreen,Viewport,strings}.js`, new `src/js/system/{Theme,HudDom,Fonts}.js`, tests under `tests/{unit,e2e,visual}`.

## Risks

| Risk | Mitigation |
|---|---|
| DOM HUD breaks input (panel clicks also fire a volley) | Board input listens on the canvas only; HUD buttons stop propagation; e2e covers both. |
| Fonts not ready when the static layer is drawn | `Fonts.ready()` gates the first board draw and marks the layer dirty on load. |
| Screenshot flakiness | Fixed seed, no rAF during capture, fonts awaited, animations disabled, `--repeat-each=5`. |
| `backdrop-filter` cost | Applied only to panels/modals (static), not per frame. |
| Large Key Art file | WebP, <= 600 KB. |

## Rollback

Each slice is one PR on the tracker branch; revert the slice PR. The pure HUD models and game logic are untouched, so reverting a view slice restores the previous canvas view.

## Success Criteria

- No entity with an atlas sprite is drawn with primitives.
- Colors and fonts match the mockup tokens.
- Panels, modals and title match the mockup at 1920x1080 (design sign-off on the comparison doc).
- Visual snapshot tests green and stable with `--repeat-each=5`.
- All existing tests green (updated only where they assert the old canvas HUD); no runtime dependencies.
