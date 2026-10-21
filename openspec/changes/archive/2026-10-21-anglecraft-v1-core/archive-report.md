# Archive Report: anglecraft-v1-core

**Project**: vector-break (AngleCraft)
**Artifact store**: openspec (filesystem merge and move performed; Engram archive report saved for traceability)
**Archived on**: 2026-10-21
**Archived to**: `openspec/changes/archive/2026-10-21-anglecraft-v1-core/`
**Worktree / branch at close**: `C:\Users\bravo\wt\vector-break\slice-9c` / `feat/anglecraft-v1-slice-9c`
**Archive status**: closed, intentional-with-warnings (no CRITICAL issues; W3 and suggestions S2-S7 carried as historical/advisory)

This report describes the state of the change at close. Intermediate snapshots (`apply-progress`, `verify-report`) are cited with their own timestamps where they are used as history.

## 1. Final State (at close)

Ranking applied per the Final-State Authority hierarchy: persisted tasks artifact, then orchestrator final-state facts, then intermediate snapshots.

| Item | Final state | Source (rank) |
|------|-------------|---------------|
| Task completion | 58/58 checkboxes `[x]`, 0 unchecked (`tasks.md`, 58 checkbox lines) | tasks artifact (1) |
| Verify verdict | PASS WITH WARNINGS; 0 CRITICAL | orchestrator final-state facts (2); `verify-report.md` re-verify at HEAD `3fccbf9` (3, historical) |
| Requirements | 86/86 covered (sum of `### Requirement:` headings across the 12 merged specs = 86) | merged specs (1); verify-report (3) |
| Scenarios | 163/163 covered by passing tests | orchestrator final-state facts (2); verify-report (3) |
| Test suite | 451 passing, three consecutive runs, exit 0 | orchestrator final-state facts (2); verify-report (3) |
| Open warnings | W3 (historical strict-TDD process slips; not a code defect) | verify-report (3), confirmed as still applicable |
| Open suggestions | S2 (L4 core HP, see section 4), S3-S7 advisory | verify-report (3) |
| Resolved at slice 9c | C1, C2, W1, W2, S1 resolved with test evidence | verify-report (3); apply-progress (3) |

### Warning and suggestion disposition

- **W3** (historical strict-TDD slips: 5a.3 without captured RED, several GREEN-only tasks, 9c.1-9c.3 characterization tests): recorded as historical process history. Not a code defect; no archive action.
- **S2** (L4 core HP tuned 200 to 100): addressed by a recorded content deviation, see section 4.
- **S3** (rare flaky test not reproduced in six full runs): open, unidentified.
- **S4** (L5 solution repeats angle 164; seed-bound solutions brittle): open, advisory.
- **S5** (no coverage, lint, or type-check tooling): open, advisory.
- **S6** (overkill test passes because the destroyed cell is freed immediately; `hp <= 0` guard in `GameSession.onHit` not isolated by this test alone): open, advisory. The spec scenario outcome is fully proven.
- **S7** (e2e modal-click tests use fixed `waitForTimeout(200)`): open, advisory.

## 2. Spec Sync (openspec/specs/)

`openspec/specs/` contained only `.gitkeep` before this archive, so all 12 change specs were new capabilities and were copied as full specs (no delta merge was required; none of the 12 files contain ADDED/MODIFIED/REMOVED/RENAMED sections). No existing requirement was overwritten and no destructive delta was present.

| Domain | Action | Requirements | Scenarios note |
|--------|--------|--------------|----------------|
| aiming | Created | 6 | |
| audio | Created | 9 | includes UI sounds (UI_CLICK, UI_CONFIRM) added in 9c |
| game-state | Created | 7 | pause excluded from volley cap (9c W2) |
| hud | Created | 7 | clickable modal buttons (9c W1) |
| level-content | Created | 7 | levels 1-6; see section 4 for L4 HP |
| level-loading | Created | 8 | |
| physics | Created | 9 | |
| progression | Created | 6 | |
| rendering | Created | 8 | |
| start-screen | Created | 6 | HU-09 (amendment captured in design) |
| test-harness | Created | 6 | no runtime dependency (9c C1) |
| volley-economy | Created | 7 | volley cap 50 in v1; overkill test (9c C2) |

Total: 12 domains, 86 requirements.

Source-of-truth paths:
- `openspec/specs/aiming/spec.md`
- `openspec/specs/audio/spec.md`
- `openspec/specs/game-state/spec.md`
- `openspec/specs/hud/spec.md`
- `openspec/specs/level-content/spec.md`
- `openspec/specs/level-loading/spec.md`
- `openspec/specs/physics/spec.md`
- `openspec/specs/progression/spec.md`
- `openspec/specs/rendering/spec.md`
- `openspec/specs/start-screen/spec.md`
- `openspec/specs/test-harness/spec.md`
- `openspec/specs/volley-economy/spec.md`

