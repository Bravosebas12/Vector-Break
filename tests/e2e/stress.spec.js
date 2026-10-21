// Frame rate: openspec rendering spec "Frame rate" + design D11. Real rAF (no page.clock): the page
// probe (main.js, ?test=1 only) times the CPU spent per loop frame (step + render) from the first
// frame with 50 active balls, so a slow vsync cannot fake a pass or a failure.
import { test, expect } from '@playwright/test';

test('50 balls at 4X in the sealed stress fixture: 600 frames average <= 16.7 ms CPU, nothing allocated', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/?test=1&loop=1&stress=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.evaluate(async () => {
    const hook = window.__ANGLECRAFT__;
    hook.loadLevel(await (await fetch('/tests/fixtures/stress-level.json')).json());
    hook.setVolley(50);
    hook.action({ type: 'SET_SPEED', v: 4 });
    hook.fire(Math.PI / 2 - 0.3);
  });
  await page.waitForFunction(() => window.__ANGLECRAFT_PERF__.frames >= 600, null, { timeout: 80_000 });
  const perf = await page.evaluate(() => ({ ...window.__ANGLECRAFT_PERF__, active: window.__ANGLECRAFT__?.snapshot().volley.active }));

  testInfo.annotations.push({ type: 'avg-cpu-ms', description: (perf.cpuMs / perf.frames).toFixed(3) });
  expect(perf.active).toBe(50);
  expect(perf.cpuMs / perf.frames).toBeLessThanOrEqual(16.7);
  expect(perf.createdEnd).toEqual(perf.createdStart); // ball and particle pools never grew
  expect(problems).toEqual([]);
});
