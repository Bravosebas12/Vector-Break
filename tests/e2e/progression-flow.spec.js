// Victory/defeat modals and progression wired through the real boot path (?test=1&loop=1).
// Level 1 is served with the column above the launcher cleared, so a straight hook shot reaches the 100 HP core.
// No page.clock; each test runs in a fresh browser context, so localStorage starts empty.
import { test, expect } from '@playwright/test';

const KEY = 'anglecraft.v1.records';
const serveLevel = (page, patch) =>
  page.route('**/src/levels/level1.json', async (route) => {
    const level = await (await route.fetch()).json();
    level.blocks = level.blocks.filter((b) => !(b.col === 4 && (b.row === 2 || b.row === 7)) && !(b.col === 3 && b.row === 7));
    await route.fulfill({ json: { ...level, ...patch } });
  });

async function begin(page, volley = 3) {
  await page.addInitScript(() => {
    window.__TEXTS__ = new Set();
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) {
      window.__TEXTS__.add(String(t));
      return fill.call(this, t, ...rest);
    };
  });
  await page.goto('/?test=1&loop=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.evaluate((v) => {
    window.__ANGLECRAFT__.start();
    window.__ANGLECRAFT__.setVolley(v);
    window.__ANGLECRAFT__.fire(Math.PI / 2);
  }, volley);
}
const drawn = (page, label) => page.waitForFunction((t) => window.__TEXTS__.has(t), label);

test('winning shows RESUELTO with stars, stores the record and Enter loads level 2', async ({ page }) => {
  await serveLevel(page);
  await begin(page, 50); // 50 balls per shot: the 100 HP core falls on the second shot
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().shots.used === 1 && window.__ANGLECRAFT__.snapshot().state === 'Aiming');
  await page.evaluate(() => window.__ANGLECRAFT__.fire(Math.PI / 2));
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'Victory');
  await drawn(page, 'RESUELTO');
  await drawn(page, 'Siguiente nivel');
  const snap = await page.evaluate(() => window.__ANGLECRAFT__.snapshot());
  expect(snap.result).toEqual({ stars: 2, score: 900, shots: 2 });
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).toEqual({ 0: snap.result });

  await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'CONFIRM' }));
  expect(await page.evaluate(() => window.__ANGLECRAFT__.snapshot().level)).toEqual({ index: 1, id: 'level-02' });
});

test('losing shows FALLIDO, stores no record and Enter restarts the level', async ({ page }) => {
  await serveLevel(page, { shots: 1 });
  await begin(page);
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'GameOver');
  await drawn(page, 'FALLIDO');
  await drawn(page, 'Reiniciar puzzle [R]');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
  await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'CONFIRM' }));
  expect(await page.evaluate(() => window.__ANGLECRAFT__.snapshot())).toMatchObject({ state: 'Aiming', level: { index: 0 } });
});

test('the HUD panels are drawn during play', async ({ page }) => {
  await serveLevel(page);
  await begin(page);
  for (const label of ['TELEMETRÍA', 'CONTROL', 'ATAJOS']) await drawn(page, label);
});
