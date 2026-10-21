// openspec hud delta (Control panel, Pause overlay) and visual-theme "Board input isolation" through the real boot.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } }); // stage at scale 1: logical = client coordinates

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot());
const render = (page) => page.evaluate(() => window.__ANGLECRAFT__.render((window.__t = (window.__t ?? 0) + 200)));
const level = async (page) => {
  await page.goto('/?test=1');
  await expect.poll(async () => (await snap(page)).state).toBe('Title');
  await page.evaluate(() => {
    const hook = window.__ANGLECRAFT__;
    hook.loadLevel(0);
    hook.aim(300, 300);
  });
  await render(page);
};

test('the HUD is hidden on the title and shown in a level', async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(async () => (await snap(page)).state).toBe('Title');
  await page.evaluate(() => window.__ANGLECRAFT__.render(0));
  await expect(page.locator('[data-hud="telemetry"]')).toBeHidden();
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
  await render(page);
  await expect(page.locator('[data-hud="telemetry"]')).toBeVisible();
  await expect(page.locator('[data-hud="telemetry"]')).toContainText('PUZZLE 01 / 06');
});

test('LANZAR fires exactly once and is disabled while the volley runs', async ({ page }) => {
  await level(page);
  await page.click('[data-act="launch"]');
  expect((await snap(page)).shots.used).toBe(1);
  await render(page);
  await expect(page.locator('[data-act="launch"]')).toBeDisabled();
});

test('Pausa toggles pause (button reads Seguir), Reiniciar restarts the level', async ({ page }) => {
  await level(page);
  await page.click('[data-act="launch"]');
  await page.click('[data-act="pause"]');
  expect((await snap(page)).paused).toBe(true);
  await render(page);
  await expect(page.locator('[data-act="pause"]')).toContainText('Seguir');
  await page.click('[data-act="restart"]');
  const s = await snap(page);
  expect([s.state, s.paused, s.shots.used]).toEqual(['Aiming', false, 0]);
});

test('speed buttons set 4X while the volley runs', async ({ page }) => {
  await level(page);
  await page.click('[data-act="launch"]');
  await page.evaluate(() => window.__ANGLECRAFT__.step(2));
  await render(page);
  await page.click('[data-act="speed-4"]');
  expect((await snap(page)).speed).toBe(4);
});

test('a click on a panel outside its buttons does not fire; a click on the board does', async ({ page }) => {
  await level(page);
  await page.mouse.click(1700, 900); // CONTROL panel, below ATAJOS
  await page.mouse.click(400, 900); // gap between the left panel and the board
  expect((await snap(page)).shots.used).toBe(0);
  await page.mouse.click(420 + 540, 40 + 500); // board
  expect((await snap(page)).shots.used).toBe(1);
});

test('P shows the pause overlay over the board only and a second P hides it', async ({ page }) => {
  await level(page);
  await page.keyboard.press('p');
  await render(page);
  const overlay = page.locator('.pause-overlay');
  await expect(overlay).toBeVisible();
  expect(await overlay.boundingBox()).toEqual({ x: 420, y: 40, width: 1080, height: 1000 });
  await page.keyboard.press('p');
  await render(page);
  await expect(overlay).toBeHidden();
});
