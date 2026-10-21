// hud spec "Next": the result-modal buttons answer real mouse clicks on the drawn buttons (?test=1&loop=1).
// Viewport 1280x720: logical = client * 1.5. Fresh context per test, so storage starts empty; no page.clock.
import { test, expect } from '@playwright/test';
import { modalButtonRects } from '../../src/js/system/HudView.js';

const serveLevel = (page, patch) =>
  page.route('**/src/levels/level1.json', async (route) => {
    const level = await (await route.fetch()).json();
    level.blocks = level.blocks.filter((b) => !(b.col === 4 && (b.row === 2 || b.row === 7)) && !(b.col === 3 && b.row === 7));
    await route.fulfill({ json: { ...level, ...patch } });
  });
const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot());
const plays = (page) => page.evaluate(() => window.__ANGLECRAFT__.audioLog().filter((c) => c.call === 'play').map((c) => c.type));
const clickButton = async (page, count, index) => {
  const r = modalButtonRects(count)[index];
  await page.mouse.click((r.x + r.w / 2) / 1.5, (r.y + r.h / 2) / 1.5);
};
async function reach(page, state, patch, volley) {
  await serveLevel(page, patch);
  await page.goto('/?test=1&loop=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.evaluate((v) => {
    window.__ANGLECRAFT__.start();
    window.__ANGLECRAFT__.setVolley(v);
    window.__ANGLECRAFT__.fire(Math.PI / 2);
  }, volley);
  await page.waitForFunction((st) => window.__ANGLECRAFT__.snapshot().state === st, state);
}
const won = async (page) => {
  await reach(page, 'Aiming', undefined, 50); // first shot leaves the 100 HP core standing
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().shots.used === 1);
  await page.evaluate(() => window.__ANGLECRAFT__.fire(Math.PI / 2));
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'Victory');
};

test('clicking Siguiente nivel on the victory modal loads level 2 with click and confirm sounds', async ({ page }) => {
  await won(page);
  await page.waitForTimeout(200); // let the modal draw
  await clickButton(page, 3, 2);
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 1 } });
  const sounds = await plays(page);
  expect(sounds.slice(-2)).toEqual(['sfx_ui_click', 'sfx_ui_confirm']);
});

test('clicking Repetir on the victory modal restarts the same level', async ({ page }) => {
  await won(page);
  await page.waitForTimeout(200);
  await clickButton(page, 3, 0);
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 0 }, shots: { used: 0 } });
});

test('clicking Reiniciar puzzle on the defeat modal restarts the level; clicks off the button do nothing', async ({ page }) => {
  await reach(page, 'GameOver', { shots: 1 }, 3);
  await page.waitForTimeout(200);
  await page.mouse.click(40, 40);
  expect((await snap(page)).state).toBe('GameOver');
  await clickButton(page, 1, 0);
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 0 } });
});
