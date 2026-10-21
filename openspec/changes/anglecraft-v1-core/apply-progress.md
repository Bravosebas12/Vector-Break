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

## Slice 4: Aiming (PR 4 of 14) - COMPLETE (3/3)

Tasks 4.1-4.3 are marked `[x]` in `tasks.md`. Slices 5a-9b are NOT started. Branch `feat/anglecraft-v1-slice-4` (base slice 3).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `tests/unit/raycaster.spec.js` | Unit | N/A (stub class only) | `does not provide an export named REFLECT_LENGTH` | 12/12 after 2 fixes (test core placement; downward cursor now lands on the clamp) | block face, left/right wall, ceiling, titanium, orb ignored, rounded corner, missed corner, 2 reflected-segment cases, 4 aim cases | None needed |
| 4.2 | `tests/unit/reachability.spec.js` | Unit | 12 raycaster tests green | `Raycaster.sweep is not a function` | 10/10 (L1/L2 preview via `test.fail`) | angle range, unbounded post-bounce, surface records, two-bounce target, static vs preview, sealed row, L1-L3 static, L3 preview | Cross-checked sweep against a brute-force Collision.circleAabb stepper: 3597/3600, 3600/3600, 3598/3600 angle agreement (L1/L2/L3) |
| 4.3 | `tests/unit/level-validator.spec.js` | Unit | 42 validator tests green | unreachable-core test: expected `['CORE_UNREACHABLE']`, got `[]` | 46/46 | straight notch valid, serpentine unreachable, standard blocks ignored, injected override | Stub removed |

### Test Summary
- New tests: 12 raycaster, 10 reachability, 4 validator; full `npx playwright test`: 180 passed, exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit tests/unit/{raycaster,reachability,level-validator}.spec.js`: all passed |
| Runtime harness | N/A: pure modules, no runtime boundary |
| Rollback boundary | `src/js/system/{Raycaster,Reachability,TrapAnalysis,LevelValidator}.js`, `tests/unit/{raycaster,reachability,level-validator}.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- API: `Raycaster.aimDirection(origin, cursor)` (null on zero vector; always upward, `|dir.y| >= 0.05`, a downward cursor lands on the clamp keeping the x sign; resolves spec OI-3), `Raycaster.cast(origin, dir, board, maxBounces = 1)` -> `{contact, reflected}`, `Raycaster.trace`, `Raycaster.sweep`. `REFLECT_LENGTH = 180` (resolves spec OI-1).
- Task 4.2 says `Raycaster.sweep`, design says `Reachability.sweep`: both exist (`Reachability.sweep` delegates). `Reachability.js` also holds `coreReachabilityErrors`, wired as the default `validateLevel` reachability.
- Static geometry blockers = trap-wall types (indestructible, reinforced, core). Target per core = core cell + every cell of a valid entry (`TrapAnalysis.entryCells`, new). Reaching a target also counts when the ball touches a target block (the core). Error code `CORE_UNREACHABLE` (col,row).
- Reachability runs only when the trap rules pass (entries are undefined otherwise); trap-error behavior is unchanged.
- Reflection in the preview and the sweep re-clamps `|dir.y| >= 0.05` like `Collision.resolve`.

### Issues Found (level content, NOT edited; belongs to slice 9a)
- Level 1 under `preview` geometry: entry (3,2) is reachable only through standard-block bounces (2 angles, ~0.978 and ~1.978 rad); NO exact single side-wall bounce exists (spec scenario "Wall bounce reachable"). Under `static` geometry it is reachable via wall-right.
- Level 2 under `preview` geometry: entry (6,2) has NO reaching angle at all (no direct line holds). Under `static` it is reachable via wall-left.
- Level 3 passes under both geometries.
- The two failing content assertions are encoded as `test.fail()` in `reachability.spec.js`; remove the marker when slice 9a retunes the levels.

## Slice 5a: FSM, input, session core (PR 5a of 14) - COMPLETE (5/5), size:exception recommended

