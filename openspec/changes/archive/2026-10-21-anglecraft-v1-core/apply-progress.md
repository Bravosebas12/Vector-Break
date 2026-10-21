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

## Slice 7a: strings + HudModel - COMPLETE (3/3)

Tasks 7a.1-7a.3 are marked `[x]`. Branch `feat/anglecraft-v1-slice-7a` (base slice 6b). Slice 7b NOT started.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 7a.1 | covered by `tests/unit/hud-model.spec.js` | Unit | N/A (new) | n/a (copy constants) | used by 7a.2/7a.3 tests | Skipped: purely structural constants; no-PRECISION/no-Esc asserted against the copy | None needed |
| 7a.2 | `tests/unit/hud-model.spec.js` | Unit | N/A (new) | module `Hud.js` missing (run errored, no tests found) | 11/11 | pips 8/12/20, colors 5/4/3/2/1/0, mm:ss 4 cases, speed 1X/4X, launch enabled/disabled, pause via real session | None needed |
| 7a.3 | `tests/unit/hud-model.spec.js` | Unit | 11 green | 6 failed (`modalModel is not defined`) | 17/17 | victory 2-star with next, 3-star perfect, last level, defeat, no modal in other states | None needed |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/unit/hud-model.spec.js --project=unit`: 17 passed; full suite 346 passed x3 |
| Runtime harness | N/A: pure DOM-free model (Node unit); one test drives a real `createSession` for the pause toggle. Canvas drawing arrives in 7b.3 |
| Rollback boundary | `src/js/system/{Hud,strings}.js`, `tests/unit/hud-model.spec.js`, tasks.md/apply-progress.md |

### Design notes / deviations
- `hudModel(snap, {levelCount})` returns `{telemetry, control, pause}`; `modalModel(snap, {levelCount, record})` returns `null | victory | defeat` with `buttons[{label, action, primary}]` and `primaryAction` (Enter). `record` is injected by the caller because the session snapshot has no `result.record` until Progression (7b).
- Victory primary is Siguiente nivel, or Repetir on the last level. Speed labels use `1X/2X/4X` per the spec.
- Renderer not touched; drawing of HUD/modals is wired in 7b.3.

## Slice 7b: Progression + modals - COMPLETE (3/3)

Tasks 7b.1-7b.3 are marked `[x]`. Branch `feat/anglecraft-v1-slice-7b` (base slice 7a). Slice 8a NOT started.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 7b.1 | `tests/unit/progression.spec.js` (+ `input.spec.js` Enter -> CONFIRM) | Unit | 318 unit green | `Progression.js` missing (no tests found) | 11/11 progression; 325 unit green | stars 1/2/3 + odd limit, score zero/non-zero unused, isBetter on each key, worse run keeps record, session win/defeat/last level/CONFIRM | Session rating/score now call `starRating`/`scoreOf` |
| 7b.2 | `tests/browser/storage.spec.js` | Browser | 325 green | 3 failed (throwing storage, corrupt JSON, null storage), 2 passed | 5/5, x5 repeat 25/25 | persist+reload, throwing storage, corrupt value, null storage, restart leaves records | Added `defaultStorage()` guard (SecurityError on access) |
| 7b.3 | `tests/e2e/progression-flow.spec.js` | E2E | 330 green | 3 failed (no text drawn: renderer had no HUD/modal) | 3/3, x5 repeat 15/15 | win (RESUELTO, Siguiente nivel, record stored, CONFIRM -> level 2), defeat (FALLIDO, no record, CONFIRM restarts), HUD panels | None needed |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/unit/progression.spec.js tests/browser/storage.spec.js tests/e2e/progression-flow.spec.js`: passed (browser/e2e --repeat-each=5) |
| Runtime harness | `progression-flow.spec.js` drives `main.js` (`?test=1&loop=1`, real rAF, no page.clock) and spies canvas `fillText`; level 1 served via `page.route` with a cleared column |
| Rollback boundary | `src/js/system/{Progression,HudView}.js`, `GameSession.js`, `Input.js`, `Renderer.js`, `main.js`, the three new specs, `input.spec.js`, tasks.md/apply-progress.md |
| Full suite | `npx playwright test` x3: 366 passed each |

### Design notes / deviations
- `createSession({ progression })` wires `canAccess` and records on every win; the plain `canAccess` option remains for existing tests. Unlock lives in the session (D1); records persist under `anglecraft.v1.records`, keyed by level index (`{"0": {stars, score, shots}}`) instead of the design's `"level-01"` keys.
- Enter now maps to a new `CONFIRM` action (Victory/GameOver): next level when offered, else restart (the modal primary action). Input table and spec updated accordingly; `NEXT` is unchanged.
- HUD/modals are drawn by `HudView.js` (called from `Renderer.draw`); models refresh at 10 Hz and on state change. Modal buttons are NOT mouse-clickable yet: `main.js` has no DOM input listeners until the start-screen slice (8b); keyboard actions work through the hook/session.
- Level 1/2 reachability `test.fail()` markers untouched.

