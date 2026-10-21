# Delta for HUD

Source of truth for layout and styling: `Design/Game UI/Game UI (standalone) (1).html` (screens 01-03). Data rules A3, A5, A6, C2, C3 keep precedence. The HUD is DOM/CSS (V1); data comes only from the pure models in `Hud.js`.

## MODIFIED Requirements

### Requirement: Telemetry panel (A3, HU-03)

The left panel MUST be a DOM panel with, top to bottom:
1. Header `TELEMETRÍA` and a status indicator (8 px glowing dot + label): `EN CURSO` cyan while playing, `PAUSA` amber while paused, `RESUELTO` cyan on `Victory`, `FALLIDO` magenta on `GameOver`.
2. `STAGE` label, the two-digit stage number in JetBrains Mono 700 104 px, and `PUZZLE NN / MM` (MM = level count).
3. `BOLAS` with `active / size` (two digits, total dimmed) and a 12-column pip grid with legend `en vuelo` / `disponible` / `usada`. Pip states: in flight = `volley.active` (cyan, glow), used = `volley.emitted - volley.active` (filled `#2A2E39`), available = the rest (outlined). Above 12 balls, the pip grid MUST be replaced by the number only.
4. `TURNOS` with `left / max`, a segmented bar of `max` segments (filled = left) and the caption `LÍMITE DEL PUZZLE · N TURNOS`.
5. A two-column footer: `PUNTOS` (score) and `TIEMPO` (play time `mm:ss.d`).

It MUST NOT show PRECISIÓN.
(Previously: canvas text rows STAGE, PUZZLE, BOLAS, TURNOS, PUNTOS, TIEMPO.)

#### Scenario: Pips
- GIVEN a volley of size 8 with 5 emitted and 3 still in flight
- WHEN BOLAS is shown
- THEN the counter reads `03 / 08` and the pips are 3 in flight, 2 used and 3 available

#### Scenario: Number above 12
- GIVEN volley size 20
- WHEN BOLAS is shown
- THEN no pip grid is rendered and the counter shows 20

#### Scenario: No precision
- GIVEN any state
- WHEN the HUD DOM is inspected
- THEN no element contains the text `PRECISIÓN`

#### Scenario: Status indicator
- GIVEN the game paused
- WHEN the header is read
- THEN the status label is `PAUSA` and its color is amber

### Requirement: Turns bar colors (HU-03)

The TURNOS number and the filled bar segments MUST be text-strong (`#F4F7FB` number, `#E7EAF0` segments) when shots left > 3, amber (`#FF9E00`) when <= 3, magenta (`#F72585`) when <= 1. Empty segments MUST be `#22262F`.
(Previously: white / `#FFC857` / magenta.)

#### Scenario: Thresholds
- GIVEN shots left of 5, 3, 1
- WHEN the bar renders
- THEN filled segment colors are `#E7EAF0`, `#FF9E00`, `#F72585` respectively

### Requirement: Control panel (HU-05 s1)

The right panel MUST be a DOM panel with:
1. Header `CONTROL`.
2. A primary cyan `LANZAR` button with keycap `Space`, enabled only in `Aiming` and not paused; activating it MUST dispatch `FIRE`.
3. Two buttons: `Pausa` / `Seguir` with keycap `P` (dispatch `PAUSE`; amber tint while paused) and `Reiniciar` with keycap `R` (dispatch `RESTART`).
4. `VELOCIDAD` with the current value `×N` and a segmented selector `1X` `2X` `4X` with keycaps `1` `2` `4`; the active option is cyan-outlined. Options dispatch `SET_SPEED` and are disabled when the action is not allowed in the current state.
5. `ATAJOS` listing only valid v1 controls with keycaps: Apuntar `Ratón`, Lanzar `Clic` / `Space`, Velocidad `1` `2` `4`, Pausa `P`, Reiniciar `R`. It MUST NOT list right-click cancel or `Esc`.

Buttons MUST NOT trigger board input (see visual-theme "Board input isolation").
(Previously: canvas text, not clickable.)

#### Scenario: Speed display
- GIVEN speed set to 4X during `Simulating`
- WHEN the panel renders
- THEN VELOCIDAD shows `×4` and the `4X` option is marked active

#### Scenario: Launch button
- GIVEN the state is `Aiming` with a valid aim
- WHEN `LANZAR` is clicked
- THEN a volley is fired exactly once

#### Scenario: Removed shortcuts
- GIVEN the ATAJOS list
- WHEN read
- THEN it contains no "Clic der." and no "Esc" entry

### Requirement: Pause overlay (HU-05 s5)

