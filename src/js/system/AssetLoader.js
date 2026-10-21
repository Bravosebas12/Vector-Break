// Rules: .claude/skills/webaudio-synthesizer/SKILL.md (decode once at boot, no realtime AudioContext)
// Boot-time loader (design D6/D10). Every asset reports done/total when it settles (ok or failed).
// Atlas and audio failures never reject (placeholders / synth fallback); a level that fails fetch or
// validation rejects, so the session never reaches Title.
import { validateLevel } from './LevelValidator.js';

const DECODE_RATE = 48000;

// One offline context decodes every sample: it is not a realtime context and is not gated by autoplay.
let offline = null;
const defaultIo = {
  fetchJson: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  },
  fetchBytes: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.arrayBuffer();
  },
  decode: (bytes) => (offline ??= new OfflineAudioContext(2, 1, DECODE_RATE)).decodeAudioData(bytes),
};

// spec: { atlas?: () => Promise, levels: url[], samples: [{name, url}], music?: {name, url} }
// -> Promise<{ atlas, levels, buffers: {name: AudioBuffer}, failed: name[] }>
async function load(spec, onSettle = () => {}, io = {}) {
  const { fetchJson, fetchBytes, decode } = { ...defaultIo, ...io };
  const audio = [...spec.samples, ...(spec.music ? [spec.music] : [])];
  const total = (spec.atlas ? 1 : 0) + spec.levels.length + audio.length;
  let done = 0;
  const settle = (value) => {
    onSettle(++done, total);
    return value;
  };
  const buffers = {};
  const failed = [];

  const atlas = spec.atlas ? spec.atlas().catch(() => null).then(settle) : null;
  const levels = spec.levels.map(async (url) => {
    const level = await fetchJson(url);
    const { valid, errors } = validateLevel(level);
    if (!valid) throw new Error(`level ${url} is invalid: ${errors.map((e) => e.message).join('; ')}`);
    return settle(level);
  });
  const sounds = audio.map(async ({ name, url }) => {
    try {
      buffers[name] = await decode(await fetchBytes(url));
    } catch {
      failed.push(name);
    }
    settle();
  });

  const [loadedAtlas, loadedLevels] = await Promise.all([atlas, Promise.all(levels), Promise.all(sounds)]);
  return { atlas: loadedAtlas, levels: loadedLevels, buffers, failed };
}

export const AssetLoader = { load };
