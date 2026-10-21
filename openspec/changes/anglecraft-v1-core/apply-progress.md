# Apply Progress: anglecraft-v1-core

Mode: Strict TDD. Delivery: auto-chain / feature-branch-chain (tracker `feature/anglecraft-v1`), budget 800.

## Slice 1: Test harness + spikes (PR 1 of 14) - COMPLETE (9/9)

Tasks 1.1-1.9 are marked `[x]` in `tasks.md`. Slice 2 is COMPLETE (see below). Slices 4-9b are NOT started.

### Spike results

| Spike | Result | Evidence |
|---|---|---|
| S1 clock (OI-2) | PASS (no fallback) | `clock.install({time:0})`, `goto`, `pauseAt(1000)`, then register rAF and `runFor(1000)`: 63 rAF calls (3 runs: 63/63/63), `performance.now()` delta exactly 1000, timestamps strictly increasing. Gotcha: without `pauseAt` before measuring, time keeps flowing in real time after `install()` and delta was 1003 (62-63 calls). Real-loop e2e MUST pause the clock before sampling. 63 sits at the upper edge of the 58-63 window. |
| S2 ESM (OI-1) | PASS (no fallback) | `unit` project spec statically imports `../../src/js/engine/Vector2D.js` and dynamically imports `src/js/system/ObjectPool.js` Node-side: no transform error, exports callable (`Vector2D` is a function, instantiable). |
| S3 server (R2) | PASS (no fallback) | webServer starts on Windows 11 / Node v24.14.0. `/` is 200 `text/html`, `.js` `text/javascript`, `.json` `application/json`, `.wav` `audio/wav` with full body and RIFF header. Traversal variants refused 403/404. Two consecutive full `npx playwright test` runs: 25/25 passed each; `netstat` shows 0 listeners on :4173 after each run (no orphan). |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | n/a (config) | n/a | N/A (new) | n/a | install OK, `@playwright/test` 1.63.0 | Skipped: purely structural | None needed |
| 1.2 | `playwright.config.js` (exercised by every spec) | n/a | N/A (new) | n/a | projects/webServer run all 25 tests | Skipped: structural | None needed |
| 1.3 | `tests/spikes/server.spec.js` | Unit (Node, HTTP) | N/A (new) | Run before server existed: webServer failed `MODULE_NOT_FOUND scripts/static-server.mjs`, exit 1 | 20/20 passed | 9 refused paths + legit-file control, 3 methods, HEAD, 5 MIME/serve cases | None needed |
| 1.4 | `tests/spikes/server.spec.js` | Unit | N/A (new) | see 1.3 | 20/20 passed | see 1.3 | Fixed a shell-escaped backslash typo (syntax error caught by the run) |
| 1.5 | `tests/spikes/clock.spec.js` | Browser | N/A (new) | Real first run FAILED: delta 1003 vs 1000 +-1 (clock not paused) | Passed after `pauseAt`, 3/3 runs | single spec per design | None needed |
| 1.6 | `tests/spikes/esm.spec.js` | Unit | N/A (new) | Existing stub module; spec asserts exports | 2/2 passed | static + dynamic import | None needed |
| 1.7 | `tests/spikes/server.spec.js` + 2 full runs | Unit | N/A (new) | n/a | 2 consecutive 25/25 runs, 0 listeners | n/a | None needed |
| 1.8 | `tests/e2e/smoke.spec.js` | E2E | N/A (new) | n/a (page and server already existed; smoke is a boot check, not a TDD feature) | 2/2 passed | canvas attr, no console/page errors, no 4xx, title, project/browser identity | None needed |
| 1.9 | spec text edit | n/a | N/A | n/a | readback of the hook requirement | n/a | n/a |

Honest note on RED for 1.5/1.6/1.8: these are spike/boot probes against pre-existing artifacts, so only 1.3 shows a classic pre-implementation failure; 1.5 failed for real on the first run and drove the `pauseAt` fix.

