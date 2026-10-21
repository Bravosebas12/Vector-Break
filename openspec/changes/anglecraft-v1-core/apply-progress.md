# Apply Progress: anglecraft-v1-core

Mode: Strict TDD. Delivery: auto-chain / feature-branch-chain (tracker `feature/anglecraft-v1`), budget 800.

## Slice 1: Test harness + spikes (PR 1 of 14) - COMPLETE (9/9)

Tasks 1.1-1.9 are marked `[x]` in `tasks.md`. Slices 2-9b are NOT started.

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
