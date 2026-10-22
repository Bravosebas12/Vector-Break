# Design: AngleCraft v1 Simultaneous Fire

## Context

- `Input.allows` admits `FIRE`, `AIM`, `MOVE_START` and the mode actions only in `Aiming`. `GameSession.fire()` locks the direction, sets `groupTarget`, resets `volleySimTime` (cap per group), clears held keys and enters `Firing`; `emitBall()` uses the current `run.launcherX`.
- `step()` moves the launcher only in `Aiming`; in flight it advances physics, emits on substeps every `EMIT_INTERVAL` (1/12 s of simulation time), caps the group at `volleyCapS`, enters `Simulating` when the group is emitted and calls `endGroup()` when no ball is active. Victory is checked only in `endGroup()` / `resolve()`.
- The FSM `onEnter.Aiming` resets the speed to 1X, so today the speed resets at every group end too.
- Fire mode `'turn'` (test only) emits the whole volley from one `FIRE`; it is the v1 reference for the seeded solutions.

## Decisions

### D1. Fire in flight
`allows` admits `FIRE` and `AIM` in `Aiming`, `Firing` and `Simulating` (not paused, as before). `fire()` then requires:
1. a valid aim;
2. balls of the turn left to fire (`emitted < volleySize`, AC3);
3. the previous group fully emitted (`emitted >= groupTarget`), so groups never interleave;
4. at least `EMIT_INTERVAL` of simulation time since the previous `FIRE` of the turn (D-13.4, AC11).
A rejected `FIRE` changes nothing and emits no event. From `Simulating`, `fire()` enters `Firing` (new FSM edge `Simulating → Firing`). The first ball still leaves on `FIRE`.
**Why:** the table stays a pure state gate; per-turn conditions live in the session, like the NEXT gate.

### D2. Group origin and direction locked at `FIRE`
`fire()` stores `run.lockedX = run.launcherX` next to `run.lockedDir`; `emitBall()` uses `run.lockedX`. Moving the launcher while a group emits moves only the next group's origin (AC9).

### D3. Launcher movement in flight (D-13.2)
`step()` integrates movement in `Aiming`, `Firing` and `Simulating` (not paused). `fire()` no longer releases held keys, and the tap rule applies in those states. `allows` admits `MOVE_START` in them. CP-10 (HU-10: "A and D do not move the launcher with a group in flight") is superseded by HU-13: the ID is kept and its test asserts movement in flight; the pause part stays.

### D4. Immediate victory (D-13.1, AC5)
After physics and orb capture, if every core is destroyed: release all balls and call `resolve()` (it sees the win, counts the turn, records and enters `Victory`). The turn's unfired balls are never fired. This applies in every mode, `'turn'` included.
**Consequence:** a winning turn no longer accumulates damage from balls still flying after the last core falls, so its score can be lower than in v1. Stars depend on shots only and do not change.

### D5. Cap per turn (D-13.3, S-13.1)
`volleySimTime` resets only on the turn's first `FIRE` (`emitted === 0`). At `volleyCapS`: release all balls, set `emitted = volleySize` (unfired balls are lost), emit `VOLLEY_CAPPED`, and resolve the turn. Pause stays excluded.

### D6. Speed per turn (S-13.2)
The speed reset moves from `onEnter.Aiming` to the turn start: `resolve()` when it returns to `Aiming`, and `resetRun()` (level load, restart, skip). Between groups of a turn the chosen speed holds. `SET_SPEED` stays allowed in `Firing` / `Simulating` only.

### D7. Tests migrated in slice 1

| Test | Today | After |
|---|---|---|
| `aiming` "Fire outside Aiming ignored", unit fire gating | FIRE ignored in `Simulating` | FIRE accepted in flight with balls left, after the cadence; ignored with none left |
| `aiming` "Not aiming" (no preview in `Simulating`) | no preview in flight | preview while the turn has balls left; none when all fired |
| `launcher-move` CP-10 (x2) | no movement in flight; a key held through FIRE stops | movement in flight (superseded by HU-13); none while paused |
| `input.spec` allows table | FIRE / AIM / MOVE_START only in `Aiming` | also in `Firing` / `Simulating` |
| `volley-cap` (per group) | the cap ends the group | the cap ends the turn; unfired balls lost |
| speed reset tests | reset on every `Aiming` | reset on the next turn only |
| tests that expect victory only at turn end (e.g. CP-27 "victory mid-turn") | win when the group lands | win the step the last core falls, balls removed |

### D8. HUD
`control.launch.enabled` = not paused and (`Aiming`, or `Firing` / `Simulating` with balls left to fire). The launcher draws "ready" under the same condition and "disabled" otherwise (paused, no balls left, or out of a level). The cadence is not reflected in the HUD (1/12 s is below perception).

### D9. Levels in mode 1 (closes archived OI-1)
Mode 1 fired every `EMIT_INTERVAL` along one direction emits like the v1 volley, each ball at most one step later (a `FIRE` arrives between steps, v1 emits inside a step's substep). A new replay fires each v1 solution in mode 1 with that cadence (launcher at `xs`). Measured in slice 1: levels 1-6 are won with the same shots and the same score as in `'turn'` mode, which removes the `test.fixme` for levels 4-6.

The greedy mode-1 plans of HU-11 (`tests/fixtures/solutions-mode1.json`) are retired: they waited for every group to land, and with the cap per turn (D5) levels 2 and 3 run out of time. `scripts/record-launcher-x.mjs` is removed too: it recorded the positions that relocation produced, and rerunning it without relocation would overwrite `xs` with the level start.

## Slices and files

| Slice | Files |
|---|---|
| 1 | `src/js/system/{Input,GameSession,Fsm}.js`; `tests/unit/{simultaneous-fire,input,launcher-move,volley-cap,fire-groups,session}.spec.js` and the other migrated unit tests |
| 2 | `src/js/system/{Hud,Renderer}.js`; `tests/unit/hud-model.spec.js`, `tests/browser/launcher-states.spec.js`, `tests/e2e/simultaneous-fire.spec.js`, `tests/unit/level-solvability-modes.spec.js`, `tests/unit/qa-coverage.spec.js`, visual baselines, README, docs, `Design/casos/*` |

## Open Items

- OI-1: resolved by the PO (D-13.5, 2026-10-21): the fire mode stays locked while balls are in flight, as in HU-11 (CP-30).
- OI-2: the PO wrote "0,08 s"; the group interval is 1/12 s ≈ 0.083 s. D-13.4 ties the cadence to the group interval, so 1/12 s is used and AC11 is tested with 0.05 s (rejected) and 0.09 s (accepted).
