# Delta for Aiming

## ADDED Requirements

### Requirement: Launcher movement (HU-10, D-10.1–D-10.3)

In `Aiming` and not paused, a held `A` MUST move the launcher left and a held `D` right at 480 px/s of play time (independent of the speed multiplier), integrated on the fixed step. If a key is released having moved the launcher less than 8 px since its keydown, the launcher MUST be moved to exactly 8 px from where it was at that keydown (tap rule). With both keys held the launcher MUST NOT move; releasing one resumes the other. The launcher x MUST stay within `[50, 1030]` and MUST stop at the bound while the key stays held. Movement MUST NOT happen in any other state or while paused; keys held when leaving `Aiming` MUST not move the launcher until pressed again. Restart MUST restore the level's launcher x.

#### Scenario: Hold left
- GIVEN `Aiming`, launcher x 540
- WHEN `A` is held for 0.5 s of play time
- THEN launcher x is 300 (±2)

#### Scenario: Tap
- GIVEN `Aiming`, launcher x 540
- WHEN `D` is pressed and released within one step
- THEN launcher x is 548

#### Scenario: Edge
- GIVEN `Aiming`, launcher x 100
- WHEN `A` is held for 2 s
- THEN launcher x is 50 throughout the last second

#### Scenario: Opposite keys
- GIVEN `Aiming`, launcher x 540
- WHEN `A` and `D` are both held for 0.5 s
- THEN launcher x is 540

#### Scenario: Ignored in flight
- GIVEN `Simulating`, launcher x 540
- WHEN `A` is held for 0.5 s
- THEN launcher x is 540 when the next `Aiming` starts, apart from the automatic relocation

### Requirement: Preview from the moved launcher (HU-10 AC2, AC3, AC8)

The aim preview and the fired group MUST originate at the current launcher x. When the launcher moves, the preview MUST be recomputed in the same frame from the new origin toward the current pointer target.

#### Scenario: Group origin
- GIVEN the launcher moved from 540 to 300 in `Aiming`
- WHEN `FIRE` is accepted
- THEN every ball of the group starts at x 300
