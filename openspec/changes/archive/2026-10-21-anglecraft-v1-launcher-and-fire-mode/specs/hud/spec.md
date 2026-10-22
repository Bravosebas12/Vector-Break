# Delta for HUD

Source: Claude Design canvas "AngleCraft — Tutorial y modo de disparo" (artboards 01–03).

## MODIFIED Requirements

### Requirement: Telemetry panel (A3, HU-03, HU-11 AC14)

As in the visual-fidelity HUD, except the BOLAS block: the counter MUST read `balls left to fire in the turn / volley size` (two digits), with the caption `POR DISPARAR EN EL TURNO`, and the pips (up to 12) MUST show: in flight = active balls (cyan), recogida = balls of the turn already landed (`#2A2E39`), por disparar = balls not yet fired (outlined). The legend MUST read `en vuelo` / `por disparar` / `recogida`. Above 12 balls the pips are replaced by the number only.
(Previously: counter in flight / size; legend en vuelo / disponible / usada.)

#### Scenario: Between groups
- GIVEN a turn of 5 with one group of 2 fired and landed
- WHEN BOLAS is shown in `Aiming`
- THEN the counter reads `03 / 05` and the pips are 2 recogida and 3 por disparar

#### Scenario: Group in flight
- GIVEN a turn of 5, mode 2, the first group in flight
- WHEN BOLAS is shown
- THEN the counter reads `03 / 05` and the pips are 2 en vuelo and 3 por disparar

### Requirement: Control panel (HU-05 s1, HU-10 AC11, HU-11 AC9–AC11, AC14)

The right panel MUST add, between the Pausa / Reiniciar row and VELOCIDAD, a section `MODO DE DISPARO` with an `M` keycap, a segmented selector `1` `2` `3` (each option shows that many dots) and the caption `BOLAS POR TIRO`. The active option is cyan-outlined; options dispatch `SET_MODE(v)`; the selector is disabled (45 % opacity) outside `Aiming` or while paused; when balls left to fire in the turn are fewer than the mode, the active option turns amber (`#FF9E00`). ATAJOS MUST list, in order: Apuntar `Ratón`, Mover lanzador `A` `D`, Lanzar `Clic` `Space`, Modo `M`, Velocidad `1` `2` `4`, Pausa `P`, Reiniciar `R`. Section paddings MUST be 22 px vertical so the panel fits 1000 px.
(Previously: no MODO section; ATAJOS without A / D and M.)

#### Scenario: Limited
- GIVEN mode 3 and 2 balls left in the turn
- WHEN the panel renders
- THEN option `3` is active and amber

#### Scenario: Disabled in flight
- GIVEN `Simulating`
- WHEN option `1` is clicked
- THEN no action changes the mode and the selector shows as disabled

## ADDED Requirements

### Requirement: Launcher states (HU-10)

The launcher MUST render four states (canvas): ready (Aiming: cyan dashed ring, glow, two dim cyan chevrons left and right), moving (the chevron of the motion direction at full opacity, the other at 15 %, plus a short cyan trail behind), at edge (the chevron toward the blocked side hidden), disabled (not Aiming or paused: gray ring, no glow, no chevrons). No per-frame allocation (chevrons and trail are cached sprites).

#### Scenario: At the left edge
- GIVEN `Aiming`, launcher x 50
- WHEN the launcher renders
- THEN the left chevron is not drawn and the right one is