## Slice 8a: Audio - COMPLETE (2/2)

Tasks 8a.1-8a.2 are marked `[x]`. Branch `feat/anglecraft-v1-slice-8a` (base slice 7b). Slice 8b NOT started.

| Task | Test File | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|-----|-------|-------------|----------|
| 8a.1 | `tests/unit/audio-seam.spec.js` | Unit | `AudioSinks.js` missing (no tests found) | 23/23; orb/steel session test failed until `STEEL`/`ORB` events were added | ladder rise/gap/250 ms/cap/reset, limiter cap/same-type/expiry, mapper per event, real session turn | None needed |
| 8a.2 | `tests/browser/webaudio.spec.js` | Browser | 7 failed (`createWebAudio` missing) | 7/7, `--repeat-each=5` 35/35 | before/after unlock, chain, loop, sample vs synth vs failed, limiter, volume incl. throwing storage, renderer fan-out | None needed |

Work Unit Evidence: focused `npx playwright test tests/unit/audio-seam.spec.js --project=unit` 23 passed; `tests/browser/webaudio.spec.js --project=browser --repeat-each=5` 35 passed. Runtime harness: real Chromium AudioContext (suspended is fine; assertions read node params and adapter counters). Rollback: `AudioSinks.js`, `WebAudio.js`, the two specs, and the small `GameSession.js`/`Renderer.js` edits. Full suite x3: 396 passed each.

Notes: session now pushes `STEEL` (indestructible hit) and `ORB` (capture) events; `createRenderer({ onEvent })` fans its single ring drain out to audio. Mapper takes `now()` ms (adapter passes `playTime`). Hook-only runs (no `loop=1`) never drain the ring; 8b must pump it for `audioLog`. Star/turns-warning sounds have recipes but no session events yet.


## Slice 8b: Start screen - COMPLETE (3/3)

