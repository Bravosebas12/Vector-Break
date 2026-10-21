// openspec visual-theme spec (fonts, logical stage) and test-harness "Single-frame render hook".
import { test, expect } from '@playwright/test';

const state = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot().state);
const ready = async (page, url = '/?test=1') => {
  await page.goto(url);
  await expect.poll(() => state(page)).toBe('Title');
};
const rect = (page, sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);

test('fonts are self-hosted: both woff2 files load from /assets/fonts/ and nothing goes to another origin', async ({ page, baseURL }) => {
  const urls = [];
  page.on('request', (r) => urls.push(r.url()));
  await ready(page);
  expect(urls.filter((u) => !u.startsWith(baseURL))).toEqual([]);
  const fonts = urls.filter((u) => u.endsWith('.woff2')).map((u) => new URL(u).pathname).sort();
  expect(fonts).toEqual(['/assets/fonts/ibm-plex-sans-latin.woff2', '/assets/fonts/jetbrains-mono-latin.woff2']);
  const loaded = await page.evaluate(() => [
    document.fonts.check('400 16px "IBM Plex Sans"'),
    document.fonts.check('700 20px "JetBrains Mono"'),
  ]);
  expect(loaded).toEqual([true, true]);
});

test('a missing font file still reaches Title and a click starts the game', async ({ page }) => {
  await page.route('**/assets/fonts/jetbrains-mono-latin.woff2', (route) => route.fulfill({ status: 404, body: '' }));
  await ready(page);
  await page.mouse.click(960, 540);
  await expect.poll(() => state(page)).toBe('Aiming');
});

test('the 1920x1080 stage is scaled to fit and centered; canvas and stage stay aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  const s = 1280 / 1920; // min(1280/1920, 900/1080)
  const stage = await rect(page, '#stage');
  expect(stage.width).toBeCloseTo(1920 * s, 0);
  expect(stage.height).toBeCloseTo(1080 * s, 0);
  expect(stage.left).toBeCloseTo(0, 0);
  expect(stage.top).toBeCloseTo((900 - 1080 * s) / 2, 0);
  const canvas = await rect(page, '#game');
  for (const k of ['left', 'top', 'width', 'height']) expect(Math.abs(canvas[k] - stage[k])).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect.poll(async () => (await rect(page, '#stage')).width).toBeCloseTo(1000, 0);
  await page.evaluate(() => {
    window.__ANGLECRAFT__.loadLevel(0);
    window.__ANGLECRAFT__.render(0); // the HUD layer is shown in a level
  });
  const hud = await rect(page, '#hud');
  const moved = await rect(page, '#stage');
  for (const k of ['left', 'top', 'width', 'height']) expect(Math.abs(hud[k] - moved[k])).toBeLessThanOrEqual(1);
});

test('the stage background is the mockup color and the canvas is transparent outside the board', async ({ page }) => {
  await ready(page);
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById('stage')).backgroundColor);
  expect(bg).toBe('rgb(14, 17, 23)');
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
  await page.evaluate(() => window.__ANGLECRAFT__.render(0));
  const alpha = await page.evaluate(() => {
    const c = document.getElementById('game');
    return c.getContext('2d').getImageData(Math.round(c.width * 0.005), Math.round(c.height * 0.5), 1, 1).data[3];
  });
  expect(alpha).toBe(0);
});

test('render(t) draws exactly one frame per call and the loop stays stopped', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
  const frames = () => page.evaluate(() => window.__ANGLECRAFT_RENDER__.frames);
  const before = await frames();
  await page.evaluate(() => {
    window.__ANGLECRAFT__.render(0);
    window.__ANGLECRAFT__.render(16);
  });
  expect(await frames()).toBe(before + 2);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await frames()).toBe(before + 2);
});
