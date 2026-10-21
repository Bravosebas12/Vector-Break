# Tasks: AngleCraft v1 Visual Fidelity

Strict TDD: in every task write or update the failing test first, then the code. Each slice is one PR to `feature/anglecraft-v1-visual-fidelity`, <= 800 changed lines including tests. Verify each slice with `npx playwright test` (3 runs, decide by exit code). Playwright is already bootstrapped (v1), so no bootstrap group is needed.

## 0. Setup

- [x] 0.1 Clone/work outside OneDrive, `npm ci`, `npx playwright install chromium`, baseline run: 451 green.

## 1. Slice 1 - Theme foundations (visual-theme, test-harness)

- [x] 1.1 Test: `Theme.js` tokens equal the `--c-*` properties parsed from `styles.css`; then add `Theme.js` and the CSS tokens.
- [x] 1.2 Extract the Latin woff2 files of IBM Plex Sans and JetBrains Mono from the mockup bundle into `assets/fonts/`; add `@font-face` (weight ranges, `font-display: block`).
- [x] 1.3 Test (e2e): fonts requested only from `/assets/fonts/`, no third-party requests; 404 font still reaches `Title`. Add `Fonts.js` `loadFonts()` and register it as one AssetLoader asset.
- [x] 1.4 Test (e2e): stage scale/centering and DOM/canvas alignment at 1280x900 and 1000x1000 (<= 1 px); panel regions are asserted in 3.2 once the DOM panels exist. Restructure `index.html` (`#stage`, `#game`, `#hud`), CSS scale variable set by `Viewport.js` on resize, stage background (grid + glows).
- [x] 1.5 Test (unit/e2e): `hook.render(t)` draws one frame, throws `NOT_READY` in `Loading`, schedules no rAF. Implement in `TestHook.js` / `main.js`.
- [x] 1.6 Add the `visual` project to `playwright.config.js` (Chromium, 1920x1080, DPR 1, animations disabled) with one smoke screenshot test of the stage only.

## 2. Slice 2 - Board sprites and aim preview (rendering)

- [x] 2.1 Test: static layer draws `brick_low/mid/high/steel` per type at 112x56 and no `fillRect` for block bodies (mock ctx). Replace the `TINTS` ramp with sprites; HP text font/colors from `Theme.js`; steel without number.
- [x] 2.2 Test: crack overlay sequence none/30/60/90 for HP 10/7/4/1 (existing `crackFor`, now drawn from the atlas only).
- [x] 2.3 Test: board surface (fill, 32 px grid, launch line gradient at y 956) is in the static layer; layer redraw count unchanged when idle.
- [x] 2.4 Test: balls drawn with `ball` at 64x64 centered on interpolated positions; orbs with `orb_splitter` 64x64 + `+V` label.
- [x] 2.5 Test: launcher enabled vs disabled styling (cyan dashed ring + glow vs muted, no glow); cached glow sprite created once.
- [x] 2.6 Test: aim preview dot positions/opacity (28 px spacing from 36 px, `1 - 0.55 s/total`) computed once per cache refresh into a preallocated buffer; `traj_bounce` and `traj_impact` placed at reflection/contact; crosshair at mouse; `cursor: none` over the board.
- [x] 2.7 Test: particle burst colors per block type from `Theme.js`.
- [x] 2.8 Re-run the stress spec: 60 FPS budget and zero pool growth still hold.

## 3. Slice 3 - DOM HUD panels and pause (hud)

- [x] 3.1 Test (unit): `hudModel` adds `status` (label + color), pip counts (in flight / used / available), turn segments and colors (`#E7EAF0` / `#FF9E00` / `#F72585`), `formatTime` with tenths; ATAJOS without `Esc` / right click.
- [x] 3.2 Test (e2e): TELEMETRÍA content for a running level (STAGE, `PUZZLE 01 / 06`, BOLAS, TURNOS, PUNTOS, TIEMPO, no PRECISIÓN).
- [x] 3.3 Test (e2e): CONTROL buttons: LANZAR fires once in `Aiming` and is disabled otherwise; Pausa/Seguir toggles; Reiniciar restarts; speed options dispatch `SET_SPEED` and reflect the active speed; disabled when not allowed.
- [x] 3.4 Test (e2e): click inside a panel outside buttons does not fire; board clicks still fire. Move pointer listeners to the canvas board rect; `#hud` `pointer-events` rules.
- [x] 3.5 Test (e2e): pause overlay covers the board only, visible after `P`, hidden after second `P`.
- [x] 3.6 Test: idle HUD produces no node additions/removals over 120 frames (MutationObserver). Implement `HudDom.js` panels with keycaps; wire it in `Renderer.js`; remove `drawHud`.

## 4. Slice 4 - DOM result modals (hud)

- [x] 4.1 Test (unit): `modalModel` victory fields (stars, perfect, record/new record, time, turns used, margin, buttons Repetir + Siguiente nivel / last level) and defeat sentence with singular/plural.
- [x] 4.2 Test (e2e): victory modal with 2 stars and with 3 stars (`TIRO PERFECTO`); last level shows notice and no Siguiente nivel.
- [x] 4.3 Test (e2e): defeat modal copy, `R` and button restart within 500 ms; `Enter` triggers the primary button.
- [x] 4.4 Rewrite `tests/unit/modal-click.spec.js` and `tests/e2e/modal-click.spec.js` for DOM buttons (replace `waitForTimeout(200)` with a state wait). Implement modals in `HudDom.js`; delete `HudView.js` and modal hit testing in `main.js`.

## 5. Slice 5 - Title screen with Key Art (start-screen)

- [x] 5.1 Write `scripts/export-key-art.mjs` (dev-only, Playwright) that renders the Key Art artifact HTML with `showTitle=false` at 1920x1080 DPR 2 and writes `assets/art/key-art.webp` (<= 600 KB). Run it and commit the image.
- [x] 5.2 Test (unit): `titleModel` keeps the wordmark centered at x 960 in `Loading` and `Title`; progress 12/30 -> 40%; prompt in `Title`.
- [x] 5.3 Test (e2e): Key Art counted as an asset; 404 Key Art still reaches `Title` and starts on click.
- [x] 5.4 Implement `drawTitle` (key art, band, two-color wordmark, tagline, bar, pulsing prompt); add `strings.tagline`.

## 6. Slice 6 - Visual baselines and sign-off (test-harness)

- [ ] 6.1 Visual tests: title, aiming (fixed aim), paused, victory (2 stars), defeat; deterministic via seed + `render(0)` + `document.fonts.ready`.
- [ ] 6.2 Generate baselines; run `--repeat-each=5` green.
- [ ] 6.3 Write `docs/visual-fidelity-comparison.md` (baseline vs mockup/Key Art, deviations with rule IDs); request design approval.
- [ ] 6.4 Full suite 3 runs green; update `README.md` (visual tests, fonts, Key Art export).
