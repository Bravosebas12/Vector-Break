// Completability: the real boot path plays L1 -> L6 with seeded angle sequences (tests/fixtures/solutions.json,
// degrees from the +x axis, upward positive). The hook steps the fixed-step simulation, so no clock is needed.
// Each test runs in a fresh browser context, so localStorage starts empty.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SOLUTIONS = JSON.parse(readFileSync(new URL('../fixtures/solutions.json', import.meta.url), 'utf8'));
const KEY = 'anglecraft.v1.records';
const CENTER = { x: 640, y: 360 };
const snap = (page) => page.evaluate(() => window.__ANGLECRAFT__?.snapshot());

// Fires one angle and steps until the turn resolves; returns the resulting state.
async function shoot(page, deg) {
  return page.evaluate((d) => {
    const hook = window.__ANGLECRAFT__;
    hook.fire((d * Math.PI) / 180);
    for (let i = 0; i < 400 && ['Firing', 'Simulating', 'Resolving'].includes(hook.snapshot().state); i++) hook.step(30);
    return hook.snapshot().state;
  }, deg);
}

async function begin(page, url = '/?test=1') {
  await page.goto(url);
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Title');
  await page.mouse.click(CENTER.x, CENTER.y);
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Aiming');
}

test('title click then seeded solutions win levels 1-6 in order with records and NEXT gating', async ({ page }) => {
  await begin(page);
  await page.evaluate((s) => window.__ANGLECRAFT__.setSeed(s), SOLUTIONS.seed);
  expect((await snap(page)).level.index).toBe(0);

  for (const [i, level] of SOLUTIONS.levels.entries()) {
    expect((await snap(page)).level.index).toBe(i);
    await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'NEXT' })); // gated: not won yet
    expect((await snap(page)).level.index).toBe(i);

    let state = 'Aiming';
    for (const deg of level.angles) state = await shoot(page, deg);
    expect(state, `level ${i + 1}`).toBe('Victory');

    const result = (await snap(page)).result;
    expect(result.stars).toBeGreaterThanOrEqual(1);
    expect(result.shots).toBe(level.angles.length);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    expect(stored[i]).toEqual(result);

    if (i < SOLUTIONS.levels.length - 1) {
      await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'CONFIRM' }));
    }
  }
  expect(Object.keys(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY))).toHaveLength(6);

  // End of content: NEXT and CONFIRM never leave level 6; CONFIRM restarts it.
  await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'NEXT' }));
  expect((await snap(page)).level.index).toBe(5);
  await page.evaluate(() => window.__ANGLECRAFT__.action({ type: 'CONFIRM' }));
  expect(await snap(page)).toMatchObject({ state: 'Aiming', level: { index: 5 } });
});

test('level 6 victory shows the last-level notice and no Siguiente nivel button', async ({ page }) => {
  await begin(page, '/?test=1&loop=1');
  await page.evaluate(() => window.__ANGLECRAFT__.loadLevel(5));
  const angles = SOLUTIONS.levels[5].angles;
  for (const deg of angles.slice(0, -1)) await shoot(page, deg); // hook-stepped; the real loop only draws
  await page.evaluate((d) => window.__ANGLECRAFT__.fire((d * Math.PI) / 180), angles.at(-1)); // real-time final shot
  await page.waitForFunction(() => window.__ANGLECRAFT__?.snapshot().state === 'Victory');
  await expect(page.locator('.result.victory .notice')).toHaveText('Último nivel completado');
  await expect(page.locator('[data-act="modal-NEXT"]')).toBeHidden();
});
