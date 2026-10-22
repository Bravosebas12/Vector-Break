# Design: AngleCraft v1 Visual Fidelity

## Context

- `BOARD_ORIGIN` is already (420, 40) and the board 1080x1000, matching the mockup. Grid is B1 (9x12 cells of 112x56, `GRID_X` 36, `FLOOR_Y` 956).
- `Hud.js` holds pure HUD models (`hudModel`, `modalModel`); `HudView.js` draws them on canvas and hit-tests modal buttons; `main.js` routes `mousedown` on `window` to both modal hit testing and `FIRE`.
- `Renderer.js` already has a static offscreen layer (redrawn on HP/presence change) and a dynamic pass; only crack overlays use the atlas.
- `Atlas.js` pre-scales brick frames to 112x56; frames for ball, orb, cursor and trajectory exist in all three scales.
- The 14 SVG sources are byte-identical to the mockup generator (`BBSprites`), so no re-export is needed for fidelity.
- Mockup fonts are embedded as woff2 (Google Fonts subsets). Only the Latin subset is needed for Spanish copy (U+0000-00FF covers á é í ó ú ñ ¿ ¡ ·).

## Decisions

### D1. Stage container (visual-theme)
`index.html` gets `<div id="stage">` (1920x1080, `position:relative`) containing `<canvas id="game" width=1920 height=1080>` and `<div id="hud">`. The stage is centered and scaled with `transform: scale(s)` where `s = fitScale(innerWidth, innerHeight)` (set as a CSS variable on resize). Because the canvas keeps the stage aspect ratio, `getBoundingClientRect()` has no letterbox offset and `mapClientToLogical` and `applyViewport` keep working unchanged.
*Why*: one coordinate system for DOM and canvas; no per-element math. *Rejected*: positioning DOM panels from canvas rects on every resize (drift, more code).

### D2. Canvas draws only stage background + board
The stage background (grid and glows) is pure CSS on `#stage`. The canvas is cleared to transparent each frame and draws the board panel and its contents at `BOARD_ORIGIN`. Title/Loading draw the Key Art on the canvas (D8).
*Why*: CSS gradients are free; the canvas keeps the existing static/dynamic layering.

### D3. Tokens
`src/js/system/Theme.js` exports a frozen `COLORS` object; `styles.css` defines the same values as `--c-*` custom properties. A unit test parses `styles.css` and compares both (spec "CSS and canvas agree"). Block-type palettes (`BLOCK_TEXT`, `BURST`) live in `Theme.js`.

### D4. Fonts
Copy the two Latin woff2 files from the mockup bundle to `assets/fonts/ibm-plex-sans-latin.woff2` and `assets/fonts/jetbrains-mono-latin.woff2` (both are variable-weight files). `@font-face` in `styles.css` with weight ranges `400 600` and `400 800`, `font-display: block`. `Fonts.js` exposes `loadFonts()` returning a promise from `document.fonts.load()` for the faces the canvas uses; the AssetLoader counts it as one asset (failure settles too). The renderer sets `dirty = true` when it resolves.
*Why*: canvas does not re-render text when a webfont arrives; explicit gating avoids fallback glyphs in the static layer.

### D5. DOM HUD (`HudDom.js`)
`createHudDom(root, { dispatch })` builds the panel, pause and modal DOM once from templates and returns `update(hud, modal)`. Each dynamic node is cached; `update` compares the new model value with the last one and patches `textContent`, `className`, `style.width` or `disabled` only when changed. Buttons call `dispatch(action)` and `stopPropagation()` on `pointerdown`.
The renderer keeps the 10 Hz model refresh (`HUD_REFRESH_MS`) and calls `hudDom.update` instead of `drawHud`/`drawModal`. `HudView.js` canvas drawing and `hitModalButton` are deleted; `main.js` stops hit testing modals.
`#hud` covers the stage with `pointer-events: none`; only panels, buttons and modal scrims set `pointer-events: auto`, so the board area stays clickable on the canvas below.
Board input: `mousedown` / `mousemove` listeners move from `window` to the canvas element restricted to the board rect (`BOARD_ORIGIN` + size); keyboard stays on `window`. The Title click remains on the canvas (whole stage area is canvas while titling, HUD hidden).
*Why*: smallest change that keeps `Hud.js` as the single data source and existing model tests valid.