### Test Summary
- Total tests: 25 (server 20, esm 2, clock 1, smoke 2); all passing.
- Layers: Unit/Node 22, Browser 1, E2E 2.
- Full command: `npx playwright test` -> `25 passed` (twice, 11.4 s and 5.5 s), exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/spikes tests/e2e/smoke.spec.js`: 25 passed, exit 0 |
| Runtime harness | smoke boot at `/` through webServer on 127.0.0.1:4173: passed (no console errors, no 4xx) |
| Rollback boundary | `package.json`, `package-lock.json`, `.gitignore`, `playwright.config.js`, `scripts/`, `tests/spikes`, `tests/blank.html`, `tests/e2e/smoke.spec.js`, test-harness spec amendment |

### Design notes / deviations
- Test project routing: `unit` also matches `tests/spikes/{server,esm}.spec.js`; `browser` matches `tests/spikes/clock.spec.js`. Not specified by design; needed so spikes run in the right context.
- Server returns 403 for refused paths (traversal, backslash, `:` , NUL) and 404 for missing files; also realpath check against symlink escape (hardening beyond design).
- `package.json` has a `test` script alias (`playwright test`) and `package-lock.json` is committed (npm default); `dependencies` absent.
- Task 1.9: spec hook requirement amended (added `aim`, `action`, `setVolley`, `start`, `audioLog`, `NOT_READY`, Title-loadLevel transition, `&loop/&audio/&stress`); scenarios updated and "Hook not ready while loading" added.

## Slice 2: Physics (PR 2 of 14) - COMPLETE (5/5)

Tasks 2.1-2.5 are marked `[x]` in `tasks.md`. Slices 4-9b are NOT started. Branch `feat/anglecraft-v1-slice-2` (base `feat/anglecraft-v1-slice-1`).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 | `tests/unit/vector.spec.js` | Unit | N/A (stub only; spike esm 2/2 re-run green) | 11 failed (stub class had no methods) | 11/11 passed | normalize ok/degenerate, 3 reflect normals, separating, 10k-reflection drift, clamp x3 | None needed |
| 2.2 | `tests/unit/collision.spec.js` | Unit | N/A (stub only) | Written before impl; run failed (stub exports no functions) | 13/13 passed | 4 edge sides, 2 corners, 2 deep-penetration axes, touching/outside, deepest x3, resolve x3 | `Collision.scratch` shared by `deepest`; MIN_DIR_Y from Layout |
| 2.3 | `tests/unit/layout.spec.js`, `tests/unit/rng.spec.js` | Unit | N/A (new) | Both specs failed `Cannot find module` | 11/11 passed (6 layout + 5 rng, run with vector: 22/22) | rng: same/different seed, range, reseed replay, nextInt coverage; layout: bounds both sides | None needed |
| 2.4 | `tests/unit/pool.spec.js` | Unit | N/A (stub only) | 5 of 10 failed first run (stub class) | 12/12 passed with esm spike | acquire/release/reuse, reset, swap-remove order, inactive release, repeated exhaustion, ball pool 50/null/reset | None needed |
| 2.5 | `tests/unit/physics.spec.js` | Unit | N/A (stub only) | 24 of 25 failed first run (stub class) | 25/25 passed after a one-test fix (see notes) | substep count 1X/2X/4X/cap, 64-substep execution, walls L/R/ceiling, clamp, no-tunnel x3 multipliers + flat side + 12 oblique angles, titanium x100 + side, deepest tie, crossing + coincident balls, landing x2, sealed floor | None needed |

Note on 2.3: tasks.md lists it as GREEN-only; under Strict TDD two small specs (`layout`, `rng`) were added first (RED confirmed) because constants and a seeded PRNG are still behaviour other modules rely on. Order deviation: 2.3 was done before 2.2 GREEN because `Collision.resolve` needs `MIN_DIR_Y` from Layout.

### Test Summary
- Total new tests: 70 (vector 11, collision 13, layout 6, rng 5, pool 10, physics 25); all passing.
- Layers: Unit/Node only (no browser launched).
- Full command: `npx playwright test` -> `95 passed` (6.9 s), exit 0 (25 slice-1 + 70 new).
- Pure functions/modules: Vector2D, Collision, Layout, Rng, ObjectPool, Physics (state limited to caller-provided pools/worlds).

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit tests/unit/{vector,collision,physics,pool}.spec.js` (plus layout, rng): all pass; full run 95 passed |
| Runtime harness | N/A: pure modules, no runtime boundary in this slice |
| Rollback boundary | `src/js/engine/{Vector2D,Collision,Physics}.js`, `src/js/system/{ObjectPool,Layout,Rng}.js`, `src/js/entities/Ball.js`, `tests/unit/{vector,collision,physics,pool,layout,rng}.spec.js`, tasks.md/apply-progress.md checkboxes |

