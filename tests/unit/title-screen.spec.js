// TitleScreen: openspec start-screen delta (anglecraft-v1-visual-fidelity): Key Art background, two-color
// wordmark centered at x 960, tagline, 480x2 progress bar, pulsing prompt, no board or HUD.
import { test, expect } from '@playwright/test';
import { titleModel, drawTitle } from '../../src/js/system/TitleScreen.js';
import { strings } from '../../src/js/system/strings.js';
import { COLORS } from '../../src/js/system/Theme.js';

const loading = (done, total) => ({ state: 'Loading', loading: { done, total } });
const title = { state: 'Title', loading: { done: 30, total: 30 } };

// Records draw calls with the alignment, alpha, fill and font in force; measureText = 10 px per char.
function fakeCtx() {
  const calls = [];
  const ctx = { textAlign: 'start', globalAlpha: 1, fillStyle: '', font: '' };
  for (const name of ['fillText', 'fillRect', 'drawImage', 'save', 'restore'])
    ctx[name] = (...args) => calls.push({ name, args, align: ctx.textAlign, alpha: ctx.globalAlpha, fill: ctx.fillStyle, font: ctx.font });
  ctx.measureText = (t) => ({ width: t.length * 10 });
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  return { ctx, calls };
}
const texts = (calls) => calls.filter((c) => c.name === 'fillText');

test('wordmark Angle + Craft is centered at x 960 in Loading and in Title, with the tagline below', () => {
  for (const snap of [loading(0, 30), title]) {
    const m = titleModel(snap, 0);
    expect(m.title).toMatchObject({ text: strings.title, first: 'Angle', second: 'Craft', x: 960, y: 800 });
    expect(m.tagline).toEqual({ text: strings.tagline, x: 960, y: 870 });
  }
});

test('loading shows a centered 480x2 bar filled by settled/total and the percentage', () => {
  const m = titleModel(loading(12, 30), 0);
  expect(m.bar).toMatchObject({ x: 720, w: 480, h: 2, fill: 192 }); // 40%
  expect(m.bar.y).toBeGreaterThan(870);
  expect(m.label).toBe(strings.loading.replace('{pct}', 40));
  expect(m.prompt).toBeNull();
  expect(titleModel(loading(1, 3), 0).label).toContain('33%');
  expect(titleModel(loading(0, 0), 0).bar.fill).toBe(0); // nothing counted yet
});

test('Title replaces the progress with the prompt, pulsing between 0.5 and 1 every second', () => {
  const m = titleModel(title, 0);
  expect(m.bar).toBeNull();
  expect(m.prompt.text).toBe(strings.clickToStart);
  const alphas = [0, 125, 250, 375, 500, 625, 750, 875].map((t) => titleModel(title, t).prompt.alpha);
  expect(Math.min(...alphas)).toBeCloseTo(0.5, 5);
  expect(Math.max(...alphas)).toBeCloseTo(1, 5);
  expect(titleModel(title, 1000).prompt.alpha).toBeCloseTo(titleModel(title, 0).prompt.alpha, 5);
});

test('a level load error shows loadError instead of the bar and never the prompt', () => {
  const m = titleModel(loading(2, 30), 0, true);
  expect(m.error).toBe(strings.loadError);
  expect(m.bar).toBeNull();
  expect(m.prompt).toBeNull();
});

test('drawTitle paints the Key Art full stage, then a dark band, then the two-color wordmark centered on 960', () => {
  const { ctx, calls } = fakeCtx();
  const art = { width: 3840, height: 2160 };
  drawTitle(ctx, titleModel(loading(15, 30), 0), art);
  expect(calls.find((c) => c.name === 'drawImage').args).toEqual([art, 0, 0, 1920, 1080]);
  expect(calls.findIndex((c) => c.name === 'drawImage')).toBeLessThan(calls.findIndex((c) => c.name === 'fillRect'));
  const [angle, craft] = texts(calls);
  expect([angle.args[0], craft.args[0]]).toEqual(['Angle', 'Craft']);
  expect([angle.fill, craft.fill]).toEqual([COLORS.textStrong, COLORS.cyan]);
  expect(angle.font).toMatch(/^800 \d+px "JetBrains Mono"/);
  expect([angle.args[1], craft.args[1]]).toEqual([910, 960]); // 100 px wide, left-aligned from 960 - 50
  expect(texts(calls).map((t) => t.args[0])).toEqual(['Angle', 'Craft', strings.tagline, strings.loading.replace('{pct}', 50)]);
  const bars = calls.filter((c) => c.name === 'fillRect' && c.args[3] === 2).map((c) => c.args);
  expect(bars).toEqual([[720, bars[0][1], 480, 2], [720, bars[0][1], 240, 2]]);
});

test('without Key Art nothing is drawn behind the text (the CSS stage shows through)', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(title, 0), null);
  expect(calls.filter((c) => c.name === 'drawImage')).toEqual([]);
  expect(texts(calls).map((t) => t.args[0])).toContain(strings.clickToStart);
});

test('drawTitle draws the prompt with the pulse alpha, centered, and restores the context', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(title, 250), null);
  const prompt = texts(calls).find((c) => c.args[0] === strings.clickToStart);
  expect(prompt.alpha).toBeCloseTo(1, 5);
  expect(prompt.align).toBe('center');
  expect(calls.filter((c) => c.name === 'save').length).toBe(calls.filter((c) => c.name === 'restore').length);
});

test('drawTitle draws the error text for a failed load', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(loading(0, 30), 0, true), null);
  expect(texts(calls).map((c) => c.args[0])).toEqual(['Angle', 'Craft', strings.tagline, strings.loadError]);
});

test('TitleScreen.js has no hex color literals', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../src/js/system/TitleScreen.js', import.meta.url), 'utf8');
  expect(src.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
});
