// Rules: .claude/skills/webaudio-synthesizer/SKILL.md
// Realtime Web Audio adapter behind the audio seam { unlock, play, music, setVolume, state }.
// Chain: voices -> sfxBus | musicBus -> compressor -> limiterGain -> destination. The realtime context
// is created only by unlock() (the Title click); samples arrive already decoded through setBuffers().
import { createVoiceLimiter, detuneCents, synthRecipe } from './AudioSinks.js';

const SAMPLE_RATE = 48000;
const STORAGE_KEY = 'anglecraft.v1.audio';
const MUSIC_NAME = 'music_loop_95bpm_64bars';
const MUSIC_LOOP_END = 161.684; // 64 bars at 95 BPM
const VOICE_GAIN = 0.3;
const SILENCE = 0.001; // -60 dB: exponential decay target

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access itself can throw (SecurityError)
  }
}

export function createWebAudio({
  storage = defaultStorage(),
  AudioContextCtor = globalThis.AudioContext,
  rand = Math.random,
  nowMs = () => performance.now(),
} = {}) {
  const buffers = new Map();
  const failed = new Set();
  const limiter = createVoiceLimiter();
  const stats = { sample: 0, synth: 0, dropped: 0, ignored: 0 };
  let noiseBuffer = null;

  const self = {
    ctx: null,
    chain: null,
    musicSource: null,
    volume: 1,
    stats,

    get state() {
      return self.ctx ? self.ctx.state : 'none';
    },

    setBuffers(map) {
      for (const [name, buffer] of Object.entries(map)) buffers.set(name, buffer);
    },

    markFailed(name) {
      failed.add(name);
    },

    unlock() {
      if (self.ctx) return;
      try {
        const ctx = new AudioContextCtor({ sampleRate: SAMPLE_RATE });
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 12;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;
        const limiterGain = ctx.createGain();
        limiterGain.gain.value = 0.8;
        const sfxBus = ctx.createGain();
        const musicBus = ctx.createGain();
        sfxBus.connect(compressor);
        musicBus.connect(compressor);
        compressor.connect(limiterGain);
        limiterGain.connect(ctx.destination);
        self.ctx = ctx;
        self.chain = { sfxBus, musicBus, compressor, limiterGain };
        self.setVolume(readVolume(storage) ?? self.volume);
        ctx.resume?.().catch(() => {});
      } catch {
        self.ctx = null; // audio is optional: the game keeps running silently
      }
    },

    setVolume(v) {
      self.volume = Math.min(1, Math.max(0, Number(v) || 0));
      if (self.chain) self.chain.sfxBus.gain.value = self.chain.musicBus.gain.value = self.volume;
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify({ volume: self.volume }));
      } catch {
        // storage unavailable: volume stays in memory
      }
    },

    music(on) {
      if (!self.ctx) return;
      try {
        self.musicSource?.stop();
        self.musicSource = null;
        const buffer = buffers.get(MUSIC_NAME);
        if (!on || !buffer || failed.has(MUSIC_NAME)) return;
        const source = self.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = MUSIC_LOOP_END;
        source.connect(self.chain.musicBus);
        source.start();
        self.musicSource = source;
      } catch {
        self.musicSource = null;
      }
    },

    play(type, opts = {}) {
      if (!self.ctx) return;
      try {
        const buffer = failed.has(type) ? null : buffers.get(type);
        const recipe = buffer ? null : synthRecipe(type, opts);
        if (!buffer && !recipe) return void stats.ignored++;
        const rate = opts.rate ?? 1;
        const ms = buffer
          ? (buffer.duration / rate) * 1000
          : Math.max(...recipe.layers.map((l) => l.t0 + l.dur)) * 1000;
        if (!limiter.admit(type, nowMs(), ms)) return void stats.dropped++;
        if (buffer) {
          stats.sample++;
          playSample(self.ctx, self.chain.sfxBus, buffer, rate, rand);
        } else {
          stats.synth++;
          noiseBuffer ??= makeNoise(self.ctx);
          for (const layer of recipe.layers) playLayer(self.ctx, self.chain.sfxBus, layer, noiseBuffer);
        }
      } catch {
        // a failing voice must never block play
      }
    },
  };
  return self;
}

function readVolume(storage) {
  try {
    const stored = JSON.parse(storage?.getItem(STORAGE_KEY));
    return typeof stored?.volume === 'number' ? stored.volume : null;
  } catch {
    return null;
  }
}

// One AudioBufferSourceNode + one GainNode per voice; started sources are never reused.
function playSample(ctx, bus, buffer, rate, rand) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  source.detune.value = detuneCents(rand());
  const gain = ctx.createGain();
  source.connect(gain).connect(bus);
  source.start();
}

function makeNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Synth layer: oscillator or noise -> optional lowpass/bandpass -> exponential decay to -60 dB -> bus.
function playLayer(ctx, bus, layer, noiseBuffer) {
  const t0 = ctx.currentTime + layer.t0;
  const t1 = t0 + layer.dur;
  let source;
  if (layer.kind === 'noise') {
    source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
  } else {
    source = ctx.createOscillator();
    source.type = layer.wave;
    source.frequency.setValueAtTime(layer.f0, t0);
    if (layer.f1 !== layer.f0) source.frequency.exponentialRampToValueAtTime(layer.f1, t1);
  }
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(VOICE_GAIN, t0);
  gain.gain.exponentialRampToValueAtTime(SILENCE, t1);
  let node = source;
  if (layer.lp || layer.bp) {
    const filter = ctx.createBiquadFilter();
    filter.type = layer.lp ? 'lowpass' : 'bandpass';
    const [from, to] = layer.lp ?? [layer.bp, layer.bp];
    filter.frequency.setValueAtTime(from, t0);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t1);
    node = node.connect(filter);
  }
  node.connect(gain).connect(bus);
  source.start(t0);
  source.stop(t1);
}
