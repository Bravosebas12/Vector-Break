# Design: AngleCraft v1 Skip Level

## Context

- `Input.mapKey` ignores `n`; `allows` admits only `PAUSE` and `RESTART` while paused, and `NEXT` only in `Victory`.
- `GameSession.next()` loads `index + 1` only if `progression.canAccess(index + 1)`, which requires a win of `index` in this session (`Progression` keeps the win set in memory, D1). `loadLevel()` releases every ball, clears pause, resets the run (launcher to the level start, fire mode 1) and enters `Aiming`; Aiming is reachable from every play state and from `Victory` / `GameOver`.
- Records are written only in `resolve()` (`progression.submit`), which also emits `STATE 6` (victory sound) and `STARS`. A plain `loadLevel()` emits only `STATE 2` (silent).
- The CONTROL panel measures 998 px with 61 px free at the bottom; a full-width button row (60 + 12 px) plus an ATAJOS row (28 + 10 px) would need ~110 px.

## Decisions

### D1. `SKIP` action and input
`N` keydown (case-insensitive, auto-repeat ignored) maps to `{ type: 'SKIP' }`. `allows` admits `SKIP` in `Aiming`, `Firing`, `Simulating`, `Resolving` and `GameOver`, also while paused (the paused exception becomes `PAUSE`, `RESTART`, `SKIP`). `Loading`, `Title` and `Victory` ignore it (AC8, D-12.4).
**Why:** AC1–AC3; in `Victory` the player already has "Siguiente nivel", which classifies.

### D2. `GameSession.skip()`
```
skip(): if index === null or index + 1 >= catalog.length → return (AC6)
        progression?.markSkipped(index)
        loadLevel(index + 1)
        events.push('SKIP', index)
```
It bypasses `canAccess` on purpose (skipping is the way past a lock) and leaves the win set untouched, so "Siguiente nivel" on later levels keeps its rule. `resolve()` is never called: no record, score, stars, `STATE 6` or `TURNS` (AC4). Balls and pause are cleared by `loadLevel()` (AC2). The launcher is recentered by `loadLevel()` (HU-14 AC4).

### D3. "Sin resolver" marker (D-12.5)
`Progression` gains a persisted set under `anglecraft.v1.skipped` (JSON array of level indexes), loaded and saved with the same fallbacks as records (storage missing, throwing or corrupt → in-memory only).
- `markSkipped(index)`: adds the index only when the level has no record (a solved level stays solved, AC5).
- `submit(index, result)`: removes the index before the usual record logic (AC9).
- `status(index)`: `'resolved'` when a record exists, `'unsolved'` when skipped, otherwise `'unplayed'`. Not shown in v1; HU-07 reads it.

### D4. Sound
`SKIP` maps to `sfx_ui_confirm` (existing asset). Clicking a HUD button also emits `UI_CLICK` first, as the other buttons do.

### D5. HUD
- **CONTROL header action:** a compact ghost button `Saltar nivel` [`N`] on the right of the `CONTROL` header (32 px tall, same keycap style), dispatching `SKIP`. It costs no height (the header already reserves 66 px). Disabled (45 % opacity) on the last level and in `Victory`.
- **ATAJOS:** row `Saltar nivel` [`N`] after `Reiniciar` (+38 px, within the 61 px free).
- **Defeat modal:** a second button `Saltar nivel` [`N`] (secondary, next to `Reiniciar puzzle`, which stays primary for `Enter`); disabled on the last level. `data-act="modal-SKIP"` dispatches `PRESS SKIP`.
- **Victory modal:** unchanged (AC10).
- Models stay pure in `Hud.js` (`control.skip = { label, key: 'N', enabled }`, defeat `buttons` gains the skip entry); `HudDom.js` patches only.
Layout is a proposal pending design review (OI-1); the 1000 px fit test guards the height.

### D6. Tests
Unit: input table, `allows`, `skip()` from each state, paused, last level, no classification events, record kept, marker set/cleared, win set untouched. Browser: storage of the marker (including throwing storage), HUD model/DOM (header button, ATAJOS, defeat modal, disabled states, panel fit). E2E: real `N` key from play and from the defeat modal, sounds, launcher at center after a skip (HU-14 CP-40 skip path). Visual: CONTROL panel and defeat modal baselines regenerated after design review.

## Slices and files

| Slice | Files |
|---|---|
| 1 | `src/js/system/Input.js`, `GameSession.js`, `Progression.js`, `AudioSinks.js`; `tests/unit/{input,skip-level,progression}.spec.js`, `tests/browser/storage.spec.js` |
| 2 | `src/js/system/{Hud,HudDom,strings}.js`, `styles.css`; `tests/unit/hud-model.spec.js`, `tests/browser/{hud-dom,hud-skip}.spec.js`, `tests/e2e/skip-level.spec.js`, visual baselines, `tests/unit/qa-coverage.spec.js`, README, `docs/visual-fidelity-comparison.md`, `Design/casos/hu-14-casos-de-prueba.md` (CP-40 skip path) |

## Open Items

- OI-1: Design review of the CONTROL header button and the two-button defeat modal (Claude Design canvas, new artboard). Not blocking: slice 2 can land with the proposed layout and baselines are regenerated if design changes it.
- OI-2: On archive, the progression open items OI-3 / OI-4 (unlock persistence, same-session gating) stay as they are; HU-12 does not change the win gate.
