// Renderer smoke through the real boot path (?test=1&loop=1). No pixel assertions, no page.clock: real rAF.
import { test, expect } from '@playwright/test';

test('renderer draws Title, Aiming and a fired volley without console or page errors', async ({ page }) => {
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto('/?test=1&loop=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.waitForFunction(() => window.__ANGLECRAFT_RENDER__?.frames > 3);
  expect(await page.evaluate(() => window.__ANGLECRAFT_RENDER__.layerRedraws)).toBe(0); // Title: no board

  await page.evaluate(() => {
    const hook = window.__ANGLECRAFT__;
    hook.loadLevel(0);
    hook.fire(Math.PI / 2);
  });
  await page.waitForFunction(() => window.__ANGLECRAFT__.snapshot().volley.emitted > 1);
  const before = await page.evaluate(() => window.__ANGLECRAFT_RENDER__.frames);
  await page.waitForFunction((n) => window.__ANGLECRAFT_RENDER__.frames > n + 5, before);
  const stats = await page.evaluate(() => ({ ...window.__ANGLECRAFT_RENDER__ }));
  expect(stats.layerRedraws).toBeGreaterThanOrEqual(1);
  expect(problems).toEqual([]);
});
