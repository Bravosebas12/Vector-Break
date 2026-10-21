# Audio Specification

## Purpose

Sample-based sound effects and music with synthesized fallback, unlocked by the title-screen start click (E4, P7). Traces to HU-02 s1/s3, HU-04, HU-09, NFR Audio. Source of truth: `webaudio-synthesizer` skill.

## Requirements

### Requirement: Gesture unlock (NFR Audio; E4, P7)

The realtime audio context MUST NOT be created or resumed before the start click on the title screen (`start-screen`); on that click effects and music MUST start together. Samples MUST already be decoded during `Loading`, so no decode happens after the click. Clicks and keys during `Loading`, and keys in `Title`, MUST NOT unlock audio.

#### Scenario: Before gesture
- GIVEN the page loaded with no input
- WHEN the audio state is read
- THEN no context is running and no music plays

#### Scenario: Start click
- GIVEN the state is `Title`
- WHEN the user left-clicks
- THEN the context is running and music starts

#### Scenario: Key does not unlock
- GIVEN the state is `Title`
- WHEN any key is pressed
- THEN no context exists and no music plays

### Requirement: Fixed chain (HU-02)

All voices MUST route `sfxBus | musicBus -> compressor -> limiterGain -> destination`, with compressor threshold -24 dB, knee 12, ratio 12, attack 0.003, release 0.15, and limiter gain 0.8. Game code MUST only call `play(type, opts)`, `music(on)`, `setVolume(v)`.

#### Scenario: Parameters
- GIVEN the audio system initialized
- WHEN the chain is inspected through the test seam
- THEN parameters equal the values above

### Requirement: Combo ladder (HU-02 s1)

Consecutive damageable hits within 250 ms MUST increase the step by 1; a gap over 250 ms or turn end MUST reset it to 0. Steps 0-11 MUST use `sfx_impact_std_b00..b11`; steps >= 12 MUST replay `b11` with `playbackRate = 2 ** ((step-11)*33/1200)`, capped at step 47.

#### Scenario: Rising steps
- GIVEN hits at t = 0, 100, 200 ms
- WHEN sounds are requested
- THEN steps are 0, 1, 2

#### Scenario: Reset on gap
- GIVEN a hit at 0 ms and the next at 300 ms
- WHEN requested
- THEN the second is step 0

#### Scenario: Cap
- GIVEN 60 consecutive hits within windows
- WHEN requested
- THEN the maximum step is 47

### Requirement: Event sounds (HU-02 s2/s3, HU-04)

The system MUST play: `sfx_impact_steel` on indestructible hits; `sfx_block_destroy` on destruction; `sfx_burst_launch` on volley launch; `sfx_orb_split` on orb capture; `sfx_ui_click`/`sfx_ui_confirm` for buttons.

#### Scenario: Titanium sound
- GIVEN a ball hits an `indestructible` block
- WHEN the recorded calls are read
- THEN `sfx_impact_steel` was requested, not a combo sound

#### Scenario: Orb sound
- GIVEN an orb captured
- WHEN calls are read
- THEN `sfx_orb_split` was requested once

### Requirement: Voice limits and variation (HU-02)

The system MUST allow at most 24 simultaneous SFX voices and drop same-type requests within 15 ms of each other; each voice MUST apply random detune within +-5 cents.

#### Scenario: Voice cap
- GIVEN 30 distinct-type requests at once
- WHEN processed
- THEN 24 voices are active

#### Scenario: Same-type drop
- GIVEN two requests of one type 10 ms apart
- WHEN processed
- THEN one voice plays

### Requirement: Music loop (E4)

Music MUST loop from `0` to `161.684 s` from the decoded buffer, using OGG when present and WAV otherwise.

#### Scenario: Loop points
- GIVEN music started
- WHEN loop settings are inspected
- THEN `loop = true`, `loopStart = 0`, `loopEnd = 161.684`

### Requirement: Fallback (HU-02)

If a sample is missing or fails to decode, the system MUST play its synth recipe and MUST NOT throw or block play. Pending screen sounds (pause, speed, victory, stars, defeat) MUST use synth recipes.

#### Scenario: Missing file
- GIVEN `sfx_block_destroy` fails to decode
- WHEN a block is destroyed
- THEN the synth fallback plays and the game continues

### Requirement: Volume persistence (skill rule)

Master volume and mute SHOULD persist in `localStorage` inside try/catch.

#### Scenario: Storage failure
- GIVEN `localStorage` throws
- WHEN volume changes
- THEN no exception propagates

### Requirement: Test seam

Audio MUST be assertable through a recording/null seam since headless contexts stay suspended.

#### Scenario: Recorded calls
- GIVEN the seam is active
- WHEN a block is destroyed
- THEN the recorded call list contains `sfx_block_destroy`

## Open Items

- OI-1: Exact synth recipes for pending screen sounds are not specified (listed only as pending).
- OI-2: There is no UI for volume/mute in v1; whether keys exist is not stated.
- OI-3: Sound for pause/speed changes is pending design.
