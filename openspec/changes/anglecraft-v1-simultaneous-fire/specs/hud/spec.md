# Delta for HUD

## MODIFIED Requirements

### Requirement: Control panel (HU-05 s1, HU-10 AC11, HU-11 AC9–AC11, AC14, HU-12 AC6, AC7, HU-13 AC3)

The right panel MUST be a DOM panel with:
1. Header `CONTROL` with, on its right, a compact ghost button `Saltar nivel` with keycap `N` (32 px tall) dispatching `SKIP`. It MUST be disabled (45 % opacity, no action) on the last level and in `Victory`.
2. A primary cyan `LANZAR` button with keycap `Space`, enabled when not paused and either in `Aiming` or in `Firing` / `Simulating` with balls of the turn left to fire (HU-13); disabled when every ball of the turn has been fired; activating it MUST dispatch `FIRE`.
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

#### Scenario: Launch in flight
- GIVEN `Simulating` with balls in flight
- WHEN the turn still has balls to fire, and later when all have been fired
- THEN `LANZAR` is enabled, and then disabled

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

### Requirement: Launcher states (HU-10, HU-13)

The launcher MUST render four states (canvas): ready (it can fire: `Aiming`, or `Firing` / `Simulating` with balls of the turn left to fire, not paused: cyan dashed ring, glow, two dim cyan chevrons left and right), moving (the chevron of the motion direction at full opacity, the other at 15 %, plus a short cyan trail behind), at edge (the chevron toward the blocked side hidden), disabled (paused, every ball of the turn fired, or outside those states: gray ring, no glow, no chevrons). No per-frame allocation (chevrons and trail are cached sprites).

#### Scenario: At the left edge
- GIVEN `Aiming`, launcher x 50
- WHEN the launcher renders
- THEN the left chevron is not drawn and the right one is

#### Scenario: Ready in flight
- GIVEN `Simulating` with balls in flight and balls of the turn left to fire
- WHEN the launcher renders
- THEN it is drawn ready; once every ball of the turn has been fired it is drawn disabled
