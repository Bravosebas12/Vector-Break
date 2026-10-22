// HU-13 through the real boot path (?test=1, no rAF loop): openspec change anglecraft-v1-simultaneous-fire. Real
// clicks, Space and D in flight, the LANZAR button and the aim preview. Viewport 1920x1080: board (x, y) = client
// (420 + x, 40 + y). Level 2 has 5 balls per turn; at 1X the cadence is 10 steps.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__?.snapshot());
const step = (page, n) => page.evaluate((k) => window.__ANGLECRAFT__.step(k), n);
const plays = (page) => page.evaluate(() => window.__ANGLECRAFT__.audioLog().filter((c) => c.call === 'play').map((c) => c.type));
const board = (x, y) => ({ x: 420 + x, y: 40 + y });

async function level2(page) {
  await page.goto('/?test=1');
  await expect.poll(async () => (await snap(page))?.state).toBe('Title');
  await page.evaluate(() => {
    window.__ANGLECRAFT__.loadLevel(1);
    window.__ANGLECRAFT__.setFireMode(1);
  });
  const p = board(540, 300); // straight up from the launcher
  await page.mouse.move(p.x, p.y);
}
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
    return draws[0] ?? null;
  });

test('CP-59 a real click with a ball in flight fires the next ball at once, with its launch sound', async ({ page }) => {
  await level2(page);
  const p = board(540, 300);
  await page.mouse.click(p.x, p.y);
  await step(page, 12);
  expect(await snap(page)).toMatchObject({ state: 'Simulating', volley: { active: 1 } });
  await page.mouse.click(p.x, p.y);
  await step(page, 1); // drains the events into the audio sink
  expect((await snap(page)).volley).toMatchObject({ emitted: 2, active: 2 });
  expect((await plays(page)).filter((t) => t === 'sfx_burst_launch')).toHaveLength(2);
});

test('CP-60 the aim preview follows the pointer in flight', async ({ page }) => {
  await level2(page);
  await page.keyboard.press('Space');
  await step(page, 12);
  const p = board(840, 436); // 60 degrees from (540, 956)
  await page.mouse.move(p.x, p.y);
  const dot = await firstDot(page);
  const len = Math.hypot(840 - 540, 436 - 956);
  expect(dot.x).toBeCloseTo(540 + ((840 - 540) * 36) / len, 0);
  expect(dot.y).toBeCloseTo(956 + ((436 - 956) * 36) / len, 0);
});

test('CP-61 with every ball fired, clicks do nothing, LANZAR is disabled and there is no preview', async ({ page }) => {
  await level2(page);
  await page.evaluate(() => window.__ANGLECRAFT__.setVolley(2));
  await page.keyboard.press('Space');
  await step(page, 11);
  await page.keyboard.press('Space');
  await step(page, 11);
  const before = (await snap(page)).volley;
  expect(before.emitted).toBe(2);
  const p = board(540, 300);
  await page.mouse.click(p.x, p.y);
  expect((await snap(page)).volley).toEqual(before);
  expect(await firstDot(page)).toBeNull();
  await expect(page.locator('[data-act="launch"]')).toBeDisabled();
});

test('CP-67 holding the real D key in flight moves the launcher; the next ball leaves from there', async ({ page }) => {
  await level2(page);
  await page.keyboard.press('Space');
  await page.keyboard.down('d');
  await step(page, 60); // 0.5 s: 540 -> 780
  await page.keyboard.up('d');
  expect((await snap(page)).launcherX).toBeCloseTo(780, 0);
  await page.keyboard.press('Space');
  const balls = (await snap(page)).balls;
  expect(balls).toHaveLength(2);
  expect(balls.at(-1).x).toBeCloseTo(780, 0);
});
