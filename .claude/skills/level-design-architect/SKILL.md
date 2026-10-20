---
name: level-design-architect
description: "Trigger: level, level JSON, puzzle layout, blocks, HP, core, indestructible, multiplier orb, loop trap. AngleCraft static level schema and design rules."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "1.0"
---

## Activation Contract

Use when creating, editing, validating, or loading AngleCraft puzzle levels.

## Hard Rules

- Levels are static JSON validated against `assets/level.schema.json` at load; invalid level = hard error, never partial load.
- Grid coordinates are integer cells `(col, row)`; row 0 is the top. No two blocks share a cell.
- Block types and HP ranges are strict:

| type | hp | behavior |
|------|----|----------|
| `standard` | 1–15 | destroyed at 0 |
| `reinforced` | 20–80 | destroyed at 0 |
| `core` | 100–500 | win condition: all cores destroyed |
| `indestructible` | none | obstacle/reflector, never takes damage |
| `multiplier` | none | orb; on first touch adds `value` balls to next volley, ball passes through, then removed |

- Every level MUST contain ≥1 `core` and ≥1 **loop trap**: a cavity bounded by `indestructible`/high-HP blocks with one narrow entry (1–2 cells) where a core sits so balls bounce repeatedly inside it.
- Every core must be reachable: at least one 1-bounce path from a valid launcher angle (verify with the aim raycaster).

## Decision Gates

| Situation | Action |
|-----------|--------|
| Core has no loop trap adjacent | Reject level |
| Trap entry wider than 2 cells | Reject (trap ineffective) |
| Trap fully closed | Reject (core unreachable) |
| Difficulty tuning | Adjust `shots` and core HP, not grid size |

## Execution Steps

1. Draft layout on the grid (default 9 cols × 12 rows).
2. Place cores first, then build loop traps around them, then fill with standard/reinforced, then orbs on main bounce lanes.
3. Write JSON (`id`, `name`, `grid`, `launcher`, `shots`, `startBalls`, `blocks[]`).
4. Validate schema + design rules with `validateLevel(level)`; run reachability check.

## Output Contract

- Level files in `src/levels/levelN.json` (JSON `id` stays `level-XX`); schema in `assets/level.schema.json`.
- Block/Multiplier entities in `src/js/entities/`; loader + `validateLevel` with tests for each rejection rule.

## References

- `assets/level.schema.json` — strict JSON Schema (draft 2020-12).
- `../physics-collision-engine/SKILL.md` — reachability raycast.
