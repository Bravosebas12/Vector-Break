// HU-10 through the real boot path (?test=1, no rAF loop): real keyboard events, window blur, hook.move and
// the aim preview drawn from the moved launcher. Viewport 1920x1080: logical = client coordinates.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot());
const step = (page, n) => page.evaluate((k) => window.__ANGLECRAFT__.step(k), n);
async function level1(page) {
  await page.goto('/?test=1');
  await expect.poll(async () => (await snap(page)).state).toBe('Title');
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
}

test('CP-03 holding the real D key for 0.25 s of play time moves the launcher 120 px', async ({ page }) => {
  await level1(page);
  await page.keyboard.down('d');
  await step(page, 30);
  await page.keyboard.up('d');
  expect((await snap(page)).launcherX).toBeCloseTo(660, 0);
});

test('CP-15 Caps Lock: holding Shift+A moves left like a', async ({ page }) => {
  await level1(page);
  await page.keyboard.down('Shift');
  await page.keyboard.down('A');
  await step(page, 60);
  await page.keyboard.up('A');
  await page.keyboard.up('Shift');
  expect((await snap(page)).launcherX).toBeCloseTo(300, 0);
});

test('losing window focus releases a held key: the launcher stops', async ({ page }) => {
  await level1(page);
  await page.keyboard.down('a');
  await step(page, 12);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const x = (await snap(page)).launcherX;
  await step(page, 60);
  expect((await snap(page)).launcherX).toBe(x);
});

test('hook.move(dir, seconds) holds and releases the key with stepping', async ({ page }) => {
  await level1(page);
  await page.evaluate(() => window.__ANGLECRAFT__.move(1, 0.5));
  expect((await snap(page)).launcherX).toBeCloseTo(780, 0);
});

test('CP-04 the aim preview starts at the moved launcher in the same frame', async ({ page }) => {
  await level1(page);
  await page.evaluate(() => window.__ANGLECRAFT__.aim(540, 300));
  await page.keyboard.down('d');
  await step(page, 30); // launcher 540 -> 660; aim target stays (540, 300)
  await page.keyboard.up('d');
  const first = await page.evaluate(() => {
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
  // First dot: 36 px from the launcher (660, 956) toward (540, 300), in board coordinates.
  const len = Math.hypot(540 - 660, 300 - 956);
  expect(first.x).toBeCloseTo(660 + ((540 - 660) * 36) / len, 0);
  expect(first.y).toBeCloseTo(956 + ((300 - 956) * 36) / len, 0);
});