Tasks 5a.1-5a.5 are marked `[x]` in `tasks.md`. Slices 5b-9b are NOT started. Branch `feat/anglecraft-v1-slice-5a` (base slice 4).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5a.1 | `tests/unit/fsm.spec.js` | Unit | N/A (new) | `Cannot find module Fsm.js`, no tests found | 26/26 | 13 legal rows, 8 illegal rows, no return to Loading/Title, non-strict, unknown state, onEnter | None needed |
| 5a.2 | `tests/unit/input.spec.js` | Unit | N/A (new) | `Cannot find module Input.js`, no tests found | 22/22 | 8 key mappings, repeat, inert inputs, per-state accepted-action tables, paused, speed domain | None needed |
| 5a.3 | `tests/unit/session.spec.js` (EventRing) | Unit | N/A (new) | Slip: `EventRing.js` was written in the same batch as its spec, before the spec was executed; the spec was authored first but no failing run was captured | 4/4 | order, exactly-full, overwrite + count, wrap after drain | None needed |
| 5a.4 | `tests/unit/session.spec.js` | Unit | 18 session tests green after GREEN | `Cannot find module GameSession.js`, no tests found | 18/18 | boot, atomic load (bad JSON, bad index, bad setLevels), AIM, FIRE lock, step time, ring overflow vs state | `index`/`found` handling for ad-hoc level objects |
| 5a.5 | `tests/unit/session.spec.js` | Unit | 18 green | 8 of 36 failed (pause x2, restart x5, NEXT x1) | 36/36 | pause freeze/resume, paused gating, 3 ignored states, 4 restart origins, restart level kept, NEXT unlocked/locked/last/outside Victory | None needed |

### Test Summary
- New tests: 26 fsm, 22 input, 36 session (incl. 4 EventRing) = 84; full `npx playwright test`: 264 passed, exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit tests/unit/{fsm,input,session}.spec.js`: 84 passed |
| Runtime harness | N/A: DOM-free session, no runtime boundary |
| Rollback boundary | `src/js/system/{Fsm,Input,EventRing,GameSession}.js`, `tests/unit/{fsm,input,session}.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- Size: ~900 changed lines (budget 800); the three specs are table-driven but cover ~84 cases. Recommend `size:exception` or moving 5a.5 (pause/restart/NEXT) to a follow-up.
- `Fsm` table also allows `Firing|Simulating|Aiming -> Aiming` (RESTART) and `Victory|GameOver -> Aiming` (RESTART/NEXT); the spec lists only RESTART as "reload -> Aiming".
- `Input.js` exports `mapEvent` and `allows` (single gating table used by the session). `Enter` maps to NEXT (design 7a: Enter is the modal primary action); not in the 5a task key list.
- `FIRE` without a valid prior `AIM` is ignored (skill: "valid angle"); keyboard Space before any mouse move does nothing.
- `createSession` takes an injected `canAccess(index)` (default locked) until Progression (7b); `session.fsm`, `session.events`, `session.board` are exposed for tests. Volley emission, landing, Resolving and damage are slice 5b; `balls` is `[]` and Firing never advances by itself.
- `step(dt)` counts `playTime` in Aiming/Firing/Simulating and `simTime`/`volleySimTime` (scaled by speed) in Firing/Simulating, skipped while paused.

## Slice 5b: Volley economy, hook, boot (PR 5b) - COMPLETE (5/5)

Tasks 5b.1-5b.5 are marked `[x]` in `tasks.md`. Slice 6a is NOT started. Branch `feat/anglecraft-v1-slice-5b` (base slice 5a-2).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5b.1 | `tests/unit/volley.spec.js` | Unit | 36 session tests green | 8 failed (`setVolley` missing, no emission) | 47/47 with session | spacing at 1X/2X/4X, first ball on FIRE, 1-ball Firing->Aiming order, 4 Resolving outcomes, mirrored launcher x | float epsilon in spacing assertion |
| 5b.2 | `tests/unit/orbs.spec.js` | Unit | 47 green | 6 failed, 1 passed | 7/7 | pass-through, once per orb across many balls, two orbs, growth 8+4, no orbs, cap 50, RESTART | test rewritten to assert K at Resolving instead of mid-turn pending |
| 5b.3 | `tests/unit/volley-cap.spec.js` | Unit | 53 green | 2 failed (no cap), stress config already passed (config existed) | 4/4 | cap with none landed, cap after first landing, no cap on normal turn, stress 5 s | None needed |
| 5b.4 | `tests/unit/damage.spec.js` | Unit | 57 green | 8 failed, 1 passed (indestructible) | 9/9 | standard/reinforced/core/indestructible, destroy at 0 frees the cell, damage kept on cap, stars 3/2/1, score | `result` test table trimmed (1-shot level is 3 stars) |
| 5b.5 | `tests/e2e/hook.spec.js` | E2E | 291 unit green | 3 failed, 1 passed (absent without flag) | 4/4 | present, absent, NOT_READY while Loading (held level fetch), replay equality at seed 42 | None needed |

