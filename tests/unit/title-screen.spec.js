// TitleScreen: openspec start-screen spec (Centered title, Blocking loading, Ready prompt) and
// design HU-09 render: title at (960, 470), 600x12 bar, pulsing prompt, no board or HUD.
import { test, expect } from '@playwright/test';
import { titleModel, drawTitle } from '../../src/js/system/TitleScreen.js';
import { strings } from '../../src/js/system/strings.js';

const loading = (done, total) => ({ state: 'Loading', loading: { done, total } });
const title = { state: 'Title', loading: { done: 30, total: 30 } };

// Records the draw calls and the text alignment/alpha in force when each call happened.
function fakeCtx() {
  const calls = [];
  const ctx = { textAlign: 'start', globalAlpha: 1, fillStyle: '' };
  for (const name of ['fillText', 'fillRect', 'save', 'restore'])
    ctx[name] = (...args) => calls.push({ name, args, align: ctx.textAlign, alpha: ctx.globalAlpha });
  return { ctx, calls };
}

test('title is centered at (960, 470) in Loading and in Title', () => {
  for (const snap of [loading(0, 30), title]) {
    const { title: t } = titleModel(snap, 0);
    expect(t).toMatchObject({ text: strings.title, x: 960, y: 470, align: 'center' });
  }
});

test('loading shows a 600x12 bar filled by settled/total and the percentage', () => {
  const m = titleModel(loading(12, 30), 0);
  expect(m.bar).toMatchObject({ w: 600, h: 12, fill: 240 }); // 40%
  expect(m.label).toBe(strings.loading.replace('{pct}', 40));
  expect(m.prompt).toBeNull();
  expect(titleModel(loading(1, 3), 0).label).toContain('33%');
  expect(titleModel(loading(0, 0), 0).bar.fill).toBe(0); // nothing counted yet
});

test('the bar is centered horizontally below the title', () => {
  const { bar } = titleModel(loading(0, 30), 0);
  expect(bar.x + bar.w / 2).toBe(960);
  expect(bar.y).toBeGreaterThan(470);
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

test('drawTitle draws the centered title, the bar and the label, and nothing else', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(loading(15, 30), 0));
  const texts = calls.filter((c) => c.name === 'fillText');
  expect(texts[0].args).toEqual([strings.title, 960, 470]);
  expect(texts[0].align).toBe('center');
  expect(texts.map((t) => t.args[0])).toEqual([strings.title, strings.loading.replace('{pct}', 50)]);
  const rects = calls.filter((c) => c.name === 'fillRect').map((c) => c.args);
  expect(rects).toEqual([[660, 540, 600, 12], [660, 540, 300, 12]]);
});

test('drawTitle draws the prompt with the pulse alpha and restores the context', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(title, 250));
  const prompt = calls.find((c) => c.name === 'fillText' && c.args[0] === strings.clickToStart);
  expect(prompt.alpha).toBeCloseTo(1, 5);
  expect(prompt.align).toBe('center');
  expect(calls.filter((c) => c.name === 'fillRect')).toEqual([]);
  expect(calls.filter((c) => c.name === 'save').length).toBe(calls.filter((c) => c.name === 'restore').length);
});

test('drawTitle draws the error text for a failed load', () => {
  const { ctx, calls } = fakeCtx();
  drawTitle(ctx, titleModel(loading(0, 30), 0, true));
  expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toEqual([strings.title, strings.loadError]);
});
