# Design: AngleCraft v1 Launcher Movement and Fire Mode

## Context

- `GameSession` (DOM-free) owns the FSM, `run` state and `step(dt)`; `fire()` locks the direction, increments `run.shotsUsed`, emits the first ball; emission runs every `EMIT_INTERVAL` (1/12 s) until `run.emitted == run.volleySize`; `resolve()` relocates the launcher to `run.firstLandX`, applies `pendingBonus`, scores and picks `Victory` / `GameOver` / `Aiming`.
- `Input.mapEvent` handles `mousemove`, `mousedown`, `keydown`; `allows(state, paused, action)` gates every action.
- HUD: `Hud.js` pure models → `HudDom.js` (built once, patched). Renderer draws the launcher procedurally (Key Art style) with a cached glow.
- ~500 tests; many call `hook.fire(angle)` and step until the next `Aiming`, assuming one FIRE = whole volley.

## Decisions

### D1. Turn and group counters in `run`
`run.turnBalls` (volley size frozen at turn start), `run.turnFired` (balls fired this turn), `run.groupSize`, `run.groupEmitted`, `run.groupFirstLandX`, `run.fireMode` (1|2|3|'turn'). `fire()` sets `groupSize = min(mode, turnBalls - turnFired)` (`'turn'` → all left) and no longer increments `shotsUsed`. Emission stops at `groupEmitted == groupSize`. *Why*: smallest change that keeps `resolve()` (orbs, score, stars, records) intact.

### D2. Group end vs turn end
When `Simulating` has 0 active balls: if `turnFired < turnBalls` and cores remain → `groupEnd()`: relocate to `groupFirstLandX` (if any), reset group counters, enter `Aiming` (new FSM edge Simulating → Aiming). Otherwise → `resolve()`, which now increments `shotsUsed` first (turn counted at Resolving, HU-11 AC6). *Rejected*: a new FSM state `BetweenGroups` (more transitions, HUD and input gating changes for no behavior gain).

### D3. Volley time cap per group
`volleySimTime` resets on each `FIRE`; the cap ends the group (D2 decides group end or turn end). Capped balls never set `groupFirstLandX`.

### D4. Launcher movement in the session
Input dispatches `MOVE_START(dir)` on non-repeat keydown of `A`/`D` and `MOVE_STOP(dir)` on keyup (and for both on window `blur`). The session keeps `held = {left, right}` and `tap = {dir, fromX}`. In `step(dt)`, when `Aiming` and not paused: `dir = right - left`; `launcherX = clamp(launcherX + dir * 480 * dt, 50, 1030)`. On `MOVE_STOP`, if `|launcherX - tap.fromX| < 8`, set `launcherX = clamp(tap.fromX + 8 * dir)`. Leaving `Aiming` clears `held`. Movement uses real `dt` (play time), not `dt * speed`. A movement emits `LAUNCHER_MOVED` for the tutorial dismissal.
*Why in the session*: deterministic under the hook and fixed step; the renderer only reads `launcherX`.

### D5. Fire mode actions
`CYCLE_MODE` and `SET_MODE(v)` handled in the session, gated by `allows` (Aiming, not paused). Reset to 1 in `loadLevel` unless the test hook pinned `'turn'` (hook flag survives loads for legacy tests). Emits `UI_CLICK` (existing sound).

### D6. HUD
`hudModel` adds `control.mode = { current, limited, enabled, options: [{v, active}] }` and `telemetry.balls = { left, size, pips: {flying, recogida, porDisparar} }`; ATAJOS list in `strings.shortcutList` gains Mover lanzador and Modo. `HudDom` adds the MODO section (dots per option, `M` keycap), patched like the speed selector. CONTROL section paddings drop to 22 px per the canvas.

### D7. Launcher states in the renderer
Chevron and trail sprites built once (like the glow). State from `run`: `held`, `launcherX` at bounds, `Aiming && !paused`. No allocation per frame.

### D8. Tutorial hints
`tutorialModel(snap, seen)` (pure) returns `{ kind: 'move'|'mode'|null, x }`; `seen` is a session-scoped object in `main.js` (not storage), updated from events `LAUNCHER_MOVED`, `MODE_CHANGED`, `FIRE`. `HudDom` renders the hint (two variants, caret, CSS enter/leave animations) and toggles the MODO highlight class. Hidden when paused or a modal is shown; `pointer-events: none`.

### D9. Test seam first
Slice 1 adds `hook.setFireMode('turn' | 1 | 2 | 3)` and `hook.move(dir, s)`, and a shared helper sets `'turn'` in v1-era specs (unit helpers and e2e `begin()` functions) so their expectations hold unchanged. New behavior gets its own specs named with `CP-xx`.

### D10. Levels
Re-run `tests/fixtures/solutions.json` in `'turn'` mode (must still pass) and add a mode-1 solvability check per level (each level solvable within `shots` turns, re-aiming allowed per group). Balance review (free launcher can trivialize puzzles) is recorded as a follow-up for design, not blocking.
*Finding (slice 6)*: the v1 solutions do **not** transfer to mode 1, even replaying each group from the turn's start x: they depend on several balls of a volley being in flight at once (one opens a path while another is still flying). The simulation has no randomness, so this is not a seed issue. Mode-1 solvability is therefore proven with dedicated plans (`tests/fixtures/solutions-mode1.json`) found offline by a greedy search (per group: angles × launcher positions, keep the shot with most core damage) and replayed from a fresh session in the unit suite.

## Slices and files

| Slice | Files | Tests |
|---|---|---|
| 1 | TestHook.js, GameSession.js (`fireMode` with 'turn' only), test helpers | hook unit/e2e; all v1 tests pinned to 'turn' |
| 2 | Input.js, main.js (keyup, blur), GameSession.js (movement), Renderer.js (preview origin unchanged) | CP-02..CP-15 (movement subset) |
| 3 | GameSession.js (groups, relocation, cap, shots at Resolving), Fsm.js (new edge) | CP-01, CP-19..CP-28, CP-30..CP-32 |
| 4 | Hud.js, HudDom.js, styles.css, strings.js, Renderer.js (launcher states) | CP-16, CP-29, CP-33, hud-dom browser specs |
| 5 | TutorialHints (model), HudDom.js, styles.css, main.js | CP-17, CP-18, CP-34, CP-35 |
| 6 | solutions fixture, visual baselines, docs | level solvability, visual tests, coverage check |

## Open Items

- OI-1: Balance review of levels 1–6 with free movement and per-group re-aim (design follow-up). Measured in slice 6: levels 1–3 are won in mode 1 in 2 turns (v1: 2–3 of 10–12); for levels 4–6 the greedy search finds no win in mode 1 nor mode 3 (core left at 30/210/239 and 21/211/241 HP), while v1 needs 9/12, 10/13 and 14/15 turns. Their mode-1 checks are `test.fixme` until HU-13 (simultaneous firing) or a rebalance.
- OI-2: Hint enter/leave animations must respect `prefers-reduced-motion` (fade only) — confirm with design.