### Test Summary
- New tests: 11 volley, 7 orbs, 4 cap, 9 damage, 4 e2e hook (+ shared fixtures in `tests/unit/helpers/session.js`); full `npx playwright test`: 298 passed, exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit` 291 passed; `--project=e2e tests/e2e/hook.spec.js` 4 passed |
| Runtime harness | `tests/e2e/hook.spec.js` against `main.js` boot (real Chromium, static server) |
| Rollback boundary | `src/js/system/{GameSession,TestHook}.js`, `src/js/main.js`, `tests/unit/{volley,orbs,volley-cap,damage}.spec.js`, `tests/unit/helpers/session.js`, `tests/e2e/hook.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- `GameSession.step` runs `Physics.step` with the session as world (`onSubstep` emits and captures orbs, `onHit` damages, `onLand` records the first landing). Physics runs no substep with zero balls, so emission falls back to one `dt*speed` accumulation then.
- First ball is emitted inside `fire()`; the rest are emitted in substeps with a carried remainder (EMIT_INTERVAL 1/12 s of simTime).
- Orb capture runs at the start of each substep (positions of the previous one) and once after `Physics.step`; value counts once per orb.
- Added `session.setVolley(n)` (clamped 1..50) for the hook; `snapshot().balls` also carries `dx,dy`; `snapshot().result` = `{stars, score, shots}` (record joins in slice 7b). GameOver also fills `result` with 0 stars.
- Destroyed blocks are removed from `board.blocks` and their cell is cleared at once; cores stay in `board.cores` with hp 0.
- `main.js` loads the three level JSONs with `setLoadProgress`; `&loop=1`, `&audio=1` are NOT wired yet (slice 6a/audio). `&stress=1` (with `?test=1`) sets `sealedFloor` and `volleyCapS` Infinity. `audioLog()` returns an empty array until the Recording sink exists.
- Hook `fire(angle)`: radians from +x, upward positive (Raycaster.sweep convention).
- Overkill in the same substep is guarded by the cleared cell and `hp <= 0` early return; there is no dedicated two-balls-one-substep test (not reproducible through emission spacing).
- Size: ~640 changed lines including tests and openspec edits (budget 800).

## Slice 6a: Loop, viewport, atlas (PR 7 of 14) - COMPLETE (3/3)

Tasks 6a.1-6a.3 are marked `[x]`. Slice 6b NOT started. Branch `feat/anglecraft-v1-slice-6a` (base slice 5b).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 6a.1 | `tests/browser/viewport.spec.js` | Browser | N/A (new) | 6 failed (module missing) | 6/6 | 4 mapping cases (letterbox, pillarbox, offset rect), fit scale, 6 DPR/backing/atlas-scale rows, round trip | None needed |
| 6a.2 | `tests/browser/atlas.spec.js` | Browser | N/A (new) | 7 failed (module missing) | 7/7 | 3 scales (1x/2x/3x), prescale once (count 7, same source), OffscreenCanvas on/off, failed sheet, missing frame | Removed unused export |
| 6a.3 | `tests/e2e/loop-clock.spec.js` | E2E | 311 green | 5 failed (no Loop, no wiring) | 5/5 | 60/144/240 Hz, stall clamp (pure and under `page.clock.fastForward`), 1000 ms run, no-flag control | None needed |

Smoke safety net: `tests/e2e/smoke.spec.js` canvas attribute assertion changed 1920x1080 -> 1280x720 because Viewport now resizes the backing store to fitted size x DPR (1280x720 default viewport).

