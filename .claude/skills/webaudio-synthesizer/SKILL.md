---
name: webaudio-synthesizer
description: "Trigger: audio, sound, SFX, music, Web Audio, impact sound, combo pitch, compressor, clipping. AngleCraft sample-based audio with procedural fallback."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "2.0"
---

## Activation Contract

Use when adding or changing any sound or music in AngleCraft. Prerecorded files in `assets/audio/` are the primary source; Web Audio synthesis is only the fallback.

## Hard Rules

- Pure Web Audio API, no libraries. Samples load once at boot via `fetch` + `decodeAudioData` into a buffer map; never decode during gameplay.
- One `AudioContext`, created/resumed on first user gesture (click/key), never at load.
- Fixed chain for everything: `voices → sfxBus | musicBus (GainNode) → compressor → limiterGain → destination`.
- Compressor: `threshold -24 dB`, `knee 12`, `ratio 12`, `attack 0.003`, `release 0.15`; `limiterGain.gain = 0.8`.
- **Voice cap**: max 24 simultaneous SFX voices; drop requests of the same type within 15 ms.
- Each voice = one `AudioBufferSourceNode` + per-voice `GainNode`; never reuse a started source node.
- **Fallback**: if a file is missing or fails to decode, play its synth recipe; never throw, never block the game.
- Persist master volume / mute in `localStorage`, wrapped in try/catch.

## Decision Gates

| Event | File (`assets/audio/`) | Fallback recipe |
|-------|------------------------|-----------------|
| Hit damageable block | `sfx_impact_std_bNN` (combo ladder) | Sine blip, `330 * 2 ** (step/24)` Hz, 90 ms |
| Hit indestructible | `sfx_impact_steel` | Triangle 110 Hz + lowpass noise 400 Hz, 80 ms |
| Block destroyed | `sfx_block_destroy` | White noise, bandpass 1.5–3 kHz, 120 ms |
| Volley launched | `sfx_burst_launch` | Rising sine sweep 300→600 Hz, 150 ms |
| Ball split by orb | `sfx_orb_split` | Two sines a perfect fifth apart |
| UI button / restart / next | `sfx_ui_click` / `sfx_ui_confirm` | Short square tick |
| Pause, speed, aim cancel, turns warning, victory, stars, defeat | Pending (see `Design/solicitud-pendientes-diseno.md` §2.7) | Synth recipe until the file is delivered |
| Background music | `music_loop_95bpm_64bars` | None (silence) |

## Execution Steps

1. **Combo ladder**: `step` increments on each consecutive hit within 250 ms; resets on gap or turn end. Steps 0–11 play `sfx_impact_std_b00..b11` (~33 cents apart, already gain-compensated). Steps ≥ 12 replay `b11` with `playbackRate = 2 ** ((step - 11) * 33 / 1200)`, capped at step 47.
2. Add ±5 cents random `detune` per voice to avoid phasing on mass hits.
3. **Music**: `AudioBufferSourceNode` with `loop = true`, `loopStart = 0`, `loopEnd = 161.684` (64 bars @ 95 BPM). Prefer `.ogg` when present, else `.wav`.
4. Expose only `audio.play(type, opts)`, `audio.music(on)`, `audio.setVolume(v)`; game code never touches nodes.

## Output Contract

- `src/js/system/WebAudio.js` (context, chain, buffer map, voice cap, combo ladder, fallback recipes).
- No audible clipping with 300 hits/second at 4X speed.

## References

- `assets/audio/` — delivered SFX and music loop.
- `Design/solicitud-pendientes-diseno.md` — pending screen sounds.
- `../game-loop-state-manager/SKILL.md` — turn end resets combo step.