Tasks 8b.1-8b.3 are marked `[x]`. Branch `feat/anglecraft-v1-slice-8b` (base slice 8a). Slice 9a NOT started.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-----------|-------------|----------|
| 8b.1 | `tests/unit/asset-loader.spec.js` | Unit | 396 green | `AssetLoader.js` missing (no tests found) | 6/6 | per-settle progress with gated fetches, fetch/decode failure, failed atlas, level fetch failure, level validation failure | None needed |
| 8b.2 | `tests/unit/title-screen.spec.js` | Unit | 402 green | `TitleScreen.js` missing (no tests found) | 8/8 | 40%/33%/0-total, bar centered, pulse 0.5..1 over 1 s, error state, draw calls via fake ctx | None needed |
| 8b.3 | `tests/e2e/start-screen.spec.js` | E2E | 410 green | 10 failed, 1 trivially passing (no listeners, no audio, no title draw) | 11/11, `--repeat-each=5` 55/55 | Loading ignored + not replayed, Title keys/right click ignored, click unlock+music, aim/fire/Space/Esc/contextmenu, visibility pause, single drain with and without loop, title/prompt/no HUD, loadError, 404 sample (synth), real decode (samples) | Hold-back of the last settle so Title is entered after levels/buffers are installed |
| 8b.3 extra | `tests/unit/audio-seam.spec.js` | Unit | 23 green | 2 failed (`STARS`/`TURNS` unmapped) | 25/25 | stars 3/1/0, turns 4/3/2/1/0, session win vs open turn | None needed |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/unit/{asset-loader,title-screen}.spec.js --project=unit`: 14 passed; `tests/e2e/start-screen.spec.js --project=e2e --repeat-each=5`: 55 passed |
| Runtime harness | `start-screen.spec.js` drives `main.js` through real Chromium mouse/keyboard events, `page.route` (held levels, 404 sample/music/level), real `OfflineAudioContext` decode of the shipped WAVs, and the real WebAudio adapter (`&audio=1`) |
| Rollback boundary | `AssetLoader.js`, `TitleScreen.js`, `main.js`, small edits in `GameSession.js` (`loading` getter, `STARS`/`TURNS` events), `Renderer.js` (title draw, `ui`), `TestHook.js` (`drain`), `AudioSinks.js` (`teeSink`, mapper cases), the three specs |

### Design notes / deviations
- Real DOM input lives in `main.js` (window listeners registered once); AIM subtracts `BOARD_ORIGIN` from the logical point because the session aims in board coordinates.
- `?test=1` skips real audio assets (instant settle) unless `&audio=1`; with `&audio=1` the real WebAudio is wrapped in `teeSink` with a RecordingSink so `audioLog` still works. `window.__ANGLECRAFT_AUDIO__` exposes the WebAudio adapter (state, stats) in test mode.
- Hook-only runs (no `&loop=1`) drain the ring inside the hook's `step`; with the loop only the renderer drains.
- The last settle is held back (`setLoadProgress(total - 1)`) until levels and buffers are installed, then completed, so Title implies a ready session.
- Samples listed: the 18 shipped SFX plus music (decoded with one OfflineAudioContext). Sounds without a shipped WAV use synth recipes.
- Newly mapped sounds: stars on Victory (`STARS` event), turns warning (<=3) / critical (<=1) on each new turn (`TURNS` event). Already mapped earlier: pause in/out, speed x1/x2/x4, victory, defeat.
- REMAINING unmapped: `sfx_ui_click`/`sfx_ui_confirm` (modal buttons are not mouse-clickable yet, no button events exist).
- Level 1/2 reachability `test.fail()` markers untouched.


## Slice 9a: Levels 4-6 - COMPLETE (2/2)

Tasks 9a.1-9a.2 are marked `[x]`. Branch `feat/anglecraft-v1-slice-9a` (base slice 8b). Slice 9b NOT started.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 9a.1 | `tests/unit/level-content.spec.js`, `tests/unit/reachability.spec.js` | Unit | 22 reachability/catalog tests green | `test.fail()` markers removed: L1 and L2 reachability tests failed (no 1-side-wall path / no path at all under preview geometry) | 22/22 after retuning `level1.json` and `level2.json` | L1 and L2 each asserted on data, entry (`isTrapEntry`), no direct line and wall-bounce path; L2 obtuse + `wall-left` only + >= 20 angles | None needed |
| 9a.2 | `tests/unit/level-content.spec.js` | Unit | 9a.1 green | Spec failed at load: `level4.json`..`level6.json` missing | 22/22 after authoring L4-L6 and registering them in `main.js` | per-level ranges, mechanics (>= 2 incl. forced wall bounce), preview reachability of every core entry, `T4<=T5<=T6` | Level layouts found by random search over titanium shields, then checked with `Raycaster.sweep` (throwaway scripts deleted) |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=unit tests/unit/level-content.spec.js tests/unit/reachability.spec.js`: 22 passed |
| Runtime harness | N/A: JSON + pure tests; `main.js` level list extended to six files (HUD total comes from the catalog) |
| Rollback boundary | `src/levels/level{1,2,4,5,6}.json`, `main.js` `LEVEL_FILES`, `level-content.spec.js`, `reachability.spec.js` marker removal, tasks.md/apply-progress.md |

### Design notes / deviations
- L1: standard (1,5 hp4) moved to (1,9) (it blocked the only left-wall bounce lane). L2: titanium (5,2) moved to (4,7) and standard (0,9) moved to (0,7); authored entry `(6,2)` unchanged and still a valid trap entry. Window 42 angles of 3600, all `wall-left`, all obtuse.
- L4 "Bank Shot" (shots 12, balls 4, core 200 at (7,1), entry (7,2), right-wall bank, titanium diagonal shield, orb +2). L5 "Hard Corner" (13, 5, core 300 at (1,1), entry (1,2), titanium shields + reinforced, orb +2). L6 "Twin Traps" (15, 6, two cores 250+250 at (1,1) and (7,1), mirrored traps: one aims left, one right, five titanium shields, two orbs +3).
- L1/L2 `test.fail()` markers removed from `reachability.spec.js`.


## Slice 9b: Solutions + playthrough - COMPLETE (3/3)

Tasks 9b.1-9b.3 are marked `[x]`. Branch `feat/anglecraft-v1-slice-9b` (base slice 9a). Optional mouse-clickable modal buttons and `sfx_ui_click`/`sfx_ui_confirm` NOT done (remaining).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 9b.2/9b.1 | `tests/e2e/playthrough.spec.js` | E2E | full suite 437 green | spec written first; failed at load (`tests/fixtures/solutions.json` missing) | 2/2 after the fixture (hook beam search per level, seed 1, 1 degree grid) and L4 tune | `--repeat-each=5`: 10/10; test 1 hook-stepped L1-L6, test 2 real loop L6 with last-level notice | Test 2 first waited on every real-time shot (30 s timeout); now only the last shot is real-time |
| 9b.3 | whole suite | All | - | - | 437 passed, repeated | 5 consecutive runs 437/437, plus `--repeat-each=3` 1311/1311 | None needed |

### Solutions (degrees, seed 1) and results

