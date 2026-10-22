# Visual Theme Specification

## Purpose

Color tokens, typography, the 1920x1080 stage and the DOM/canvas layering shared by every screen. Source of truth: `Design/Game UI/Game UI (standalone) (1).html` (decisions V1, V5).

## Requirements

### Requirement: Single source of color tokens

The game MUST define the mockup colors once for CSS (custom properties on `:root`) and once for canvas (`src/js/system/Theme.js`), with identical values. No other module MAY hardcode a color outside these tokens. Required tokens:

| Token | Value |
|---|---|
| body | `#080A0E` |
| stage background | `#0E1117` |
| stage grid line | `#141923` |
| border | `#2A2E39` |
| text | `#E7EAF0` |
| text strong | `#F4F7FB` |
| text muted | `#8A93A6` |
| text dim | `#5D6578` |
| cyan | `#00F5D4` |
| amber | `#FF9E00` |
| magenta | `#F72585` |
| violet | `#7209B7` |
| steel | `#2B2D42` |

#### Scenario: CSS and canvas agree
- GIVEN `styles.css` and `Theme.js`
- WHEN every token is compared
- THEN each CSS custom property equals the matching `Theme.js` value

#### Scenario: No stray colors
- GIVEN the source of `Renderer.js`, `HudDom.js` and `TitleScreen.js`
- WHEN searched for hex color literals
- THEN none is found outside `Theme.js`

### Requirement: Self-hosted fonts

The game MUST load IBM Plex Sans (400, 500, 600) and JetBrains Mono (400-800) from `assets/fonts/*.woff2` via `@font-face`, with no network request to a third-party host. UI text MUST use IBM Plex Sans for headings and prose and JetBrains Mono for labels, numbers and keycaps, as in the mockup. Canvas text MUST NOT be drawn with a fallback font once the fonts have loaded: the board static layer MUST be redrawn when `document.fonts` finishes loading.

#### Scenario: Fonts loaded locally
- GIVEN the page is opened
- WHEN network requests are inspected
- THEN both font files are requested from `/assets/fonts/` and no request goes to another origin

#### Scenario: Canvas text after load
- GIVEN the board was drawn before the fonts finished loading
- WHEN `document.fonts` resolves
- THEN the static layer is marked dirty and redrawn once

#### Scenario: Font failure
- GIVEN a font file returns 404
- WHEN the game boots
- THEN loading still completes and text renders with the fallback stack

### Requirement: Logical stage and letterboxing

All screens MUST be laid out on a 1920x1080 logical stage that contains the canvas and the DOM HUD. The stage MUST be scaled uniformly to fit the window (letterboxed, centered) so that DOM and canvas stay aligned at any window size and DPR. The stage background MUST reproduce the mockup: `#0E1117`, a 40 px grid in `#141923`, a cyan radial glow centered near (50%, 40%) and a magenta radial glow near (85%, 90%).

#### Scenario: Alignment under resize
- GIVEN a window of 1280x900
- WHEN the board panel's DOM-reported rect and the canvas board rect are compared
- THEN they differ by at most 1 CSS px on every edge

#### Scenario: Mouse mapping preserved
- GIVEN the stage letterboxed in a 1000x1000 window
- WHEN the cursor is at the center of the displayed stage
- THEN the mapped logical coordinate is `(960, 540)` within 1 px

### Requirement: Layout regions

At 1920x1080 the regions MUST be: left panel TELEMETRÍA at (40, 40) size 340x1000; board at (420, 40) size 1080x1000; right panel CONTROL at (1540, 40) size 340x1000. Panels and board MUST have a 1 px `#2A2E39` border and 6 px radius; panels MUST use a translucent background `rgba(18,22,30,.6)` with a 14 px backdrop blur.

#### Scenario: Regions
- GIVEN the game in `Aiming` at 1920x1080
- WHEN the bounding boxes of the left panel, board and right panel are read
- THEN they are (40,40,340,1000), (420,40,1080,1000) and (1540,40,340,1000)

### Requirement: Board input isolation

Gameplay pointer input (aim and fire) MUST come only from the board area. A click on a HUD element MUST NOT fire a volley or move the aim.

#### Scenario: Click on a panel
- GIVEN the state is `Aiming`
- WHEN the user clicks inside the CONTROL panel outside any button
- THEN the state stays `Aiming` and no volley is fired
