// Fixed-timestep loop: openspec rendering spec "Fixed-timestep loop". Real rAF under page.clock (spike S1: no fallback).
// Counts are asserted with a tolerance: the clock yields 63 rAF per 1000 ms, never an exact frame count.
import { test, expect } from '@playwright/test';

const STEP = 1 / 120;
const playTime = (page) => page.evaluate(() => window.__ANGLECRAFT__.snapshot().playTime);

async function boot(page, query = '/?test=1&loop=1') {
  await page.clock.install({ time: 0 });
  await page.goto(query);
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  // Freeze before measuring (S1 gotcha). Pause relative to the current fake time: a slow boot can
  // already be past any fixed instant, and pauseAt cannot move the clock backwards.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 50);
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0)); // Aiming: playTime accrues one STEP per loop step
}

test('pure loop: 1 s of frames at 60 Hz and at 144 Hz yields about 120 steps, alpha stays in [0, 1)', async ({ page }) => {
  await page.goto('/tests/blank.html');
  const results = await page.evaluate(async () => {
    const { createLoop } = await import('/src/js/system/Loop.js');
    return [60, 144, 240].map((hz) => {
      let steps = 0;
      let maxAlpha = 0;
      const loop = createLoop({ step: () => steps++, render: (a) => (maxAlpha = Math.max(maxAlpha, a)) });
      for (let i = 0; i <= hz; i++) loop.frame((i * 1000) / hz);
      return { hz, steps, maxAlpha };
    });
  });
  for (const r of results) {
    expect(Math.abs(r.steps - 120), `${r.hz} Hz`).toBeLessThanOrEqual(1);
    expect(r.maxAlpha).toBeLessThan(1);
    expect(r.maxAlpha).toBeGreaterThan(0);
  }
});

test('pure loop: a 5 s stall is clamped to 0.25 s (30 steps) and the first frame only primes the clock', async ({ page }) => {
  await page.goto('/tests/blank.html');
  const r = await page.evaluate(async () => {
    const { createLoop } = await import('/src/js/system/Loop.js');
    let steps = 0;
    const loop = createLoop({ step: () => steps++, render: () => {} });
    loop.frame(10_000);
    const primed = steps;
    loop.frame(15_000);
    return { primed, afterStall: steps };
  });
  expect(r.primed).toBe(0);
  expect(r.afterStall).toBe(30);
});

test('&loop=1 drives GameSession.step: about 120 steps per 1000 ms under page.clock', async ({ page }) => {
  await boot(page);
  const t0 = await playTime(page);
  await page.clock.runFor(1000);
  const steps = ((await playTime(page)) - t0) / STEP;
  expect(steps).toBeGreaterThan(100); // 63 frames x 16 ms, clamp-free
  expect(steps).toBeLessThan(125);
});

test('&loop=1 clamps a long frame delta to 0.25 s', async ({ page }) => {
  await boot(page);
  const t0 = await playTime(page);
  await page.clock.fastForward(5000); // one rAF with a 5 s delta
  const dt = (await playTime(page)) - t0;
  expect(dt).toBeGreaterThan(0.2);
  expect(dt).toBeLessThanOrEqual(0.27);
});

test('without &loop=1 the session is not stepped by time', async ({ page }) => {
  await boot(page, '/?test=1');
  const t0 = await playTime(page);
  await page.clock.runFor(1000);
  expect(await playTime(page)).toBe(t0);
});
