// Start screen and real DOM input through the boot path: openspec start-screen spec + game-state input rules.
// ?test=1 uses the RecordingSink (audioLog); &audio=1 loads real samples with the real WebAudio adapter, which
// is also recorded. Headless AudioContexts may stay suspended, so audio is asserted through the log and stats.
// Each test runs in a fresh browser context (clean storage); no timing assertions.
import { test, expect } from '@playwright/test';

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot());
const state = async (page) => (await snap(page)).state;
const toTitle = (page) => page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'Title');
const plays = (page, type) =>
  page.evaluate((t) => window.__ANGLECRAFT__.audioLog().filter((c) => c.call === 'play' && c.type === t).length, type);
const spyTexts = (page) =>
  page.addInitScript(() => {
    window.__TEXTS__ = new Set();
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) {
      window.__TEXTS__.add(String(t));
      return fill.call(this, t, ...rest);
    };
  });
const drawn = (page, text) => page.waitForFunction((t) => window.__TEXTS__.has(t), text);
// Board point (x, y) -> client pixels (viewport 1280x720: logical = client * 1.5, board origin (420, 40)).
const client = ({ x, y }) => ({ x: (x + 420) / 1.5, y: (y + 40) / 1.5 });
const CENTER = { x: 640, y: 360 };
const holdLevels = async (page, pattern = '**/src/levels/*.json') => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route(pattern, async (route) => {
    await held;
    await route.continue();
  });
  return release;
};
const shootUp = (page) =>
  page.evaluate(() => {
    window.__ANGLECRAFT__.setVolley(50);
    window.__ANGLECRAFT__.fire(1.2);
  });
const stepUntil = (page, read) =>
  expect
    .poll(async () => {
      await page.evaluate(() => window.__ANGLECRAFT__.step(600));
      return page.evaluate(read);
    })
    .toBeGreaterThan(0);

test('input is ignored during Loading, never queued, and no audio context exists', async ({ page }) => {
  const release = await holdLevels(page);
  await page.goto('/?test=1');
  await page.mouse.click(CENTER.x, CENTER.y);
  await page.mouse.click(CENTER.x, CENTER.y, { button: 'right' });
  for (const key of ['Space', 'r', 'p', '1', '4', 'Enter']) await page.keyboard.press(key);
  expect(await state(page)).toBe('Loading');
  expect(await page.evaluate(() => window.__ANGLECRAFT_AUDIO__.state)).toBe('none');
  release();
  await toTitle(page);
  expect(await state(page)).toBe('Title'); // the click made during Loading is not replayed
});

test('keys, right click and move on Title are ignored; no audio is unlocked', async ({ page }) => {
  await page.goto('/?test=1');
  await toTitle(page);
  await page.mouse.move(100, 100);
  for (const key of ['Space', 'r', 'p', '1', 'Enter', 'Escape']) await page.keyboard.press(key);
  await page.mouse.click(CENTER.x, CENTER.y, { button: 'right' });
  expect(await state(page)).toBe('Title');
  expect(await page.evaluate(() => window.__ANGLECRAFT__.audioLog())).toEqual([]);
});

test('left click on Title unlocks audio, starts music and enters Aiming on level 1', async ({ page }) => {
  await page.goto('/?test=1');
  await toTitle(page);
  await page.mouse.click(CENTER.x, CENTER.y);
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 0 } });
  const log = await page.evaluate(() => window.__ANGLECRAFT__.audioLog());
  expect(log.slice(0, 2)).toEqual([{ call: 'unlock' }, { call: 'music', on: true }]);
});

test('mouse move aims, left click fires, Space fires, Esc and right click are inert', async ({ page }) => {
  await page.goto('/?test=1');
  await toTitle(page);
  await page.mouse.click(CENTER.x, CENTER.y);
  const { launcherX } = await snap(page);
  const up = client({ x: launcherX, y: 100 });
  await page.mouse.move(up.x, up.y);
  expect((await snap(page)).aim.x).toBeCloseTo(0, 5);
  const right = client({ x: launcherX + 300, y: 100 });
  await page.mouse.move(right.x, right.y);
  expect((await snap(page)).aim.x).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(right.x, right.y, { button: 'right' });
  expect(await snap(page)).toMatchObject({ state: 'Aiming', shots: { used: 0 } });
  const menuPrevented = await page.evaluate(
    () => !document.getElementById('game').dispatchEvent(new MouseEvent('contextmenu', { cancelable: true, bubbles: true })),
  );
  expect(menuPrevented).toBe(true);
  await page.mouse.click(right.x, right.y);
  expect(await snap(page)).toMatchObject({ state: 'Firing', volley: { emitted: 1 } });
});

