# Delta for Test Harness

## MODIFIED Requirements

### Requirement: Flag-gated test hook (all HU)

When the page is loaded with `?test=1`, the game MUST expose `window.__ANGLECRAFT__` offering `step(n)` (advance `n` fixed steps of 1/120 s), `snapshot()` (serializable game state), `loadLevel(x)`, `fire(angle)` (aim then FIRE one group in the current mode), `aim(x, y)`, `action(a)`, `setSeed(seed)`, `setVolley(n)` (`n <= 50`), `start()` (same path as the Title left click), `audioLog()`, `setFireMode(v)` with `v` in {1, 2, 3, 'turn'}, `move(dir, seconds)` that holds `A` (dir -1) or `D` (dir +1) for the given play time through the session (stepping included), and `setLauncherX(x)` that places the launcher at `x` clamped to `[50, 1030]`, only in `Aiming`, and recomputes the aim (a shortcut for a position reachable with `A` / `D`). `'turn'` is test-only: one `FIRE` emits every ball left in the turn, reproducing v1 behavior; it MUST NOT be reachable from game input. Without the flag the hook MUST NOT be present.

Every hook method other than `snapshot()` MUST throw `NOT_READY` while the session state is `Loading`; tests wait for state `Title`. `loadLevel(x)` called from `Title` MUST be a legal Title -> Aiming transition (tests may skip `start()`).

The following query flags MUST be honored only together with `?test=1`: `&loop=1` lets requestAnimationFrame step the session; `&audio=1` enables real sample loading (otherwise a Recording sink is used and audio assets settle immediately); `&stress=1` sets `sealedFloor` and `volleyCapS` to `Infinity`.

#### Scenario: v1 behavior preserved for legacy tests
- GIVEN `?test=1`, level 2 loaded and `setFireMode('turn')`
- WHEN `fire(angle)` is called and the session is stepped until `Aiming`, `Victory` or `GameOver`
- THEN exactly 5 balls were emitted by that single `FIRE` and shots used is 1

#### Scenario: Turn mode unreachable from input
- GIVEN the real game (no `?test=1`)
- WHEN any key or HUD control is used
- THEN the mode is always 1, 2 or 3

#### Scenario: Hook present with flag
- GIVEN the page loaded at `/?test=1` and the session state is `Title`
- WHEN the hook is inspected
- THEN `step`, `snapshot`, `loadLevel`, `fire`, `aim`, `action`, `setSeed`, `setVolley`, `start`, `audioLog`, `setFireMode`, `move` and `setLauncherX` are functions
- AND calling `loadLevel` from `Title` moves the session to `Aiming`

#### Scenario: Place the launcher
- GIVEN `?test=1` and `Aiming`
- WHEN `setLauncherX(2000)` is called
- THEN the launcher x is 1030; called in `Simulating`, it changes nothing

#### Scenario: Hook not ready while loading
- GIVEN the page loaded at `/?test=1` and the session state is `Loading`
- WHEN any hook method other than `snapshot()` is called
- THEN it throws `NOT_READY`

#### Scenario: Hook absent without flag
- GIVEN the page loaded at `/`
- WHEN the hook is inspected
- THEN no test hook is exposed

### Requirement: Traceability to the QA cases

Automated tests MUST reference the QA case IDs in their titles: `CP-01`…`CP-35` from `Design/casos/hu-10-11-casos-de-prueba.md` and `CP-36`…`CP-44` from `Design/casos/hu-14-casos-de-prueba.md`. Every AC of HU-10, HU-11 and HU-14 MUST be covered by at least one automated test. Cases superseded by HU-14 (CP-01, CP-22) keep their IDs and their tests assert the HU-14 rule.

#### Scenario: Coverage check
- GIVEN the test titles
- WHEN they are searched for `CP-` IDs
- THEN every case in both coverage matrices appears at least once

## ADDED Requirements

### Requirement: Solutions with launcher positions (HU-14)

The seeded solutions MUST store the launcher x for every shot (`xs` next to `angles` in `tests/fixtures/solutions.json`; an explicit `x` for every step in `tests/fixtures/solutions-mode1.json`). Replays MUST place the launcher with `setLauncherX` before each shot. Levels 1–6 MUST be won by their solution in `'turn'` mode, and levels 1–3 by their mode-1 plan, with the launcher fixed (HU-14).

#### Scenario: Replay before and after HU-14
- GIVEN the recorded positions
- WHEN the solutions are replayed with relocation on (slice 1) and off (slice 2)
- THEN every level that was won is won in the same number of shots
