# Delta for HUD

## MODIFIED Requirements

### Requirement: Control panel (HU-05 s1, HU-10 AC11, HU-11 AC9–AC11, AC14, HU-12 AC6, AC7)

The right panel MUST be a DOM panel with:
1. Header `CONTROL` with, on its right, a compact ghost button `Saltar nivel` with keycap `N` (32 px tall) dispatching `SKIP`. It MUST be disabled (45 % opacity, no action) on the last level and in `Victory`.
2. A primary cyan `LANZAR` button with keycap `Space`, enabled only in `Aiming` and not paused; activating it MUST dispatch `FIRE`.
3. Two buttons: `Pausa` / `Seguir` with keycap `P` (dispatch `PAUSE`; amber tint while paused) and `Reiniciar` with keycap `R` (dispatch `RESTART`).
4. `MODO DE DISPARO` with an `M` keycap, a segmented selector `1` `2` `3` (each option shows that many dots) and the caption `BOLAS POR TIRO`. The active option is cyan-outlined; options dispatch `SET_MODE(v)`; the selector is disabled (45 % opacity) outside `Aiming` or while paused; when balls left to fire in the turn are fewer than the mode, the active option turns amber (`#FF9E00`).
5. `VELOCIDAD` with the current value `×N` and a segmented selector `1X` `2X` `4X` with keycaps `1` `2` `4`; the active option is cyan-outlined. Options dispatch `SET_SPEED` and are disabled when the action is not allowed in the current state.
6. `ATAJOS` listing only valid controls with keycaps, in order: Apuntar `Ratón`, Mover lanzador `A` `D`, Lanzar `Clic` `Space`, Modo `M`, Velocidad `1` `2` `4`, Pausa `P`, Reiniciar `R`, Saltar nivel `N`. It MUST NOT list right-click cancel or `Esc`.

Section paddings MUST be 22 px vertical so the panel fits 1000 px. Buttons MUST NOT trigger board input (see visual-theme "Board input isolation").

#### Scenario: Limited
- GIVEN mode 3 and 2 balls left in the turn
- WHEN the panel renders
- THEN option `3` is active and amber

#### Scenario: Disabled in flight
- GIVEN `Simulating`
- WHEN option `1` is clicked
- THEN no action changes the mode and the selector shows as disabled

#### Scenario: Speed display
- GIVEN speed set to 4X during `Simulating`
- WHEN the panel renders
- THEN VELOCIDAD shows `×4` and the `4X` option is marked active

#### Scenario: Launch button
- GIVEN the state is `Aiming` with a valid aim
- WHEN `LANZAR` is clicked
- THEN one group is fired exactly once

#### Scenario: Removed shortcuts
- GIVEN the ATAJOS list
- WHEN read
- THEN it contains no "Clic der." and no "Esc" entry

#### Scenario: Skip control
- GIVEN level 2 in any play state
- WHEN the panel renders
- THEN the header shows an enabled `Saltar nivel` button with keycap `N`, ATAJOS ends with `Saltar nivel` `N`, and the panel content fits its 1000 px

#### Scenario: Skip disabled on the last level
- GIVEN level 6
- WHEN `Saltar nivel` is clicked
- THEN it shows as disabled and level 6 stays active

### Requirement: Defeat modal (HU-03 s4, HU-12 AC3, AC6)

On `GameOver` a 520 px modal MUST appear over the scrim with kicker `SIN TURNOS` (magenta), title `Puzzle no resuelto`, the sentence `Se agotaron los {max} turnos. Quedan {n} núcleos activos con {hp} HP combinados.` (singular forms when n = 1), a light primary button `Reiniciar puzzle` [`R`] and a secondary button `Saltar nivel` [`N`]. `Saltar nivel` MUST be disabled on the last level. Points remain visible in the telemetry panel. `R`, `Enter` and `Reiniciar puzzle` MUST restart; `N` and `Saltar nivel` MUST skip.

#### Scenario: Defeat copy
- GIVEN `GameOver` with max 12 shots and 2 cores left with 320 HP each
- WHEN the modal renders
- THEN the text reads `Se agotaron los 12 turnos. Quedan 2 núcleos activos con 640 HP combinados.`

#### Scenario: Defeat retry
- GIVEN the defeat modal visible
- WHEN `R` is pressed
- THEN the level restarts in `Aiming` within 500 ms

#### Scenario: Skip from the defeat modal
- GIVEN the defeat modal of level 4
- WHEN `Saltar nivel` is clicked
- THEN level 5 is in `Aiming`, with the click and confirm sounds

#### Scenario: Last level defeat
- GIVEN the defeat modal of level 6
- WHEN it renders
- THEN `Saltar nivel` is disabled and `Reiniciar puzzle` is the primary button

### Requirement: Button actions (HU-03, HU-08 s1, HU-12)

`Repetir`, `Reiniciar` and `Reiniciar puzzle` MUST reload the current level; `Siguiente nivel` MUST load the following level; `Saltar nivel` MUST skip to the following level without classifying; `Enter` MUST trigger the primary button. The victory modal MUST NOT offer `Saltar nivel` (D-12.4). Modal buttons MUST be DOM buttons dispatching `PRESS` with their action (no canvas hit testing).

#### Scenario: Next
- GIVEN the victory modal on level 3
- WHEN Siguiente nivel is clicked
- THEN level 4 loads

#### Scenario: No skip on victory
- GIVEN the victory modal on level 2
- WHEN it renders
- THEN it offers `Repetir` and `Siguiente nivel` only
