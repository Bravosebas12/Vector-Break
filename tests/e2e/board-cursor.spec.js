// openspec rendering delta "Aim preview styling": crosshair sprite replaces the system cursor over the board.
import { test, expect } from '@playwright/test';

test('the system cursor is hidden over the board and restored outside it', async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state)).toBe('Title');
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
  const cursor = () => page.evaluate(() => getComputedStyle(document.getElementById('game')).cursor);
  const box = await page.locator('#game').boundingBox();
  const s = box.width / 1920;
  await page.mouse.move(box.x + 960 * s, box.y + 540 * s); // board centre
  expect(await cursor()).toBe('none');
  await page.mouse.move(box.x + 20 * s, box.y + 540 * s); // left of the board
  expect(await cursor()).not.toBe('none');
});
