# Delta for Start Screen

Source: Key Art (`Design/Logo/Kit de sprites puzzle brick breaker.pdf`, artifact `YDDd14kwvRNSevPLUnEV9A`), decision V2. HU-09 keeps precedence: the title stays centered.

## MODIFIED Requirements

### Requirement: Centered title (HU-09 s1/s2)

From page open until the game starts, the stage MUST show the Key Art image (`assets/art/key-art.webp`, 1920x1080 logical, exported without its text overlay) as full-stage background, with a darkening band behind the title area for legibility. On top, the wordmark `AngleCraft` MUST be drawn centered horizontally at x = 960 in the lower third, in JetBrains Mono 800 with `Angle` in `#F4F7FB` and `Craft` in cyan `#00F5D4`, followed by the tagline from `strings.tagline` in IBM Plex Sans 400 `#AEB4C2`. The wordmark MUST remain visible and centered in both `Loading` and `Title` states. UI copy MUST come from `strings.js` in Spanish (P2). If the Key Art fails to load, the stage background (visual-theme) MUST be shown instead and the game MUST still start.
(Previously: plain centered `system-ui` title on a flat background.)

#### Scenario: Title during loading
- GIVEN the page has just opened and assets are loading
- WHEN a frame is rendered
- THEN the Key Art is visible and the wordmark (`Angle` + `Craft`, measured together) has its horizontal center at logical x = 960

#### Scenario: Title after loading
- GIVEN all assets have finished loading
- WHEN a frame is rendered
- THEN the wordmark is still centered

#### Scenario: Key Art missing
- GIVEN `key-art.webp` returns 404
- WHEN loading completes
- THEN the state becomes `Title`, the wordmark is shown on the stage background and a click starts the game

### Requirement: Blocking loading with progress (HU-09 s1)

On boot the game MUST enter `Loading` and load sprites (atlas), the Key Art, the fonts, all level files, all sound-effect samples and the music track before gameplay can start. Audio samples MUST be fetched and decoded during `Loading` without creating or resuming a realtime audio context. The screen MUST show visible progress as `settled / total` assets, rendered as a 2 px cyan bar on a `#2A2E39` track (centered, 480 px wide, below the tagline) and a percentage label in JetBrains Mono 500 `#8A93A6`. An asset counts as settled when it has loaded or failed.
(Previously: bar and label colors were not tokenized and the Key Art and fonts were not part of the asset set.)

#### Scenario: Progress advances
- GIVEN 30 assets of which 12 have settled
- WHEN a frame is rendered
- THEN the progress shown is 40%

#### Scenario: No realtime audio context during loading
- GIVEN the page is in `Loading`
- WHEN the audio state is read
- THEN no realtime `AudioContext` exists and no sound plays

### Requirement: Ready prompt (HU-09 s2)

When every asset has settled, the FSM MUST move from `Loading` to `Title`, the progress display MUST be replaced by the prompt `strings.clickToStart` in JetBrains Mono 600 with letter-spacing .2em, pulsing in opacity, preceded by a 28 px cyan rule as in the Key Art kicker, and the wordmark MUST stay centered.
(Previously: plain text prompt.)

#### Scenario: Ready
- GIVEN the last pending asset settles
- WHEN the next step runs
- THEN the state is `Title` and the click-to-start prompt is shown