### Test Summary
- New tests: 13 browser (6 viewport, 7 atlas), 5 e2e loop; full `npx playwright test`: 316 passed, exit 0.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/browser tests/e2e/loop-clock.spec.js`: all passed; full suite 316 passed |
| Runtime harness | `tests/e2e/loop-clock.spec.js` against `main.js` with `?test=1&loop=1` under `page.clock` (pauseAt before measuring) |
| Rollback boundary | `src/js/system/{Loop,Viewport,Atlas}.js`, `src/js/main.js`, `tests/browser/{viewport,atlas}.spec.js`, `tests/e2e/loop-clock.spec.js`, `tests/e2e/smoke.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- `main.js` starts the loop when not in test mode, or with `?test=1&loop=1`; render is a no-op until the Renderer (6b). Viewport applied on boot and window resize.
- Loop step counts are measured through `snapshot().playTime / STEP` in Aiming (no extra hook method); tolerance-based, no exact frame counts.
- Atlas is not yet loaded by `main.js` (sprite settle joins `setLoadProgress` in slice 8b); `loadAtlas(scale)` never rejects and falls back to magenta placeholders.
- `applyViewport` sets the backing store to `1920*s*dpr` and a logical->backing transform; `atlasScale = clamp(ceil(s*dpr),1,3)`.

## Slice 6b: Renderer, particles, stress - COMPLETE (3/3)

Tasks 6b.1-6b.3 are marked `[x]`. Branch `feat/anglecraft-v1-slice-6b` (base slice 6a + flaky-test fix). Slice 7a NOT started.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-----------|-------------|----------|
| 6b.1 | `tests/unit/particles.spec.js` | Unit | N/A (new) | module missing | 5/5 | burst count + expansion, 400 ms life/release, reset, drop-on-full + recovery | None needed |
| 6b.2 | `tests/browser/renderer.spec.js`, `tests/e2e/render-smoke.spec.js` | Browser/E2E | 316 green | 6 failed (no Renderer); smoke failed (no stats global) | 6/6 (x5 repeat 30/30); smoke 5/5 | idle 60 frames = 1 redraw, HP redraw, destroy redraw, hpStep/crack thresholds, 12/32 burst, tiny-pool drop, placeholder atlas, Title | Fixed 3 test expectations (threshold boundaries, frame count, state) |
| 6b.3 | `tests/e2e/stress.spec.js` + `tests/fixtures/stress-level.json` | E2E | 329 green | failed (no `__ANGLECRAFT_PERF__` probe) | passed, avg ~5.0 ms CPU/frame over 601 frames | x5 repeat all green (4.9-5.3 ms) | No tuning needed |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/unit/particles.spec.js tests/browser/renderer.spec.js tests/e2e/render-smoke.spec.js tests/e2e/stress.spec.js`: all passed (repeat-each=5 for browser/e2e specs) |
| Runtime harness | `render-smoke` and `stress` drive `main.js` (`?test=1&loop=1[&stress=1]`) with real rAF, no `page.clock` |
| Rollback boundary | `src/js/{entities/Particle,system/Particles,system/Renderer}.js`, `GameSession.js` (HIT/DESTROY events, `balls`/`run` views), `main.js`, new specs + fixture, tasks.md/apply-progress.md |

### Design notes / deviations
- Session now pushes presentation-only events: `HIT(cell)` and `DESTROY(cell, blockTypeIndex)`; the Renderer is the only drainer today (slice 8a audio must share one drain handler). Session exposes read-only `balls` pool and `run` so rendering never calls `snapshot()` per frame.
- Renderer draws procedural placeholders only (HP tint 4 steps, crack lines, flash); `crack_30/60/90` atlas frames are used only when a real (non-placeholder) sheet loaded. `BOARD_ORIGIN` = centred (420, 40). `Loading`/`Title` draw only the dark background (start screen is slice 8b); HUD/modals arrive in 7a/7b.
- Aim preview is cached (recomputed only when launcher, aim or layer version changes) because `Raycaster.cast` allocates.
- Stress "CPU per frame" is measured by a test-only probe in `main.js` (`window.__ANGLECRAFT_PERF__`, only with `?test=1`): time inside each loop frame, counted from the first frame with 50 active balls. Fixture `level-99` is a trap-valid dense board with a clear column to the core.
- No page.clock in any new test, so no fixed-time pause flakiness.
