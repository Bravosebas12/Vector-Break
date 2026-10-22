// Flag-gated test hook and determinism: openspec test-harness spec
import { test, expect } from '@playwright/test';

const METHODS = ['step', 'snapshot', 'loadLevel', 'fire', 'aim', 'action', 'setSeed', 'setVolley', 'start', 'audioLog', 'render', 'setFireMode', 'move', 'setLauncherX'];
const state = (page) => page.evaluate(() => window.__ANGLECRAFT__?.snapshot().state);
const ready = async (page, url = '/?test=1') => {
  await page.goto(url);
  await expect.poll(() => state(page)).toBe('Title');
};

test('hook exposes every method with ?test=1 and loadLevel from Title enters Aiming', async ({ page }) => {
  await ready(page);
  const types = await page.evaluate((names) => names.map((n) => typeof window.__ANGLECRAFT__[n]), METHODS);
  expect(types).toEqual(METHODS.map(() => 'function'));
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(0));
  expect(await state(page)).toBe('Aiming');
});

test('setLauncherX places and clamps the launcher in Aiming and is ignored in flight', async ({ page }) => {
  await ready(page);
  const out = await page.evaluate(() => {
    const hook = window.__ANGLECRAFT__;
    hook.loadLevel(0);
    hook.setLauncherX(300);
    const placed = hook.snapshot().launcherX;
    hook.setLauncherX(2000);
    const clamped = hook.snapshot().launcherX;
    hook.fire(Math.PI / 2);
    hook.step(1);
    hook.setLauncherX(300);
    return { placed, clamped, inFlight: hook.snapshot().launcherX };
  });
  expect(out).toEqual({ placed: 300, clamped: 1030, inFlight: 1030 });
});

test('hook is absent without the flag and the game still boots', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => '__ANGLECRAFT__' in window)).toBe(false);
});

test('every method except snapshot throws NOT_READY while Loading', async ({ page }) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route('**/src/levels/*.json', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/?test=1');
  await page.waitForFunction(() => window.__ANGLECRAFT__ !== undefined); // installed by main.js, levels still held
  const outcome = await page.evaluate((names) => {
    const hook = window.__ANGLECRAFT__;
    const errors = names.filter((n) => n !== 'snapshot').map((n) => {
      try {
        hook[n](0, 0);
        return 'no throw';
      } catch (e) {
        return e.message;
      }
    });
    return { state: hook.snapshot().state, errors };
  }, METHODS);
  expect(outcome.state).toBe('Loading');
  expect(new Set(outcome.errors)).toEqual(new Set(['NOT_READY']));
  release();
  await expect.poll(() => state(page)).toBe('Title');
});

test('same level, seed and inputs replay to an identical snapshot', async ({ page }) => {
  const run = async () => {
    await ready(page);
    return page.evaluate(() => {
      const hook = window.__ANGLECRAFT__;
      hook.loadLevel(0);
      hook.setSeed(42);
      hook.fire(1.2);
      hook.step(3000);
      return hook.snapshot();
    });
  };
  const first = await run();
  const second = await run(); // fresh page state through a reload
  expect(first.shots.used).toBe(1);
  expect(first.simTime).toBeGreaterThan(0);
  expect(second).toEqual(first);
});