### D6. Filling slots removed by v1 rules
| Mockup slot | v1 content | Rule |
|---|---|---|
| Telemetry footer PRECISIÓN | TIEMPO (`mm:ss.d`) | A6 |
| Victory metric PRECISIÓN (+ pts sub-line) | PUNTOS (+ record sub-line) | A6, A5 |
| Victory TIEMPO sub-line "récord" | none (records do not store time) | A5 |
| ATAJOS Cancelar tiro / Menú | Velocidad `1 2 4`, Pausa `P`, Reiniciar `R` | C2, C3 |
| `PUZZLE 01 / 24` | `PUZZLE NN / 06` (level count) | D3_count |
`formatTime` gains tenths (`mm:ss.d`); `hudModel` gains `status`, `pips` (in flight / used / available counts) and `segments`; `modalModel` gains `time`, `turnsUsed`, `margin`, `coresLeft`, `coresHp`.

### D7. Board sprites (rendering)
- Static layer: board fill + 32 px grid + launch line gradient; per block `drawImage(frame)` by type, crack overlay via `crackFor`, HP text with `BLOCK_TEXT[type]` in `700 20px "JetBrains Mono"`. The `TINTS` ramp is removed.
- Dynamic pass: hit flash stays procedural (no asset, E5); orbs `orb_splitter` 64x64 + `+V`; balls `ball` 64x64 (the sprite's core is r7 at 32 px, so 64 px gives r14 = `BALL_RADIUS`; visuals match physics); launcher per Key Art (dashed ring r16 + glow + white core r7; muted when disabled; the glow is a cached radial-gradient sprite built once).
- Aim preview: compute the raycaster polyline as today (cached), then precompute dot positions/opacity into a preallocated Float32Array when the cache refreshes; draw `traj_dot` frames from it, `traj_bounce` at the reflection point, `traj_impact` at the contact. `cursor_crosshair` at the last mouse position; canvas `cursor: none` while over the board.
- Particles: `BURST` color per block type from `Theme.js`.
- No new per-frame allocations (atlas frames are resolved once in `setAtlas`).

### D8. Title screen
Export the Key Art once (dev time) by rendering the Claude artifact with `showTitle=false` in headless Chromium at 1920x1080 DPR 2, saved as `assets/art/key-art.webp` (target <= 600 KB; documented script in `scripts/export-key-art.mjs`, dev-only). At runtime the AssetLoader loads it as an `Image` (one asset). `TitleScreen.drawTitle` draws: key art (or nothing if failed, the CSS stage shows through), a bottom gradient band, the wordmark centered at (960, 760), tagline at y 830, then progress bar/label or the pulsing prompt. `titleModel` stays pure and keeps its centered-title contract (existing unit tests).
Tagline: the Key Art says "Setenta y dos bolas" but the v1 cap is 50 balls; `strings.tagline` is `Un ángulo. Cero margen de error.` until design confirms copy (open item OI-1).

### D9. Visual tests
New `tests/visual/*.spec.js` project in `playwright.config.js` (Chromium, viewport 1920x1080, `deviceScaleFactor: 1`, `animations: 'disabled'`, `maxDiffPixelRatio: 0.002`). States are produced through the hook: `setSeed`, `loadLevel`, `aim`, `action({type:'PAUSE'})`, scripted solutions from `tests/fixtures/solutions.json` for victory, exhausting shots for defeat. Capture after `await document.fonts.ready` and `hook.render(0)`. The hook gets `render(nowMs)` (D9 needs it; spec "Single-frame render hook").

### D10. Slices and ownership of existing tests
| Slice | Files | Tests changed |
|---|---|---|
| 1 Foundations | index.html, styles.css, Theme.js, Fonts.js, Viewport.js (scale var), assets/fonts, playwright.config.js (visual project), TestHook.render | new: theme tokens, fonts e2e, stage alignment e2e |
| 2 Board | Renderer.js, Atlas.js (frame lookup), Theme.js | renderer.spec (sprite calls), particles colors |
| 3 HUD panels | HudDom.js, Hud.js, Renderer.js, main.js (input on canvas), strings.js | hud-model, input/e2e panel click, pause |
| 4 Modals | HudDom.js, Hud.js, main.js, HudView.js (delete) | modal-click unit/e2e rewritten for DOM buttons |
| 5 Title | TitleScreen.js, AssetLoader spec, strings.js, assets/art, scripts/export-key-art.mjs | title-screen unit (Key Art), start-screen e2e |
| 6 Baselines | tests/visual/*, snapshots, docs/visual-fidelity-comparison.md | new visual suite |

## Open Items

- OI-1: Tagline copy (Key Art says 72 balls; v1 cap is 50). Using a neutral line until design confirms.
- OI-2: Per-HP color variants (pending design item 2.5). Crack overlays carry HP feedback meanwhile.
- OI-3: Brick re-export at 112x56 (pending item 2.2). Scaling from 128x64 meanwhile.
- OI-4: Launcher sprite (pending item 2.6). Key Art launcher style is drawn procedurally meanwhile.
