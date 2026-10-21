# Start Screen Specification

## Purpose

Title screen with blocking asset loading and a click-to-start gate (decision P7). Traces to HU-09 s1-s4 and NFR Audio. Source of truth: `game-loop-state-manager` skill (`Loading` and `Title` states) and `webaudio-synthesizer` skill (decode at boot, no AudioContext before a gesture).

## Requirements

### Requirement: Centered title (HU-09 s1/s2)

From page open until the game starts, the canvas MUST show the game title centered horizontally and vertically on the 1920x1080 logical canvas. The title MUST remain visible and centered in both `Loading` and `Title` states. UI copy MUST come from `strings.js` in Spanish (P2).

#### Scenario: Title during loading
- GIVEN the page has just opened and assets are loading
- WHEN a frame is rendered
- THEN the title text is drawn centered at logical `(960, y)` with horizontal alignment `center`

#### Scenario: Title after loading
- GIVEN all assets have finished loading
- WHEN a frame is rendered
- THEN the title is still drawn centered

### Requirement: Blocking loading with progress (HU-09 s1)

On boot the game MUST enter `Loading` and load sprites (atlas), all level files, all sound-effect samples and the music track before gameplay can start. Audio samples MUST be fetched and decoded during `Loading` without creating or resuming a realtime audio context. The screen MUST show visible progress as `settled / total` assets (rendered as a bar and a percentage). An asset counts as settled when it has loaded or failed.

#### Scenario: Progress advances
- GIVEN 30 assets of which 12 have settled
- WHEN a frame is rendered
- THEN the progress shown is 40%

#### Scenario: No realtime audio context during loading
- GIVEN the page is in `Loading`
- WHEN the audio state is read
- THEN no realtime `AudioContext` exists and no sound plays

### Requirement: Input ignored while loading (HU-09 s1)

While in `Loading`, every input (mouse buttons, mouse move, and every key including `Space`, `R`, `P`, `1`, `2`, `4`, `Enter`) MUST be ignored: no state change, no audio unlock and no level load.

#### Scenario: Click during loading
- GIVEN the page is in `Loading`
- WHEN the user clicks the canvas and presses `Space`, `R` and `P`
- THEN the state is still `Loading`, no level is loaded and no audio context exists

#### Scenario: Click queued is not replayed
- GIVEN the user clicked during `Loading`
- WHEN loading completes
- THEN the state is `Title`, not `Aiming`

### Requirement: Ready prompt (HU-09 s2)

When every asset has settled, the FSM MUST move from `Loading` to `Title`, the progress display MUST be replaced by a "click to start" prompt (`strings.clickToStart`), and the title MUST stay centered.

#### Scenario: Ready
- GIVEN the last pending asset settles
- WHEN the next step runs
- THEN the state is `Title` and the click-to-start prompt is shown

### Requirement: Start on click (HU-09 s3; E4)

In `Title`, a left mouse click MUST, within the same input event handler: create and resume the realtime `AudioContext`, start the music loop and enable effects, then load level 1 and enter `Aiming`. Keys and non-left mouse buttons in `Title` MUST be ignored.

#### Scenario: Click starts the game
- GIVEN the state is `Title`
- WHEN the user left-clicks the canvas
- THEN the audio context is running, music has started, level 1 is loaded and the state is `Aiming`

#### Scenario: Key on title ignored
- GIVEN the state is `Title`
- WHEN `Space` is pressed
- THEN the state stays `Title` and no audio context exists

### Requirement: Failed audio asset does not block start (HU-09 s4)

If an audio sample or the music fails to load or decode, it MUST count as settled, loading MUST still complete, and the game MUST be startable. Each failed sound MUST play its synth fallback at runtime.

#### Scenario: Failed sample
- GIVEN `sfx_block_destroy` returns 404 during `Loading`
- WHEN all other assets settle
- THEN the state becomes `Title`, a click starts the game, and destroying a block plays the synth fallback for `sfx_block_destroy`

## Open Items

None.
