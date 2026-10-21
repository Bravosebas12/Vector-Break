import { test, expect } from '@playwright/test';

test('smoke: / loads with the game canvas and no console or page errors', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('/');
  // Viewport resizes the backing store to the fitted size x DPR: 16:9 at the 1280x720 default.
  await expect(page.locator('canvas#game')).toHaveAttribute('width', '1280');
  await expect(page.locator('canvas#game')).toHaveAttribute('height', '720');
  await page.waitForLoadState('networkidle');

  expect(failed).toEqual([]);
  expect(problems).toEqual([]);
});

test('smoke: runs from tests/e2e under the e2e project (Chromium)', async ({ page, browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  expect(testInfo.project.name).toBe('e2e');
  await page.goto('/');
  expect(await page.title()).toBe('AngleCraft');
});
