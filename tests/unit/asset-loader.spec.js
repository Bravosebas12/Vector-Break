// AssetLoader: openspec start-screen spec (Blocking loading with progress, Failed audio asset).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { AssetLoader } from '../../src/js/system/AssetLoader.js';

const level = JSON.parse(readFileSync(new URL('../../src/levels/level1.json', import.meta.url), 'utf8'));
const spec = {
  atlas: async () => ({ sheet: true }),
  levels: ['l1.json', 'l2.json'],
  samples: [
    { name: 'sfx_a', url: 'a.wav' },
    { name: 'sfx_b', url: 'b.wav' },
  ],
  music: { name: 'music', url: 'm.wav' },
};
const okIo = (over = {}) => ({
  fetchJson: async () => level,
  fetchBytes: async (url) => url,
  decode: async (bytes) => ({ decoded: bytes }),
  ...over,
});
const collect = () => {
  const calls = [];
  return { calls, onSettle: (done, total) => calls.push([done, total]) };
};

test('every asset settles once and reports done/total', async () => {
  const { calls, onSettle } = collect();
  const out = await AssetLoader.load(spec, onSettle, okIo());
  expect(calls.length).toBe(6);
  expect(calls.map(([d]) => d).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  expect(new Set(calls.map(([, t]) => t))).toEqual(new Set([6]));
  expect(out.atlas).toEqual({ sheet: true });
  expect(out.levels).toEqual([level, level]);
  expect(out.buffers).toEqual({
    sfx_a: { decoded: 'a.wav' },
    sfx_b: { decoded: 'b.wav' },
    music: { decoded: 'm.wav' },
  });
  expect(out.failed).toEqual([]);
});

test('progress is counted per settle, not per group', async () => {
  const gates = {};
  const wait = (url) => new Promise((resolve) => (gates[url] = resolve));
  const { calls, onSettle } = collect();
  const run = AssetLoader.load({ ...spec, atlas: null, music: null }, onSettle, okIo({ fetchBytes: (url) => wait(url).then(() => url) }));
  await new Promise((r) => setTimeout(r, 0));
  expect(calls).toEqual([[1, 4], [2, 4]]); // the two levels; samples still pending
  gates['a.wav']();
  await new Promise((r) => setTimeout(r, 0));
  expect(calls.at(-1)).toEqual([3, 4]);
  gates['b.wav']();
  await run;
  expect(calls.at(-1)).toEqual([4, 4]);
});

test('a failed fetch or decode settles, lands in failed[] and does not reject', async () => {
  const { calls, onSettle } = collect();
  const io = okIo({
    fetchBytes: async (url) => {
      if (url === 'a.wav') throw new Error('404');
      return url;
    },
    decode: async (bytes) => {
      if (bytes === 'm.wav') throw new Error('bad data');
      return { decoded: bytes };
    },
  });
  const out = await AssetLoader.load(spec, onSettle, io);
  expect(out.failed.sort()).toEqual(['music', 'sfx_a']);
  expect(Object.keys(out.buffers)).toEqual(['sfx_b']);
  expect(calls.at(-1)).toEqual([6, 6]);
});

test('a failed atlas settles as null and does not reject', async () => {
  const out = await AssetLoader.load({ ...spec, atlas: async () => Promise.reject(new Error('x')) }, () => {}, okIo());
  expect(out.atlas).toBeNull();
});

test('a level that fails fetch rejects and the total is never reached', async () => {
  const { calls, onSettle } = collect();
  const io = okIo({
    fetchJson: async (url) => {
      if (url === 'l2.json') throw new Error('404');
      return level;
    },
  });
  await expect(AssetLoader.load(spec, onSettle, io)).rejects.toThrow('404');
  await new Promise((r) => setTimeout(r, 0));
  expect(calls.every(([d, t]) => d < t)).toBe(true);
});

test('a level that fails validation rejects with the validation reason', async () => {
  const io = okIo({ fetchJson: async () => ({ id: 'bad' }) });
  await expect(AssetLoader.load(spec, () => {}, io)).rejects.toThrow(/level l1.json is invalid/);
});

// visual-theme spec "Self-hosted fonts": fonts count as one asset and never block loading.
test('fonts settle as one asset and a failure does not reject', async () => {
  const { calls, onSettle } = collect();
  const ok = await AssetLoader.load({ ...spec, fonts: async () => true }, onSettle, okIo());
  expect(calls.at(-1)).toEqual([7, 7]);
  expect(ok.fonts).toBe(true);
  const failed = await AssetLoader.load({ ...spec, fonts: () => Promise.reject(new Error('404')) }, () => {}, okIo());
  expect(failed.fonts).toBe(false);
});
