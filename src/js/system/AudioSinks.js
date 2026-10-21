// Rules: .claude/skills/webaudio-synthesizer/SKILL.md
// DOM-free audio seam: Null/Recording sinks, combo ladder, voice limiter, event-to-sound mapper and
// the synth fallback recipes (data only; WebAudio.js plays them). Nothing here touches Web Audio.

export const COMBO_WINDOW_MS = 250;
export const COMBO_MAX_STEP = 47;
export const MAX_VOICES = 24;
export const SAME_TYPE_GAP_MS = 15;
export const DETUNE_CENTS = 5;

const STATE_RESOLVING = 5; // STATE_ID in GameSession.js
const STATE_VICTORY = 6;
const STATE_GAME_OVER = 7;

// The interface game code sees: { unlock, play, music, setVolume, state }.
export class NullSink {
  state = 'none';
  unlock() {}
  play() {}
  music() {}
  setVolume() {}
}

// Test sink: headless contexts stay suspended, so tests assert the recorded calls instead of audio.
export class RecordingSink {
  state = 'none';
  log = [];
  unlock() {
    this.state = 'running';
    this.log.push({ call: 'unlock' });
  }
  play(type, opts = {}) {
    this.log.push({ call: 'play', type, opts });
  }
  music(on) {
    this.log.push({ call: 'music', on });
  }
  setVolume(volume) {
    this.log.push({ call: 'setVolume', volume });
  }
  audioLog() {
    return this.log.slice();
  }
}

// Consecutive hits within 250 ms rise by one; a larger gap or a turn end resets to 0.
export function createComboLadder() {
  let step = -1;
  let last = 0;
  return {
    hit(nowMs) {
      step = step < 0 || nowMs - last > COMBO_WINDOW_MS ? 0 : Math.min(step + 1, COMBO_MAX_STEP);
      last = nowMs;
      return step;
    },
    reset() {
      step = -1;
    },
  };
}

// Steps 0-11 -> b00..b11; steps >= 12 replay b11 at 33 cents per extra step.
export function comboSound(step) {
  const sample = Math.min(step, 11);
  const rate = step > 11 ? 2 ** (((step - 11) * 33) / 1200) : 1;
  return { type: `sfx_impact_std_b${String(sample).padStart(2, '0')}`, rate };
}

export const detuneCents = (rand) => (rand * 2 - 1) * DETUNE_CENTS;

// Max 24 simultaneous voices; a same-type request less than 15 ms after the last accepted one is dropped.
export function createVoiceLimiter({ max = MAX_VOICES, gapMs = SAME_TYPE_GAP_MS } = {}) {
  const ends = [];
  const lastAt = new Map();
  const prune = (nowMs) => {
    for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= nowMs) ends.splice(i, 1);
  };
  return {
    admit(type, nowMs, durationMs) {
      prune(nowMs);
      if (ends.length >= max) return false;
      if (lastAt.has(type) && nowMs - lastAt.get(type) < gapMs) return false;
      lastAt.set(type, nowMs);
      ends.push(nowMs + durationMs);
      return true;
    },
    active(nowMs) {
      prune(nowMs);
      return ends.length;
    },
  };
}

// Session events (EventRing) -> sounds. `now()` is the combo clock in ms (the adapter passes playTime).
export function createSoundMapper({ audio, now }) {
  const ladder = createComboLadder();
  const hit = () => {
    const step = ladder.hit(now());
    audio.play(...comboArgs(step));
  };
  return (type, a) => {
    switch (type) {
      case 'HIT':
        return hit();
      case 'DESTROY':
        hit();
        return audio.play('sfx_block_destroy', {});
      case 'STEEL':
        return audio.play('sfx_impact_steel', {});
      case 'ORB':
        return audio.play('sfx_orb_split', {});
      case 'FIRE':
        return audio.play('sfx_burst_launch', {});
      case 'SPEED':
        return audio.play(`sfx_speed_x${a}`, {});
      case 'PAUSE':
        return audio.play('sfx_ui_pause_in', {});
      case 'RESUME':
        return audio.play('sfx_ui_pause_out', {});
      case 'STATE':
        if (a === STATE_RESOLVING) ladder.reset();
        if (a === STATE_VICTORY) audio.play('sfx_victory', {});
        if (a === STATE_GAME_OVER) audio.play('sfx_defeat', {});
    }
  };
}

