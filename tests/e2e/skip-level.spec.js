// HU-12 through the real boot path (openspec change anglecraft-v1-skip-level): the real N key from play and from
// the defeat modal, the Saltar nivel buttons, sounds and the persisted sin resolver mark. Fresh context per test.
import { test, expect } from '@playwright/test';

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__?.snapshot());
const plays = (page) => page.evaluate(() => window.__ANGLECRAFT__.audioLog().filter((c) => c.call === 'play').map((c) => c.type));
const skipped = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('anglecraft.v1.skipped') ?? 'null'));

async function level(page, index, url = '/?test=1') {
  await page.goto(url);
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.evaluate((i) => window.__ANGLECRAFT__.loadLevel(i), index);
}
// Level 1 with a single turn and the real loop: one straight shot ends in GameOver (core left standing).
async function defeat(page) {
  await page.route('**/src/levels/level1.json', async (route) => {
    const json = await (await route.fetch()).json();
    await route.fulfill({ json: { ...json, shots: 1 } });
  });
  await page.goto('/?test=1&loop=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.evaluate(() => {
    window.__ANGLECRAFT__.start();
    window.__ANGLECRAFT__.setFireMode('turn');
    window.__ANGLECRAFT__.fire(Math.PI / 2);
  });
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'GameOver');
  await expect(page.locator('.result.defeat')).toBeVisible();
}

test('CP-45 CP-50 the real N key skips level 2 with a confirm sound and no victory', async ({ page }) => {
  await level(page, 1);
  await page.keyboard.press('n');
  await page.evaluate(() => window.__ANGLECRAFT__.step(1)); // drains the events into the audio sink
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 2 }, shots: { used: 0 }, launcherX: 540 });
  const sounds = await plays(page);
  expect(sounds).toContain('sfx_ui_confirm');
  expect(sounds.filter((t) => t === 'sfx_victory' || t === 'sfx_defeat' || t.startsWith('sfx_star_'))).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('anglecraft.v1.records'))).toBeNull();
});

test('CP-48 Saltar nivel on the defeat modal loads level 2 with click and confirm sounds', async ({ page }) => {
  await defeat(page);
  await page.click('[data-act="modal-SKIP"]');
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 1 } });
  await expect.poll(async () => (await plays(page)).slice(-2)).toEqual(['sfx_ui_click', 'sfx_ui_confirm']);
  await expect(page.locator('.result.defeat')).toBeHidden();
});

test('CP-49 N on the defeat modal skips; R still restarts', async ({ page }) => {
  await defeat(page);
  await page.keyboard.press('n');
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 1 } });
});

test('CP-53 Saltar nivel in the CONTROL header skips the level', async ({ page }) => {
  await level(page, 0);
  await page.evaluate(() => window.__ANGLECRAFT__.render(0)); // the HUD shows after the first frame
  await page.click('[data-hud="control"] [data-act="skip"]');
  expect((await snap(page)).level.index).toBe(1);
});

test('CP-55 the skipped level stays sin resolver after a reload', async ({ page }) => {
  await level(page, 0);
  await page.keyboard.press('n');
  expect(await skipped(page)).toEqual([0]);
  await page.reload();
  const status = await page.evaluate(async () => {
    const { createProgression } = await import('/src/js/system/Progression.js');
    return createProgression().status(0);
  });
  expect(status).toBe('unsolved');
});
