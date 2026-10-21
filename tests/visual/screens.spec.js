// openspec test-harness "Visual snapshot tests": title, aiming, paused, victory (2 stars) and defeat at
// 1920x1080, DPR 1 (visual project). Deterministic: fixed seed, no rAF loop (hook.render only), fonts and
// every asset settled before the capture. Baselines change only on purpose: --update-snapshots after design
// approval (docs/visual-fidelity-comparison.md).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SOLUTIONS = JSON.parse(readFileSync(new URL('../fixtures/solutions.json', import.meta.url), 'utf8'));

async function boot(page) {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state)).toBe('Title');
  await page.evaluate(() => document.fonts.ready);
}

// Draws several frames 1 s apart so the HUD refreshes and any destruction particles have expired.
const settle = (page) =>
  page.evaluate(() => {
    for (let i = 1; i <= 8; i++) window.__ANGLECRAFT__.render(i * 1000);
  });

// Fires at `deg` and steps the session until the volley resolves.
const shoot = (page, deg) =>
  page.evaluate((d) => {
    const hook = window.__ANGLECRAFT__;
    hook.fire((d * Math.PI) / 180);
    for (let i = 0; i < 400 && ['Firing', 'Simulating', 'Resolving'].includes(hook.snapshot().state); i++) hook.step(30);
    return hook.snapshot().state;
  }, deg);

async function level(page, index) {
  await page.evaluate(
    ([i, seed]) => {
      window.__ANGLECRAFT__.loadLevel(i);
      window.__ANGLECRAFT__.setSeed(seed);
    },
    [index, SOLUTIONS.seed],
  );
}

test('title', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__ANGLECRAFT__.render(250)); // prompt at full opacity
  await expect(page).toHaveScreenshot('title.png');
});

test('aiming on level 1 with the crosshair', async ({ page }) => {
  await boot(page);
  await level(page, 0);
  await page.evaluate(() => window.__ANGLECRAFT__.setFireMode(1)); // the player's default mode (HU-11)
  await page.mouse.move(420 + 330, 40 + 520); // board (330, 520): the move also sets the aim
  await settle(page);
  await expect(page).toHaveScreenshot('aiming.png');
});

test('paused mid-volley on level 1', async ({ page }) => {
  await boot(page);
  await level(page, 0);
  await page.evaluate(() => {
    const hook = window.__ANGLECRAFT__;
    hook.setFireMode(2);
    hook.fire((70 * Math.PI) / 180);
    hook.step(90);
    hook.action({ type: 'PAUSE' });
  });
  await settle(page);
  await expect(page).toHaveScreenshot('paused.png');
});

test('victory with 2 stars on level 1', async ({ page }) => {
  await boot(page);
  await level(page, 0);
  let state = 'Aiming';
  for (const deg of SOLUTIONS.levels[0].angles) state = await shoot(page, deg);
  expect(state).toBe('Victory');
  expect(await page.evaluate(() => window.__ANGLECRAFT__?.snapshot().result.stars)).toBe(2);
  await settle(page);
  await expect(page).toHaveScreenshot('victory.png');
});

test('defeat on level 2 (out of shots)', async ({ page }) => {
  await boot(page);
  await level(page, 1);
  await page.evaluate(() => window.__ANGLECRAFT__.setVolley(1));
  let state = 'Aiming';
  for (let i = 0; i < 20 && state !== 'GameOver'; i++) state = await shoot(page, 90);
  expect(state).toBe('GameOver');
  await settle(page);
  await expect(page).toHaveScreenshot('defeat.png');
});