While paused, the board area (not the panels) MUST be covered by `rgba(8,10,14,.45)` with a 4 px backdrop blur and a centered pill showing `PAUSA` (JetBrains Mono 700 32 px, letter-spacing .2em) and a `P` keycap. It MUST be hidden after resume.
(Previously: full-canvas dim with large text.)

#### Scenario: Toggle
- GIVEN a running game
- WHEN `P` is pressed twice
- THEN the overlay is visible after the first and hidden after the second

### Requirement: Victory modal (HU-03 s2/s3, HU-08 s3)

On `Victory` a 680 px modal MUST appear over a full-stage scrim (`rgba(6,8,12,.5)`, 6 px blur) with:
1. Kicker `STAGE NN · RESUELTO` (cyan) and title `Puzzle completado` (IBM Plex Sans 600 52 px).
2. Three 64 px stars: earned stars filled cyan with glow, the rest outlined. A 3-star result MUST also show the `TIRO PERFECTO` mark.
3. Three metric columns: `PUNTOS` (score; sub-line the stored record, or `nuevo récord`), `TIEMPO` (`mm:ss.d`), `TURNOS` (`used / max`; sub-line `N de margen`).
4. Buttons `Repetir` [`R`] and, if a next level exists, primary `Siguiente nivel` [`Enter`]. On the last level, `Siguiente nivel` MUST be absent, `Repetir` becomes primary and the last-level notice is shown.
(Previously: canvas modal with Repetir, Reiniciar and Siguiente nivel.)

#### Scenario: Perfect shot
- GIVEN victory in 1 shot
- WHEN the modal renders
- THEN 3 filled stars and the `TIRO PERFECTO` mark are shown

#### Scenario: Two stars
- GIVEN victory with 2 stars
- WHEN the modal renders
- THEN 2 stars are filled and 1 is outlined

#### Scenario: Last level
- GIVEN victory on level 6
- WHEN the modal renders
- THEN there is no Siguiente nivel button, a last-level notice is shown and Repetir is primary

### Requirement: Defeat modal (HU-03 s4)

On `GameOver` a 520 px modal MUST appear over the scrim with kicker `SIN TURNOS` (magenta), title `Puzzle no resuelto`, the sentence `Se agotaron los {max} turnos. Quedan {n} núcleos activos con {hp} HP combinados.` (singular forms when n = 1) and a light primary button `Reiniciar puzzle` [`R`]. Points remain visible in the telemetry panel. `R` and the button MUST restart.
(Previously: FALLIDO canvas modal with points.)

#### Scenario: Defeat copy
- GIVEN `GameOver` with max 12 shots and 2 cores left with 320 HP each
- WHEN the modal renders
- THEN the text reads `Se agotaron los 12 turnos. Quedan 2 núcleos activos con 640 HP combinados.`

#### Scenario: Defeat retry
- GIVEN the defeat modal visible
- WHEN `R` is pressed
- THEN the level restarts in `Aiming` within 500 ms

### Requirement: Button actions (HU-03, HU-08 s1)

`Repetir`, `Reiniciar` and `Reiniciar puzzle` MUST reload the current level; `Siguiente nivel` MUST load the following level; `Enter` MUST trigger the primary button. Modal buttons MUST be DOM buttons dispatching `PRESS` with their action (no canvas hit testing).
(Previously: canvas hit testing in logical coordinates.)

#### Scenario: Next
- GIVEN the victory modal on level 3
- WHEN Siguiente nivel is clicked
- THEN level 4 loads

## ADDED Requirements

### Requirement: Keycaps

Every key hint MUST be rendered as a keycap: inline box, min-width 30 px, height 28 px, 1 px `#3A4050` border with a 2 px bottom border, 4 px radius, `#161A22` fill, JetBrains Mono 600 14 px. On a filled primary button the keycap MUST use a translucent dark border instead.

#### Scenario: Keycap style
- GIVEN the `Reiniciar` button
- WHEN its keycap computed style is read
- THEN border-bottom-width is 2px and font-family starts with `JetBrains Mono`

### Requirement: Cheap DOM updates

The HUD DOM MUST be built once and updated only when a displayed value changes (text, class or attribute patch). It MUST NOT recreate nodes every frame.

#### Scenario: Idle HUD
- GIVEN the game idle in `Aiming` for 120 frames
- WHEN DOM mutations are observed
- THEN no node is added or removed

## REMOVED Requirements

None. (Canvas `drawHud` / `drawModal` / `hitModalButton` are implementation details replaced by the DOM view; their behavior is covered by the modified requirements above.)