test('Space fires and is default-prevented', async ({ page }) => {
  await page.goto('/?test=1');
  await toTitle(page);
  await page.mouse.click(CENTER.x, CENTER.y);
  const { launcherX } = await snap(page);
  const up = client({ x: launcherX, y: 100 });
  await page.mouse.move(up.x, up.y);
  const prevented = await page.evaluate(() => !window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true })));
  expect(prevented).toBe(true);
  expect(await snap(page)).toMatchObject({ state: 'Firing', volley: { emitted: 1 } });
});

test('hiding the page auto-pauses a playing state and showing it never resumes', async ({ page }) => {
  await page.goto('/?test=1');
  await toTitle(page);
  const visibility = (hidden) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await visibility(true);
  expect((await snap(page)).paused).toBe(false); // Title: nothing to pause
  await page.mouse.click(CENTER.x, CENTER.y);
  await visibility(true);
  expect((await snap(page)).paused).toBe(true);
  await visibility(true); // already paused: never toggles back
  expect((await snap(page)).paused).toBe(true);
  await visibility(false);
  expect((await snap(page)).paused).toBe(true);
});

test('hook step drains events once: one launch sound per FIRE, with or without the loop', async ({ page }) => {
  for (const query of ['/?test=1', '/?test=1&loop=1']) {
    await page.goto(query);
    await toTitle(page);
    await page.evaluate(() => {
      window.__ANGLECRAFT__.start();
      window.__ANGLECRAFT__.fire(Math.PI / 2);
    });
    await expect
      .poll(async () => {
        await page.evaluate(() => window.__ANGLECRAFT__.step(2));
        return plays(page, 'sfx_burst_launch');
      })
      .toBe(1);
    await page.evaluate(() => window.__ANGLECRAFT__.step(5));
    expect(await plays(page, 'sfx_burst_launch')).toBe(1);
  }
});

test('the real loop draws the title, the loading label and then the prompt', async ({ page }) => {
  await spyTexts(page);
  const release = await holdLevels(page, '**/src/levels/level3.json');
  await page.goto('/?test=1&loop=1');
  await drawn(page, 'Angle'); // wordmark: 'Angle' + 'Craft' in two colors
  await page.waitForFunction(() => [...window.__TEXTS__].some((t) => t.startsWith('Cargando...')));
  expect(await page.evaluate(() => window.__TEXTS__.has('Haz clic para comenzar'))).toBe(false);
  release();
  await drawn(page, 'Haz clic para comenzar');
  expect(await page.evaluate(() => window.__TEXTS__.has('TELEMETRÍA'))).toBe(false); // no HUD on the start screen
});

test('a level that fails to load keeps Loading and shows loadError', async ({ page }) => {
  await spyTexts(page);
  await page.route('**/src/levels/level2.json', (route) => route.fulfill({ status: 404 }));
  await page.goto('/?test=1&loop=1');
  await drawn(page, 'No se pudieron cargar los niveles');
  expect(await state(page)).toBe('Loading');
  expect(await page.evaluate(() => window.__TEXTS__.has('Haz clic para comenzar'))).toBe(false);
});

test('audio=1: a 404 sample and music still reach Title; the click unlocks; a destroyed block uses the synth fallback', async ({ page }) => {
  await page.route('**/assets/audio/sfx_block_destroy.wav', (route) => route.fulfill({ status: 404 }));
  await page.route('**/assets/audio/music_loop*', (route) => route.fulfill({ status: 404 }));
  await page.goto('/?test=1&audio=1');
  await toTitle(page);
  expect(await page.evaluate(() => window.__ANGLECRAFT_AUDIO__.state)).toBe('none');
  await page.mouse.click(CENTER.x, CENTER.y);
  expect(await state(page)).toBe('Aiming');
  expect(await page.evaluate(() => window.__ANGLECRAFT_AUDIO__.state)).not.toBe('none');
  const log = await page.evaluate(() => window.__ANGLECRAFT__.audioLog());
  expect(log.slice(0, 2)).toEqual([{ call: 'unlock' }, { call: 'music', on: true }]);
  await shootUp(page);
  await stepUntil(page, () => window.__ANGLECRAFT_AUDIO__.stats.synth);
});

test('audio=1: real samples decode during Loading and play as samples after the click', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&audio=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'Title', null, { timeout: 45_000 });
  expect(await page.evaluate(() => window.__ANGLECRAFT_AUDIO__.state)).toBe('none');
  await page.mouse.click(CENTER.x, CENTER.y);
  await shootUp(page);
  await stepUntil(page, () => window.__ANGLECRAFT_AUDIO__.stats.sample);
  expect(await page.evaluate(() => window.__ANGLECRAFT_AUDIO__.stats.synth)).toBe(0);
});