| Level | Shots used / max | Angles |
|---|---|---|
| L1 | 3 / 10 | 155, 22, 10 |
| L2 | 3 / 12 | 11, 142, 14 |
| L3 | 2 / 12 | 30, 125 |
| L4 | 9 / 12 | 107, 14, 11, 14, 151, 12, 170, 65, 25 |
| L5 | 10 / 13 | 145, 16, 106, 82, 92, 7, 164, 164, 164, 164 |
| L6 | 14 / 15 | 140, 38, 48, 67, 60, 130, 140, 174, 123, 126, 125, 126, 124, 21 |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test --project=e2e tests/e2e/playthrough.spec.js --repeat-each=5`: 10 passed |
| Runtime harness | The spec drives `main.js` through a real Chromium Title click, the hook (fire/step) and localStorage; test 2 uses the real loop and the canvas `fillText` capture |
| Rollback boundary | `tests/e2e/playthrough.spec.js`, `tests/fixtures/solutions.json`, `src/levels/level4.json` (core hp 200 -> 100), tasks.md/apply-progress.md |

### Design notes / deviations
- L4 was not completable: a single shot dealt at most ~12-14 core damage (fine 0.1 degree scan), so 200 HP could not fall in 12 shots. Core HP lowered to 100 (shots 12, startBalls 4 unchanged); content tests keep 100-500 and T4 <= T5 <= T6.
- `package.json` has no `dependencies` (only devDependency `@playwright/test` 1.63.0).
- One unidentified failure was seen in one of the first three full runs; the next 8 full runs and a 3x repeat were all green.


## Slice 9c: Verify remediation - COMPLETE (4/4)

Tasks 9c.1-9c.4 are marked `[x]`. Worktree `slice-9c` (branch `feat/anglecraft-v1-slice-9c`, base slice 9b + verify-report). Closes verify findings C1, C2, W1, W2 (and S1: ui sounds are now mapped). Gameplay rules and levels untouched.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 9c.1 C1 | `tests/unit/package.spec.js` | Unit | full suite 437 green | Characterization: behavior already held (passed first run); with `dependencies: {left}` injected the test failed, then package.json restored | 2/2 | 2 tests (no runtime deps; exact devDependencies) | None |
| 9c.2 C2 | `tests/unit/damage.spec.js` > overkill | Unit | damage.spec 8 green | Characterization: passed first run; with both the `hp <= 0` guard and the cell-freeing line removed it failed (`DESTROY` count 2 vs 1), then GameSession.js restored | 1/1 | Two balls set up by hand in the pool at the same x/y so both hit in one substep; asserts DESTROY count, damage, block hp 0, block gone | None |
| 9c.3 W2 | `tests/unit/volley-cap.spec.js` > pause excluded | Unit | volley-cap 4 green | Characterization: passed first run; with paused steps advancing `volleySimTime` it failed (45.008 vs < 40.017), then restored | 1/1 | Asserts no VOLLEY_CAPPED while paused, volley time frozen, cap fires in [45, 45+2 steps) after resume | None |
| 9c.4 W1 | `tests/unit/modal-click.spec.js`, `tests/unit/input.spec.js`, `tests/e2e/modal-click.spec.js` | Unit + E2E | input/hud/session specs green | Unit: module export `hitModalButton` missing, input table PRESS rows failing; e2e: 3/3 failed with main.js reverted | Unit 7/7 + input green; e2e 15/15 with `--repeat-each=5` | Victory 3 buttons, defeat 1 button, miss clicks, locked NEXT emits only UI_CLICK, PRESS ignored outside modals | Button geometry extracted to `modalButtonRects`, shared by drawing and hit testing |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/modal-click.spec.js --project=e2e --repeat-each=5`: 15 passed; unit specs 7 + input green |
| Runtime harness | Real Chromium mouse clicks at the drawn button centers (logical = client x 1.5), fresh context per test, audio asserted through `audioLog` |
| Full suite | 3 consecutive runs of `npx playwright test`: 451 passed each, exit 0 |
| Rollback boundary | New: `tests/unit/package.spec.js`, `tests/unit/modal-click.spec.js`, `tests/e2e/modal-click.spec.js`. Edits: `src/js/main.js`, `GameSession.js`, `Input.js`, `HudView.js`, `AudioSinks.js`, `damage.spec.js`, `volley-cap.spec.js`, `input.spec.js` |

### Design notes / deviations
- Clicks reach the session as a new `PRESS {target}` action (allowed only in Victory/GameOver) built by main.js after a logical-coordinate hit test, instead of widening pointer `FIRE`; Loading/Title/Aiming gating is unchanged. `PRESS` emits `UI_CLICK`, then `UI_CONFIRM` only when the action changed the state (a locked NEXT only clicks).
- C2 note: the cell is freed at once, so a second ball in the same substep finds no block and `onHit` is not even called; the `hp <= 0` guard is a second layer.
