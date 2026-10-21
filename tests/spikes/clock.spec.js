import { test, expect } from '@playwright/test';

// S1: page.clock + requestAnimationFrame + performance.now under runFor().
test('S1: runFor(1000) yields 58-63 rAF calls, 1000 +-1 ms performance.now delta, monotonic timestamps', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.goto('/tests/blank.html');
  // Freeze the clock before measuring: after install() time keeps flowing in real time until paused.
  await page.clock.pauseAt(1000);
  await page.evaluate(() => {
    window.__rafStamps = [];
    window.__t0 = performance.now();
    const tick = (ts) => {
      window.__rafStamps.push(ts);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.clock.runFor(1000);
  const { stamps, delta } = await page.evaluate(() => ({
    stamps: window.__rafStamps,
    delta: performance.now() - window.__t0,
  }));
  console.log(`S1 evidence: rAF calls=${stamps.length} delta=${delta}`);
  expect(stamps.length).toBeGreaterThanOrEqual(58);
  expect(stamps.length).toBeLessThanOrEqual(63);
  expect(Math.abs(delta - 1000)).toBeLessThanOrEqual(1);
  for (let i = 1; i < stamps.length; i++) expect(stamps[i]).toBeGreaterThan(stamps[i - 1]);
});
