// openspec test-harness "Visual snapshot tests": the CSS stage background (grid + glows), canvas hidden.
import { test, expect } from '@playwright/test';

test('stage background matches the mockup', async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state)).toBe('Title');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#game').evaluate((c) => (c.style.visibility = 'hidden'));
  await expect(page).toHaveScreenshot('stage.png');
});