function comboArgs(step) {
  const { type, rate } = comboSound(step);
  return [type, { step, rate }];
}

// Synth fallback recipes. A layer is { kind: 'osc'|'noise', wave, f0, f1, t0, dur, lp?: [from, to], bp?: hz }.
const osc = (wave, f0, f1, t0, dur, extra) => ({ kind: 'osc', wave, f0, f1, t0, dur, ...extra });
const noise = (t0, dur, extra) => ({ kind: 'noise', t0, dur, ...extra });
const ticks = (n, hz) => Array.from({ length: n }, (_, i) => osc('square', hz, hz, (i * 0.08) / n, 0.012));
const chime = (hz) => osc('sine', hz, hz, 0, 0.3);
const IMPACT = /^sfx_impact_std_b(\d\d)$/;

const FIXED = {
  sfx_impact_steel: () => [osc('triangle', 110, 110, 0, 0.08), noise(0, 0.08, { lp: [400, 400] })],
  sfx_block_destroy: () => [noise(0, 0.12, { bp: 2200 })],
  sfx_burst_launch: () => [osc('sine', 300, 600, 0, 0.15)],
  sfx_orb_split: () => [osc('sine', 440, 440, 0, 0.15), osc('sine', 660, 660, 0, 0.15)],
  sfx_ui_click: () => [osc('square', 1000, 1000, 0, 0.03)],
  sfx_ui_confirm: () => [osc('square', 1400, 1400, 0, 0.05)],
  sfx_ui_pause_in: () => [osc('sine', 880, 440, 0, 0.15)],
  sfx_ui_pause_out: () => [osc('sine', 440, 880, 0, 0.15)],
  sfx_speed_x1: () => ticks(1, 1300),
  sfx_speed_x2: () => ticks(2, 1450),
  sfx_speed_x4: () => ticks(4, 1600),
  sfx_turns_warning: () => [osc('triangle', 660, 660, 0, 0.11), osc('triangle', 880, 880, 0.11, 0.11)],
  sfx_turns_critical: () => [
    osc('sawtooth', 622, 622, 0, 0.14, { lp: [2000, 2000] }),
    osc('sawtooth', 466, 466, 0.14, 0.14, { lp: [2000, 2000] }),
  ],
  sfx_victory: () => [
    ...[523, 659, 784].map((hz, i) => osc('sine', hz, hz, i * 0.12, 0.12)),
    ...[523, 659, 784].map((hz) => osc('sine', hz, hz, 0.36, 1.1)),
  ],
  sfx_star_1: () => [chime(1047)],
  sfx_star_2: () => [chime(1175)],
  sfx_star_3: () => [chime(1319), osc('sine', 1319 * 2 ** (7 / 1200), 1319 * 2 ** (7 / 1200), 0, 0.3)],
  sfx_defeat: () => [
    osc('triangle', 440, 440, 0, 0.3, { lp: [2000, 1300] }),
    osc('triangle', 349, 349, 0.3, 0.3, { lp: [1300, 800] }),
    osc('triangle', 294, 294, 0.6, 0.3, { lp: [800, 300] }),
  ],
};

// aim_cancel is intentionally absent (not wired in v1). Impact names are handled by pattern.
export const RECIPE_NAMES = Object.freeze(Object.keys(FIXED));

export function synthRecipe(name, opts = {}) {
  const impact = IMPACT.exec(name);
  if (impact) {
    const hz = 330 * 2 ** ((opts.step ?? Number(impact[1])) / 24);
    return { layers: [osc('sine', hz, hz, 0, 0.09)] };
  }
  return FIXED[name] ? { layers: FIXED[name]() } : null;
}
