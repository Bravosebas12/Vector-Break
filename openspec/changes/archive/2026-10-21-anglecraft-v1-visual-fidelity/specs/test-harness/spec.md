# Delta for Test Harness

## ADDED Requirements

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
