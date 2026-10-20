---
name: webaudio-synthesizer
description: "Trigger: audio, sound, SFX, Web Audio, oscillator, noise, hit sound, compressor, clipping. AngleCraft procedural sound synthesis with no external files."
license: Apache-2.0
metadata:
  author: "jbravo"
  version: "1.0"
---

## Activation Contract

Use when adding or changing any sound in AngleCraft. All audio is synthesized at runtime with the pure Web Audio API.

## Hard Rules

- NO audio files, NO libraries. Only `AudioContext`, `OscillatorNode`, `AudioBufferSourceNode`, `BiquadFilterNode`, `GainNode`, `DynamicsCompressorNode`.
- One `AudioContext`, created/resumed on first user gesture (click/key), never at load.
- Signal chain is fixed: `voices → sfxBus (GainNode) → compressor → limiterGain → destination`.
- Compressor: `threshold -24 dB`, `knee 12`, `ratio 12`, `attack 0.003`, `release 0.15`; `limiterGain.gain = 0.8`.
- **Voice cap**: max 24 simultaneous voices; extra hit requests within the same 15 ms window are dropped. Rate-limit per sound type.
- Every voice uses a gain envelope (`setValueAtTime` + `exponentialRampToValueAtTime` to `0.0001`) and calls `stop()`; never ramp to 0 exponentially.
- White noise buffer (1 s, mono) is generated ONCE at init and reused.

## Decision Gates

| Event | Sound |
|-------|-------|
| Ball hits damageable block | Sine blip, pitch from combo step |
| Block destroyed | White-noise burst through bandpass (1.5–3 kHz), 120 ms decay |
| Ball hits indestructible | Dull metallic thud: triangle 110 Hz + lowpass noise 400 Hz, 80 ms |
| Multiplier orb collected | Two quick ascending sines (perfect fifth) |
| Victory / GameOver | Short arpeggio up / down |

## Execution Steps

1. Microtonal combo scale: `freq = BASE * 2 ** (step / 24)` (quarter tones), `BASE = 330 Hz`, `step` increments on each consecutive hit within 250 ms, capped at 48, reset on gap or turn end.
2. Hit blip: sine, attack 2 ms to `0.3`, decay 90 ms.
3. Add ±5 cents random detune per voice to avoid phasing on mass hits.
4. Expose `sfx.play(type, opts)` only; game code never touches nodes.
5. Respect a master mute / volume setting persisted in `localStorage` (wrapped in try/catch).

## Output Contract

- `src/audio/audioEngine.js` (context, chain, voice cap) and `src/audio/sfx.js` (recipes).
- No clipping audible with 300 hits/second at 4X speed.

## References

- `../game-loop-state-manager/SKILL.md` — turn end resets combo step.
