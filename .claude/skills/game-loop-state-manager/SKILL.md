---
name: game-loop-state-manager
description: "Trigger: game state, FSM, turn, aiming, firing, victory, game over, controls, mouse, keyboard, restart, speed keys. AngleCraft state machine and PC input."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "1.0"
---

## Activation Contract

Use when adding or changing game states, transitions, input handling, or turn-end logic in AngleCraft.

## Hard Rules

- Single FSM owns flow. States: `Loading`, `Title`, `Aiming`, `Firing`, `Simulating`, `Resolving`, `Victory`, `GameOver` (+ `Paused` overlay). `Loading` ignores all input; `Title` waits for a click that unlocks audio and loads level 1.
- Each state implements `enter()`, `update(dt)`, `exit()`, `handleInput(action)`. No state logic outside its object.
- Transitions only through `fsm.transition(next)`; illegal transitions throw in dev.
- Input layer maps raw DOM events to **actions**; states never read DOM events directly.
- Listeners are registered once at boot, never per state.

## Decision Gates

| From | Event | To |
|------|-------|----|
| Aiming | `FIRE` (left click / Space) with valid angle | Firing |
| Firing | all balls of the volley emitted | Simulating |
| Simulating | 100% active balls reached the floor | Resolving |
| Resolving | all core blocks destroyed | Victory |
| Resolving | shots left = 0 and cores remain | GameOver |
| Resolving | otherwise | Aiming |
| Any | `RESTART` (R) | reload level → Aiming |
| Aiming / Firing / Simulating | `PAUSE` (P) | Paused overlay (freeze simulation, keep state) |
| Paused | `PAUSE` (P) | resume previous state unchanged |

## Execution Steps

1. Input map (PC):
   - `mousemove` → `AIM(x, y)` (only consumed in Aiming; compute direction from launcher).
   - `mousedown` button 0 / `keydown Space` → `FIRE` (`preventDefault` on Space).
   - `keydown 1|2|4` → `SET_SPEED(1|2|4)` (valid in Firing/Simulating; resets to 1 on Aiming enter).
   - `keydown R` → `RESTART` (debounced, no auto-repeat: ignore `e.repeat`).
   - `keydown P` → `PAUSE` toggle (ignore `e.repeat`). No `Esc` or right-click actions in v1.
2. Firing: emit balls from pool every N fixed steps (e.g. 0.08 s) along the locked direction.
3. Turn-end sync: keep `activeBalls` counter. On floor contact: ball deactivated, released to pool, counter decremented, first landing x stored as next launcher x. Transition to Resolving only when `emitted === volleySize && activeBalls === 0`.
4. Resolving: apply multipliers collected, update score, check win/lose in table order.

## Output Contract

- FSM and input mapping live in `src/js/main.js`; extract to `src/js/system/` when they grow.
- Tests for every transition row, including "last ball lands while still Firing" (must not end turn).

## References

- `../canvas-renderer-opt/SKILL.md` — pools used for balls.
- `../physics-collision-engine/SKILL.md` — speed multiplier via substeps.
