// Tutorial hints through the real boot path (?test=1, no rAF loop: hook.render draws each frame).
// openspec change anglecraft-v1-launcher-and-fire-mode, tutorial-hints capability; QA cases CP-17, CP-18, CP-34, CP-35.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

const render = (page) => page.evaluate(() => window.__ANGLECRAFT__.render((window.__t = (window.__t ?? 0) + 200)));
const moveHint = (page) => page.locator('.hint[data-hint="move"]');
const modeHint = (page) => page.locator('.hint[data-hint="mode"]');
async function start(page) {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state)).toBe('Title');
  await page.evaluate(() => window.__ANGLECRAFT__.render(0));
  await page.mouse.click(960, 540); // the title click enters level 1
  await render(page);
}

test('CP-17 a new session on level 1 shows the move hint to the right of the launcher; a D tap dismisses it', async ({ page }) => {
  await start(page);
  const hint = moveHint(page);
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('TUTORIAL');
  await expect(hint).toContainText('Mueve el lanzador');
  expect(await hint.locator('kbd').allInnerTexts()).toEqual(['A', 'D']);
  const box = await hint.boundingBox();
  expect(box.x).toBeGreaterThan(420 + 540); // right of the launcher (stage x 960)
  await page.keyboard.press('d');
  await render(page);
  await expect(hint).toBeHidden();
});

test('CP-18 firing dismisses the move hint; it does not return after R or a replay', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const hook = window.__ANGLECRAFT__;
    hook.fire(Math.PI / 2);
  });
  await render(page);
  await expect(moveHint(page)).toBeHidden();
  await page.keyboard.press('r');
  await render(page);
  await expect(moveHint(page)).toBeHidden();
});

test('a page reload is a new session: the move hint is back', async ({ page }) => {
  await start(page);
  await page.keyboard.press('d');
  await render(page);
  await start(page);
  await expect(moveHint(page)).toBeVisible();
});

test('CP-34 level 2 shows the mode hint and highlights MODO; M dismisses both; no move hint there', async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(1));
  await render(page);
  const hint = modeHint(page);
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Elige cuántas bolas lanzar por tiro');
  await expect(hint).toContainText('1, 2 o 3');
  expect(await hint.locator('kbd').allInnerTexts()).toEqual(['M']);
  await expect(page.locator('[data-k="modeSection"]')).toHaveClass(/highlight/);
  await expect(moveHint(page)).toBeHidden();
  await page.evaluate(() => window.__ANGLECRAFT__.setFireMode(1)); // leave the test-only 'turn' mode
  await page.keyboard.press('m');
  await render(page);
  await expect(hint).toBeHidden();
  await expect(page.locator('[data-k="modeSection"]')).not.toHaveClass(/highlight/);
});

test('CP-35 firing dismisses the mode hint and it stays away after R', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    window.__ANGLECRAFT__.loadLevel(1);
  });
  await render(page);
  await page.evaluate(() => window.__ANGLECRAFT__.fire(Math.PI / 2));
  await render(page);
  await expect(modeHint(page)).toBeHidden();
  await page.keyboard.press('r');
  await render(page);
  await expect(modeHint(page)).toBeHidden();
});

test('the hint hides while paused and comes back on resume; clicks on it reach the board', async ({ page }) => {
  await start(page);
  await page.keyboard.press('p');
  await render(page);
  await expect(moveHint(page)).toBeHidden();
  await page.keyboard.press('p');
  await render(page);
  const box = await moveHint(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  expect(await page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state)).toBe('Firing');
});
