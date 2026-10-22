# Proposal: AngleCraft v1 Simultaneous Fire

## Intent

Let the player fire the next group while earlier balls are still in the air (HU-13), so trajectories can be combined and nobody waits for every group to land. It brings back the v1 strategy in which one ball opens the way for the next one while it is still flying, and it is the expected fix for levels 4-6 in fire mode 1 (archived OI-1 of `anglecraft-v1-launcher-and-fire-mode` and `anglecraft-v1-free-launcher`). Source: `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md` (HU-13, AC1-AC11) and `Design/casos/hu-13-casos-de-prueba.md` (CP-59..CP-74).

## Confirmed decisions (PO, 2026-10-21)

| ID | Decision |
|---|---|
| D-13.1 | The level is won the moment the last core is destroyed. |
| D-13.2 | `A` / `D` work with balls in the air. |
| D-13.3 | The 45 s cap is measured per turn, from the turn's first shot. |
| D-13.4 | Minimum cadence between shots: the interval between balls of a group (`EMIT_INTERVAL` = 1/12 s ≈ 0.083 s of simulation time). |
| S-13.1 | At the 45 s cap, balls of the turn not fired yet are lost (confirmed). |
| S-13.2 | The chosen speed (2X / 4X) holds while balls are in flight and returns to 1X when the next turn starts (confirmed). |

## Scope

### In Scope
- Session: `FIRE` and `AIM` accepted in `Firing` / `Simulating` when the turn has balls left, the previous group finished emitting and the cadence has elapsed; group origin locked at `FIRE`; launcher movement in flight; immediate victory; cap per turn with unfired balls lost; speed reset per turn.
- HUD: `LANZAR` enabled while the turn has balls left (also in flight); launcher drawn ready in flight when it can fire.
- Levels: mode 1 fired at the cadence reproduces the v1 volley; levels 1-6 replayed in mode 1 with the v1 solutions; the `test.fixme` for levels 4-6 removed.
- Tests for CP-59..CP-74; migration of the tests that assume fire / aim / movement only in `Aiming`, victory at turn end, cap per group and speed reset per group.

### Out of Scope
- Changing the fire mode while balls are in flight (stays locked, HU-11 CP-30; open question OI-1 for the PO).
- New sounds or sprites; level rebalancing.

## Capabilities

### Modified Capabilities
- `game-state`: FSM (fire from `Simulating`, immediate victory), speed keys (reset per turn), volley time cap (per turn), new simultaneous-fire requirement.
- `aiming`: aim while balls can still be fired, fire locks direction and origin, launcher movement in flight.
- `volley-economy`: volley size (group origin and cadence), turn-end synchronization (turn end and immediate victory).
- `hud`: control panel (`LANZAR` enabled rule), launcher states.
- `test-harness`: solutions in mode 1 for levels 1-6, traceability to CP-59..CP-74.

## Approach

`allows` admits `FIRE`, `AIM` and `MOVE_START` in `Firing` / `Simulating`; `GameSession.fire()` adds the gates the table cannot see (balls left, previous group emitted, cadence) and keeps the group's x and direction locked while it emits. `Simulating` → `Firing` becomes a legal FSM edge. Victory is checked after every step: once all cores are destroyed, balls are released and the turn resolves. The cap clock starts at the turn's first `FIRE`; reaching it releases the balls and marks the turn's unfired balls as lost. The speed reset moves from "enter `Aiming`" to "turn start". Every gate is measured in simulation time, so mode-1 rapid fire emits like the v1 volley.

## Delivery Slicing (auto-chain on `feature/anglecraft-v1-simultaneous-fire`, <= 800 lines each)

| # | Slice | Capabilities |
|---|---|---|
| 1 | Session: fire in flight, cadence, locked origin, movement in flight, immediate victory, cap per turn, speed per turn (unit) | game-state, aiming, volley-economy |
| 2 | HUD and levels: `LANZAR` and launcher states, e2e, mode-1 replay of levels 1-6, baselines, docs | hud, test-harness |

## Rollback

Revert slice 2, then slice 1: the gates are additive in `allows` and `fire()`, and the old FSM edges remain.

## Risks

| Risk | Mitigation |
|---|---|
| Immediate victory lowers the score of a winning turn (balls stop dealing damage) and changes saved baselines | Stars depend only on shots; the score rule is unchanged; affected baselines regenerated and reviewed |
| Tests written for "fire only in `Aiming`" silently keep passing | Slice 1 lists and rewrites each one (design D7) before changing the code |
| Mode-1 rapid fire drifts from the v1 emission by a step | Emission and cadence share `EMIT_INTERVAL` in simulation time; the v1 solutions replayed in mode 1 are the proof (CP-74) |
