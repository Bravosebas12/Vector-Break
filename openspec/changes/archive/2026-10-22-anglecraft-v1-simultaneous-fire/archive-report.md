# Archive Report: anglecraft-v1-simultaneous-fire

**Project**: vector-break (AngleCraft)
**Archived on**: 2026-10-22
**Archived to**: `openspec/changes/archive/2026-10-22-anglecraft-v1-simultaneous-fire/`
**Traces to**: HU-13 (simultaneous fire), `Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`, QA cases CP-59..CP-74 (`Design/casos/hu-13-casos-de-prueba.md`)
**Archive status**: closed (no open item of its own)

## 1. Final State

| Item | Final state |
|------|-------------|
| Tasks | 13/13 `[x]` in `tasks.md` |
| Delivery | PRs #50 (slice 1) and #51 (slice 2) merged into `feature/anglecraft-v1-simultaneous-fire`; tracker PR #52 merged to `main` |
| Verify | full suite 3 times on slice 2: exit 0, 660 passed, **0 skipped** |
| QA traceability | CP-01..CP-74 all referenced by test titles; CP-10 superseded by HU-13 (movement in flight) |
| Decisions | D-13.1 (immediate victory), D-13.2 (A / D in flight), D-13.3 (cap per turn), D-13.4 (cadence = `EMIT_INTERVAL`, 1/12 s), D-13.5 (fire mode locked in flight), S-13.1 (unfired balls lost at the cap), S-13.2 (speed per turn) |

### Results worth noting

- **Levels 4-6 in mode 1 are winnable.** The v1 solutions fired in mode 1 at the cadence win levels 1-6 with the same shots and score as in `'turn'` mode (CP-74). This resolves the balance item OI-1 of `anglecraft-v1-launcher-and-fire-mode` (marked resolved there) and the follow-up of `anglecraft-v1-free-launcher`. The `test.fixme` checks are gone.
- **Emission timing.** A mode-1 `FIRE` arrives between fixed steps while v1 emits inside a step, so each ball leaves 0-1 step (8 ms) later than in v1. The spec states this instead of exact equality; outcomes are identical on all six levels.
- **Retired.** The greedy mode-1 plans of HU-11 (`tests/fixtures/solutions-mode1.json`) waited for every group to land and run out of time with the cap per turn. `scripts/record-launcher-x.mjs` would overwrite `xs` with the level start now that relocation is gone. Both were removed.
- **Immediate victory.** Score rules are unchanged; on the six seeded solutions the scores did not change. The victory baseline changed only in its time (the level ends earlier).
- **Unrelated fix.** A race in the hook e2e test (it read `window.__ANGLECRAFT__` before `main.js` installed it) was fixed in slice 1.

## 2. Spec Sync (openspec/specs/)

| Domain | Action | Detail |
|--------|--------|--------|
| game-state | Modified 3, added 1 | FSM (fire from `Simulating`, immediate victory, cap), Speed keys (per turn), Volley time cap (per turn); added Simultaneous fire |
| aiming | Modified 3 | Aim only in Aiming (aim in flight), Fire locks direction (and origin), Launcher movement (in flight) |
| volley-economy | Modified 2 | Volley size (locked origin, no interleaving, mode 1 follows v1), Turn-end synchronization (turn end, immediate victory) |
| hud | Modified 2 | Control panel (`LANZAR` in flight), Launcher states (ready in flight) |
| test-harness | Modified 2 | Traceability (CP-59..CP-74), Solutions (mode 1 for levels 1-6; greedy plans retired) |

Scenarios removed by design (superseded by HU-13): aiming "Fire outside Aiming ignored", "Ignored in flight"; game-state "Victory mid-turn", "Cap reached in a group". Every other scenario was kept.

Open items resolved in the main specs: game-state OI-2 (`FIRE` and speed keys while paused: ignored) and OI-3 (emission interval confirmed as 1/12 s).

## 3. Learnings

1. Measuring before claiming: the "exact v1 equality" design claim was false by one step; replacing it with the measured bound kept the spec honest without complicating emission.
2. A rule change in the turn loop (cap per turn) silently invalidated fixtures built under the old rule; replaying every fixture in the first slice surfaced it immediately.
