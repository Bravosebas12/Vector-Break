# Tutorial Hints Specification

## Purpose

In-game hints that teach launcher movement (HU-10 AC12) and the fire mode (HU-11 AC15) in the tutorial levels (D-T.1). Visual source: Claude Design canvas "AngleCraft — Tutorial y modo de disparo", component sheet section A.

## Requirements

### Requirement: Hint component

A hint MUST be a DOM element over the board: background `rgba(20,24,32,.92)`, 1 px border cyan at 45 %, radius 6 px, padding 14 × 20 px, a soft cyan glow, a caret pointing to its target, the kicker `TUTORIAL` (JetBrains Mono 600 12 px, letter-spacing .2em, cyan), the message (IBM Plex Sans 500 19 px) and 34 × 32 keycaps. It MUST enter with a 200 ms fade and 8 px rise and leave with a 160 ms fade. It MUST NOT capture pointer input and MUST be hidden while paused or while a result modal is shown.

#### Scenario: Not interactive
- GIVEN a hint visible over the board
- WHEN the player clicks on it
- THEN the click acts as a click on the board

### Requirement: Move hint on level 1 (HU-10 AC12)

The first time per session that level 1 is in `Aiming`, the hint `Mueve el lanzador` with keycaps `A` `D` MUST appear to the right of the launcher with its caret pointing to it, following the launcher while visible. It MUST disappear on the first launcher movement or the first `FIRE`, and MUST NOT appear again in the session (a page reload is a new session). It MUST NOT appear on other levels.

#### Scenario: Dismiss on move
- GIVEN a new session on level 1 with the move hint visible
- WHEN `D` is tapped
- THEN the hint is gone in the same frame

#### Scenario: Once per session
- GIVEN the move hint was dismissed
- WHEN level 1 is restarted or replayed
- THEN the hint does not appear

### Requirement: Mode hint on level 2 (HU-11 AC15)

The first time per session that level 2 is in `Aiming`, the hint `Elige cuántas bolas lanzar por tiro` with the line `1, 2 o 3 · cambia con` and an `M` keycap MUST appear at the bottom right of the board with its caret pointing to the CONTROL panel, and the MODO section MUST be highlighted (cyan inset border and glow). It MUST disappear, together with the highlight, on the first mode change or the first `FIRE`, and MUST NOT appear again in the session.

#### Scenario: Dismiss on mode change
- GIVEN a new session on level 2 with the mode hint visible
- WHEN `M` is pressed
- THEN the hint and the MODO highlight are gone

#### Scenario: Not on level 1
- GIVEN a new session on level 1
- WHEN the board renders
- THEN no mode hint is shown
