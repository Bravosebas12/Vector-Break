// openspec start-screen delta: the Key Art is a boot asset drawn behind the title; a missing file never blocks.
import { test, expect } from '@playwright/test';

const state = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot().state);

test('the Key Art is requested at boot, counted as an asset and drawn on the title canvas', async ({ page }) => {
  const requested = page.waitForRequest('**/assets/art/key-art.webp');
  await page.goto('/?test=1');
  await requested;
  await expect.poll(() => state(page)).toBe('Title');
  const drawn = await page.evaluate(() => {
    const ctx = document.getElementById('game').getContext('2d');
    const calls = [];
    const original = ctx.drawImage;
    ctx.drawImage = function (img, ...rest) {
      calls.push({ src: img.currentSrc ?? '', w: rest[2], h: rest[3] });
      return original.call(this, img, ...rest);
    };
    window.__ANGLECRAFT__.render(0);
    ctx.drawImage = original;
    return calls;
  });
  expect(drawn).toEqual([{ src: expect.stringContaining('/assets/art/key-art.webp'), w: 1920, h: 1080 }]);
});

test('a missing Key Art still reaches Title and a click starts the game', async ({ page }) => {
  await page.route('**/assets/art/key-art.webp', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/?test=1');
  await expect.poll(() => state(page)).toBe('Title');
  await page.evaluate(() => window.__ANGLECRAFT__.render(0));
  await page.mouse.click(640, 360);
  await expect.poll(() => state(page)).toBe('Aiming');
});
