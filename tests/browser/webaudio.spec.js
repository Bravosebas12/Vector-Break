// WebAudio: openspec audio spec "Gesture unlock", "Fixed chain", "Music loop", "Fallback", "Volume persistence".
// Headless contexts may stay suspended, so assertions read node parameters and the adapter's own counters,
// never audio timing. Each test gets a fresh browser context, so localStorage starts empty.
import { test, expect } from '@playwright/test';

const run = async (page, body, arg) => {
  await page.goto('/tests/blank.html');
  return page.evaluate(
    async ({ body, arg }) => {
      const { createWebAudio } = await import('/src/js/system/WebAudio.js');
      const created = [];
      class SpyContext extends AudioContext {
        constructor(options) {
          super(options);
          created.push(options);
        }
      }
      const make = (extra = {}) => createWebAudio({ AudioContextCtor: SpyContext, ...extra });
      return new Function('env', 'arg', `with (env) { return (async () => { ${body} })() }`)({ make, created }, arg);
    },
    { body, arg },
  );
};
const MUSIC = 'music_loop_95bpm_64bars';

test('no realtime context exists until unlock(); unlock creates exactly one at 48 kHz', async ({ page }) => {
  const out = await run(
    page,
    `const a = make();
     a.play('sfx_ui_click', {});
     a.music(true);
     const before = [created.length, a.state];
     a.unlock();
     a.unlock();
     return [before, created, a.state !== 'none'];`,
  );
  expect(out).toEqual([[0, 'none'], [{ sampleRate: 48000 }], true]);
});

test('the fixed chain routes buses -> compressor -> limiter -> destination with the spec parameters', async ({ page }) => {
  const c = await run(
    page,
    `const a = make();
     a.unlock();
     const k = a.chain.compressor;
     return { threshold: k.threshold.value, knee: k.knee.value, ratio: k.ratio.value, attack: k.attack.value,
       release: k.release.value, limiter: a.chain.limiterGain.gain.value, buses: Object.keys(a.chain).sort() };`,
  );
  expect(c.threshold).toBe(-24);
  expect(c.knee).toBe(12);
  expect(c.ratio).toBe(12);
  expect(c.attack).toBeCloseTo(0.003, 5);
  expect(c.release).toBeCloseTo(0.15, 5);
  expect(c.limiter).toBeCloseTo(0.8, 5);
  expect(c.buses).toEqual(['compressor', 'limiterGain', 'musicBus', 'sfxBus']);
});

test('music loops gaplessly over 0..161.684 s and stops on music(false)', async ({ page }) => {
  const out = await run(
    page,
    `const a = make();
     a.unlock();
     a.setBuffers({ ${MUSIC}: a.ctx.createBuffer(1, 48000, 48000) });
     a.music(true);
     const s = a.musicSource;
     const on = [s.loop, s.loopStart, s.loopEnd];
     a.music(false);
     return [on, a.musicSource];`,
  );
  expect(out).toEqual([[true, 0, 161.684], null]);
});

test('a missing or failed sample plays its synth recipe, a decoded one plays the sample, nothing throws', async ({ page }) => {
  const out = await run(
    page,
    `const a = make();
     a.unlock();
     a.setBuffers({ sfx_orb_split: a.ctx.createBuffer(1, 4800, 48000) });
     a.play('sfx_block_destroy', {});
     a.play('sfx_orb_split', {});
     a.play('sfx_victory', {});
     a.play('sfx_unknown', {});
     a.markFailed('sfx_orb_split');
     await new Promise((r) => setTimeout(r, 20));
     a.play('sfx_orb_split', {});
     return { ...a.stats };`,
  );
  expect(out).toEqual({ sample: 1, synth: 3, dropped: 0, ignored: 1 });
});

test('the voice limiter and same-type window apply to real voices', async ({ page }) => {
  const out = await run(
    page,
    `const a = make();
     a.unlock();
     for (let i = 0; i < 30; i++) a.play('sfx_victory', { id: i });
     for (let i = 0; i < 30; i++) a.play('sfx_impact_std_b' + String(i % 12).padStart(2, '0'), {});
     return { ...a.stats };`,
  );
  expect(out.synth + out.sample).toBeLessThanOrEqual(24);
  expect(out.dropped).toBeGreaterThan(0);
});

test('volume persists in localStorage, is restored on unlock and survives a throwing storage', async ({ page }) => {
  const out = await run(
    page,
    `const a = make();
     a.unlock();
     a.setVolume(0.4);
     const stored = JSON.parse(localStorage.getItem('anglecraft.v1.audio'));
     const b = make();
     b.unlock();
     const boom = () => { throw new Error('denied'); };
     const c = make({ storage: { getItem: boom, setItem: boom } });
     c.unlock();
     c.setVolume(0.2);
     return [stored, b.volume, a.chain.sfxBus.gain.value.toFixed(2), c.volume];`,
  );
  expect(out).toEqual([{ volume: 0.4 }, 0.4, '0.40', 0.2]);
});

test('the renderer drains the ring once and fans events out to an extra consumer', async ({ page }) => {
  await page.goto('/tests/blank.html');
  const out = await page.evaluate(async () => {
    const { createSession } = await import('/src/js/system/GameSession.js');
    const { createRenderer } = await import('/src/js/system/Renderer.js');
    const { Particles } = await import('/src/js/system/Particles.js');
    const { Rng } = await import('/src/js/system/Rng.js');
    const level = await (await fetch('/src/levels/level1.json')).json();
    const ctx = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }).getContext('2d');
    const session = createSession({ rng: new Rng(1) });
    session.setLevels([level]);
    session.setLoadProgress(1, 1);
    session.dispatch({ type: 'FIRE', pointer: true });
    session.drainEvents(() => {});
    const seen = [];
    const renderer = createRenderer({ session, ctx, particles: new Particles(), onEvent: (type) => seen.push(type) });
    session.events.push('ORB', 3);
    session.events.push('FIRE', 1);
    renderer.draw(0, 0);
    renderer.draw(0, 16);
    return [seen, session.events.length];
  });
  expect(out).toEqual([['ORB', 'FIRE'], 0]);
});
