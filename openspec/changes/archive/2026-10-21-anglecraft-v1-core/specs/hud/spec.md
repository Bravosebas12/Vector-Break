# HUD Specification

## Purpose

Telemetry panel, control panel, pause overlay and result modals. Traces to HU-03 s2/s3/s4, HU-05 s1/s5, HU-08 s3, decisions A3 and A6. PRECISION is excluded (A6).

## Requirements

### Requirement: Telemetry panel (A3, HU-03)

The left panel MUST show: STAGE, BOLAS (balls in flight and current volley size; pips up to 12, a number above 12), TURNOS bar and PUNTOS. It MUST NOT show PRECISION.

#### Scenario: Pips
- GIVEN current volley size 8
- WHEN BOLAS is shown
- THEN 8 pips are drawn

#### Scenario: Number above 12
- GIVEN volley size 20
- WHEN BOLAS is shown
- THEN the number 20 is displayed instead of pips

#### Scenario: No precision
- GIVEN any state
- WHEN the HUD is inspected
- THEN no PRECISION label exists

### Requirement: Turns bar colors (HU-03)

The TURNOS bar MUST be white when shots left > 3, amber when <= 3, magenta when <= 1.

#### Scenario: Thresholds
- GIVEN shots left of 5, 3, 1
- WHEN the bar renders
- THEN colors are white, amber, magenta respectively

### Requirement: Control panel (HU-05 s1)

The right panel MUST show LANZAR, VELOCIDAD (current 1X/2X/4X) and ATAJOS listing only valid v1 controls (mouse aim, click fire, speed keys, `P`, `R`). It MUST NOT list right-click cancel or `Esc`.

#### Scenario: Speed display
- GIVEN speed set to 4X during `Simulating`
- WHEN the panel renders
- THEN VELOCIDAD shows 4X

#### Scenario: Removed shortcuts
- GIVEN the ATAJOS list
- WHEN read
- THEN it contains no "Right-click" or "Esc" entry

### Requirement: Pause overlay (HU-05 s5)

The PAUSA overlay MUST be visible while paused and hidden after resume.

#### Scenario: Toggle
- GIVEN a running game
- WHEN `P` is pressed twice
- THEN the overlay is visible after the first and hidden after the second

### Requirement: Victory modal (HU-03 s2/s3, HU-08 s3)

On `Victory` a RESUELTO modal MUST show points, earned stars (1-3), the record, and buttons Repetir, Reiniciar and, if a next level exists, Siguiente nivel. A 3-star result MUST show a perfect-shot distinction.

#### Scenario: Perfect shot
- GIVEN victory in 1 shot
- WHEN the modal renders
- THEN 3 stars and the perfect-shot mark are shown

#### Scenario: Last level
- GIVEN victory on level 6
- WHEN the modal renders
- THEN there is no Siguiente nivel button, a last-level notice is shown and Repetir is available

### Requirement: Defeat modal (HU-03 s4)

On `GameOver` a FALLIDO modal MUST show points and offer retry; `R` MUST restart.

#### Scenario: Defeat retry
- GIVEN the FALLIDO modal visible
- WHEN `R` is pressed
- THEN the level restarts in `Aiming` within 500 ms

### Requirement: Button actions (HU-03, HU-08 s1)

Repetir and Reiniciar MUST reload the current level; Siguiente nivel MUST load the following level.

#### Scenario: Next
- GIVEN the victory modal on level 3
- WHEN Siguiente nivel is clicked
- THEN level 4 loads

## Open Items

- OI-1: TIEMPO and record layout appear in the mockup but time tracking is not in the confirmed decisions.
- OI-2: Exact button set on the defeat modal is not specified (Repetir/Reiniciar assumed).
- OI-3: Exact copy (labels in Spanish vs English) and the last-level notice text are not defined.