Note: the Engram `sdd/anglecraft-v1-core/spec` observation (#360) predates the start-screen amendment and lists 11 capabilities. The filesystem spec set (12 capabilities) is authoritative.

## 3. Scope Decisions (v1)

- Volley cap: 50 balls in v1 (supersedes 200, decision A10_v1_cap). The 200-ball volley is deferred to the levels 8-10 spec. NFR 60 FPS target is 50 balls at 4X (E2_v1).
- HU-07 (menu and screens: level select, settings, full pause menu) is out of v1 and deferred to a future spec. P pause is kept (C1).
- HU-01 to HU-06, HU-08, and HU-09 are in scope.
- Level count: 6 levels total (3 normal levels added beyond level 3, D3_count).

## 4. Content Deviation (recorded at archive)

- **Level 4 core HP was tuned from 200 to 100 during slice 9b.** Constraint held: T4 <= T5 <= T6 (within the 100-500 range). Evidence: `src/levels/level4.json` currently has core `hp: 100`.
- The `level-content` spec does not pin a level 4 core HP value (it only requires total core HP to be non-decreasing from level 4 to 5 and from 5 to 6), so this is a design-level tuning deviation, not a spec violation.
- Verify-report suggestion S2 asked for this to be recorded in design or spec level notes. It is recorded here; design and spec documents were not edited at archive time.

## 5. Delivery (final state, from orchestrator facts and verified with `gh pr list`)

- Delivery strategy: `auto-chain`, chain strategy `feature-branch-chain`, tracker branch `feature/anglecraft-v1`, review budget 800 lines.
- PRs #1 to #15 were chained and merged into slice branches. Because of merge order, only PR #1 reached `feature/anglecraft-v1`. Intermediate slice branches were deleted.
- Consolidation PRs, all OPEN and targeting `feature/anglecraft-v1`:
  - PR #16: slice-9a into `feature/anglecraft-v1`
  - PR #17: slice 9b into `feature/anglecraft-v1`
  - PR #18: slice 9c remediation (`feat/anglecraft-v1-slice-9c`) into `feature/anglecraft-v1`
- No PR has been merged to `main`.
- Commit, push, and PR decisions remain under ordinary repository policy; this archive does not authorize delivery.

## 6. Discrepancies Recorded (not silently resolved)

1. **Task count**: `verify-report` (at verification time) states "All 60 tasks complete"; the Engram tasks observation (#364) says "about 60 TDD-paired tasks". The persisted `tasks.md` contains 58 checkbox items, all `[x]`. Per ranking, the tasks artifact (58) is authoritative. The 60 figure is a snapshot approximation; no unchecked items exist in either form.
2. **Verify HEAD**: `verify-report` (Engram #376) cites HEAD `3fccbf9`. The worktree HEAD at archive time is `642a2dd` (`docs(spec): update verify report to PASS WITH WARNINGS after remediation`). Verified with `git log 3fccbf9..HEAD` and `git diff --stat 3fccbf9 HEAD -- src tests`: the single commit in between is `642a2dd`, which touches only the spec and verify-report documents; no `src/` or `tests/` file changed after the verified code state.
3. **Spec capability count**: Engram spec observation #360 lists 11 capabilities (pre-amendment). Filesystem contains 12 (start-screen added by the design amendment, #361). Filesystem is authoritative.
4. **Research artifact**: `research.md` exists in the change folder and was archived with it. No Engram `sdd/anglecraft-v1-core/research` observation was found; this is consistent with openspec mode and is not a gap.

## 7. Traceability

### Artifacts archived (openspec)

`openspec/changes/archive/2026-10-21-anglecraft-v1-core/`:
- `exploration.md`
- `research.md`
- `proposal.md`
- `specs/` (12 domain delta specs: aiming, audio, game-state, hud, level-content, level-loading, physics, progression, rendering, start-screen, test-harness, volley-economy)
- `design.md`
- `tasks.md`
- `apply-progress.md`
- `verify-report.md`
- `state.yaml` (phases updated: `verify: done`, `archive: done`)
- `archive-report.md` (this file)

### Engram observation IDs read or referenced

| Artifact | Topic key | Observation ID |
|----------|-----------|----------------|
| explore | `sdd/anglecraft-v1-core/explore` | #357 |
| proposal | `sdd/anglecraft-v1-core/proposal` | #359 |
| spec | `sdd/anglecraft-v1-core/spec` | #360 (pre-amendment, 11 capabilities) |
| design | `sdd/anglecraft-v1-core/design` | #361 (amendment pass) |
| tasks | `sdd/anglecraft-v1-core/tasks` | #364 |
| apply-progress | `sdd/anglecraft-v1-core/apply-progress` | #367 (slice 9c remediation) |
| verify-report | `sdd/anglecraft-v1-core/verify-report` | #376 (re-verify, PASS WITH WARNINGS) |
| slice 1 discovery | `sdd/anglecraft-v1-core/slice-1` | #368 (context only) |

## 8. Mechanical Readback (verbatim)

Spec merge, one `diff -r` per domain (source change spec vs. `openspec/specs/<domain>/spec.md`), all with empty output and exit 0. Full-tree readback `diff -r openspec/changes/anglecraft-v1-core/specs openspec/specs -x .gitkeep` also returned empty output with exit 0.

Archive move: pre-move snapshot of `openspec/changes/anglecraft-v1-core` compared against `openspec/changes/archive/2026-10-21-anglecraft-v1-core` with `diff -r` returned empty output with exit 0. The active `openspec/changes/` directory no longer contains the change.

This report file is additive and excluded from the readback, as it did not exist in the source snapshot.

## 9. Learnings

1. Full-spec archive of new capabilities is a mechanical copy; a diff-per-domain readback is the cheapest integrity check.
2. Task counts quoted in verify and tasks observations drift from the persisted checkbox count; the tasks file is the authority.
3. Level tuning that deviates from design should be recorded at archive time when the spec does not pin the value.