### Design notes / deviations
- Physics world is duck-typed: `blockAt(col,row)`, `sealedFloor`, optional `onSubstep(subDt)`, `onHit(ball, surface, block, col, row)`, `onLand(ball)`. `onHit` fires only when a reflection actually happened (not for separating overlaps). `onSubstep` lets the session do emission per substep (D9) later.
- Block damage (1 HP per hit, destroy at 0) is NOT in Physics; it is slice 5b task 5b.4 and will react to `onHit`. Titanium immunity is therefore proven at Physics level as "reflects, reports, and never mutates the block"; the HP rule itself lands with 5b.4.
- Balls that land are reported via `onLand` (ball centre crosses y 956 moving down) and released from the pool at the end of the same step; the sealed floor (D11) reflects when the centre passes y 956.
- Ball direction is `ball.dir` (a `Vector2D`), `ball.speed` is the scalar. `ObjectPool` exposes `items`, `count`, `size`, `created`; active objects occupy `items[0..count-1]`.
- `Vector2D.js` and `ObjectPool.js` export only their class (keeps the slice-1 esm spike valid).
- Size: ~1,300 changed lines (about 470 source, 830 tests), above the 800 review budget; cannot shrink without deleting tests. Recommend `size:exception` for PR 2.

## Slice 3: Level loading (PR 3 of 14) - COMPLETE (5/5)

Tasks 3.1-3.5 are marked `[x]` in `tasks.md`. Slices 4-9b are NOT started. Branch `feat/anglecraft-v1-slice-3` (base slice 2b).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | covered by `level-catalog.spec.js` (Board entities) and validator specs | Unit | N/A (stubs only) | Entities written GREEN-only per task; exercised by RED specs below | passes via 3.2/3.4 | HP table per type, orb vs solid | None needed |
| 3.2 | `tests/unit/level-validator.spec.js` | Unit | N/A (new) | `Cannot find module LevelValidator.js` | passed | 3 levels, 7 missing fields, 8 bad values, 8 HP boundaries, core HP, hp on titanium/multiplier, bounds x4, duplicate, no core, launcher edges, non-object | None needed |
| 3.3 | `tests/unit/trap.spec.js` | Unit | N/A (new) | `Cannot find module Board.js` | 13/13 after one test fix | L1/L2/L3 authored entries, wrong entry, 1-cell, 2-cell, closed (I and R), 3-wide, open core, standard not wall, orb entry, pocket > 12, per-core errors | Test fix: 3-row band so no 2-cell vertical cut exists (legitimate entry found by the analysis) |
| 3.4 | `tests/unit/level-catalog.spec.js` | Unit | N/A (new) | `Cannot find module` (Board/LevelCatalog) | passed | index/JSON load, bad shots/99/-1 keep board, atomic setLevels, cell mapping, launcher 0.5/0.25 | `Multiplier.type` added so `Board.typeAt` is uniform |
| 3.5 | `tests/unit/level-validator.spec.js` | Unit | N/A | injected-reachability test written first | passed | trap error via validate, injected check, default stub | None needed |

### Test Summary
- New tests: 59 (validator 37, trap 13, catalog/board 9); full run `npx playwright test`: 154 passed (11.2 s), exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit tests/unit/{level-validator,trap,level-catalog}.spec.js`: 59 passed |
| Runtime harness | N/A: pure modules, no runtime boundary |
| Rollback boundary | `src/js/entities/{Block,Multiplier}.js`, `src/js/system/{Board,LevelValidator,TrapAnalysis,LevelCatalog}.js`, `tests/unit/{level-validator,trap,level-catalog}.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- `LevelCatalog` owns atomic `loadLevel` (validate, build, then swap `board`); `GameSession` will delegate in slice 5a.
- `validateLevel(level, { reachability })`: static reachability is an injectable stub returning `[]`, replaced by `Reachability.sweep` in task 4.3.
- Errors are `{code, field?, message}`; codes: MISSING_FIELD, INVALID_FIELD, INVALID_LEVEL, BAD_TYPE, BAD_HP, UNEXPECTED_FIELD, OUT_OF_BOUNDS, DUPLICATE_CELL, NO_CORE, LAUNCHER_OUT_OF_RANGE, TRAP_CLOSED, TRAP_ENTRY_TOO_WIDE (trap errors carry col,row).
- Trap analysis: a valid entry may be 2 vertically adjacent cells too (design says 4-adjacent); pocket excludes the entry cells. LAUNCH joins row `rows-1`.
- Separate spec `level-catalog.spec.js` added (tasks.md names only two spec files) for Board and atomic load.
- Trap-wall predicate: indestructible, reinforced, core; spec OI-1 "high-HP" resolved as `reinforced` only (no HP threshold).
