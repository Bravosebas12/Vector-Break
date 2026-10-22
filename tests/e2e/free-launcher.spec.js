// HU-14 AC6 through the real boot path (?test=1, no rAF loop): openspec change anglecraft-v1-free-launcher,
// aiming delta "Preview from the moved launcher". Viewport 1920x1080: board (x, y) = client (420 + x, 40 + y).
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__?.snapshot());
const step = (page, n) => page.evaluate((k) => window.__ANGLECRAFT__.step(k), n);
// First trajectory dot drawn by one explicit render (16 px dot sprite), in board coordinates.
const firstDot = (page) =>
  page.evaluate(() => {
    const ctx = document.getElementById('game').getContext('2d');
    const draws = [];
    const original = ctx.drawImage;
    ctx.drawImage = function (img, ...a) {
      if (a.length === 8 && a[6] === 16) draws.push({ x: a[4] + 8, y: a[5] + 8 });
      return original.call(this, img, ...a);
    };
    window.__ANGLECRAFT__.render(0);
    ctx.drawImage = original;
    return draws[0];
  });

test('CP-42 the preview keeps its origin and direction after the balls land elsewhere', async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(async () => (await snap(page))?.state).toBe('Title');
  await page.evaluate(() => {
    window.__ANGLECRAFT__.loadLevel(0);
    window.__ANGLECRAFT__.setFireMode(1);
  });
  await page.keyboard.down('a');
  await step(page, 60); // 0.5 s: 540 -> 300
  await page.keyboard.up('a');
  await page.mouse.move(420 + 840, 40 + 436); // 60 degrees from (300, 956)
  const before = { x: (await snap(page)).launcherX, aim: (await snap(page)).aim, dot: await firstDot(page) };
  expect(before.x).toBeCloseTo(300, 0);

  await page.keyboard.press('Space');
  for (let i = 0; i < 400 && (await snap(page)).state !== 'Aiming'; i++) await step(page, 30);
  const after = await snap(page);
  expect(after.state).toBe('Aiming');
  expect(after.launcherX).toBe(before.x);
  expect(after.aim.x).toBeCloseTo(before.aim.x, 6);
  expect(after.aim.y).toBeCloseTo(before.aim.y, 6);
  expect(await firstDot(page)).toEqual(before.dot);
});
