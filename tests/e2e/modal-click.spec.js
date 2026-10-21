// hud delta "Button actions": the DOM result-modal buttons answer real clicks (?test=1&loop=1).
// Fresh context per test, so storage starts empty; no page.clock. The modal is awaited, never slept for.
import { test, expect } from '@playwright/test';

const serveLevel = (page, patch) =>
  page.route('**/src/levels/level1.json', async (route) => {
    const level = await (await route.fetch()).json();
    level.blocks = level.blocks.filter((b) => !(b.col === 4 && (b.row === 2 || b.row === 7)) && !(b.col === 3 && b.row === 7));
    await route.fulfill({ json: { ...level, ...patch } });
  });
const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot());
const plays = (page) => page.evaluate(() => window.__ANGLECRAFT__.audioLog().filter((c) => c.call === 'play').map((c) => c.type));
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
  await expect(page.locator('.result.victory')).toBeVisible();
};

test('clicking Siguiente nivel on the victory modal loads level 2 with click and confirm sounds', async ({ page }) => {
  await won(page);
  await page.click('[data-act="modal-NEXT"]');
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 1 } });
  // UI sounds are drained into the audio sink on the next loop frame: wait for them, never sleep.
  await expect.poll(async () => (await plays(page)).slice(-2)).toEqual(['sfx_ui_click', 'sfx_ui_confirm']);
  await expect(page.locator('.result.victory')).toBeHidden();
});

test('clicking Repetir on the victory modal restarts the same level', async ({ page }) => {
  await won(page);
  await page.click('[data-act="modal-RESTART"]');
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 0 }, shots: { used: 0 } });
});

test('defeat: clicks on the scrim do nothing; Reiniciar puzzle restarts; R restarts within 500 ms', async ({ page }) => {
  await reach(page, 'GameOver', { shots: 1 }, 3);
  await expect(page.locator('.result.defeat')).toBeVisible();
  await page.mouse.click(40, 40);
  expect((await snap(page)).state).toBe('GameOver');
  await page.click('[data-act="modal-RESTART-defeat"]');
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 0 } });

  await page.evaluate(() => window.__ANGLECRAFT__.fire(Math.PI / 2));
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'GameOver');
  const t0 = Date.now();
  await page.keyboard.press('r');
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().state === 'Aiming');
  expect(Date.now() - t0).toBeLessThan(500);
});
