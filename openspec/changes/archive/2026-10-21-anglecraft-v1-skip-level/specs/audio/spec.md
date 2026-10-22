# Delta for Audio

## MODIFIED Requirements

### Requirement: Event sounds (HU-02 s2/s3, HU-04, HU-12)

The system MUST play: `sfx_impact_steel` on indestructible hits; `sfx_block_destroy` on destruction; `sfx_burst_launch` on volley launch; `sfx_orb_split` on orb capture; `sfx_ui_click`/`sfx_ui_confirm` for buttons; `sfx_ui_confirm` when a level is skipped. A skip MUST NOT play the victory, star or defeat sounds.

#### Scenario: Titanium sound
- GIVEN a ball hits an `indestructible` block
- WHEN the recorded calls are read
- THEN `sfx_impact_steel` was requested, not a combo sound

#### Scenario: Orb sound
- GIVEN an orb captured
- WHEN calls are read
- THEN `sfx_orb_split` was requested once

#### Scenario: Skip sound
- GIVEN level 2 in `Simulating`
- WHEN `N` is pressed
- THEN `sfx_ui_confirm` was requested once and no `sfx_victory`, `sfx_star_*` or `sfx_defeat`
