// HU-12 HUD in the DOM (openspec change anglecraft-v1-skip-level, hud delta): Saltar nivel in the CONTROL header
// and in ATAJOS, the second defeat-modal button, disabled states and the 1000 px panel height.
import { test, expect } from '@playwright/test';

const setup = async (page) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/tests/blank.html');
  await page.evaluate(async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles.css';
    await new Promise((r) => ((link.onload = r), document.head.append(link)));
    const stage = document.createElement('div');
    stage.id = 'stage';
    stage.innerHTML = '<div id="hud"></div>';
    document.body.append(stage);
    const { createHudDom } = await import('/src/js/system/HudDom.js');
    const { hudModel, modalModel } = await import('/src/js/system/Hud.js');
    window.actions = [];
    const view = createHudDom(document.getElementById('hud'), { dispatch: (a) => window.actions.push(a) });
    window.show = (over = {}) => {
      const snap = {
        state: 'Aiming',
        paused: false,
        speed: 1,
        fireMode: 1,
        level: { index: 1, id: 'level-02' },
        shots: { used: 0, left: 12, max: 12 },
        volley: { size: 5, emitted: 0, active: 0 },
        score: 0,
        playTime: 0,
        result: null,
        blocks: [{ type: 'core', hp: 30 }],
        ...over,
      };
      view.update(hudModel(snap, { levelCount: 6 }), modalModel(snap, { levelCount: 6 }));
    };
  });
};
const show = (page, over = {}) => page.evaluate((o) => window.show(o), over);
const lost = (index) => ({ state: 'GameOver', level: { index, id: 'x' }, result: { stars: 0, score: 0, shots: 12 }, shots: { used: 12, left: 0, max: 12 } });

test('CP-53 the CONTROL header shows Saltar nivel with an N keycap; a click dispatches SKIP', async ({ page }) => {
  await setup(page);
  await show(page);
  const button = page.locator('[data-hud="control"] .panel-head [data-act="skip"]');
  await expect(button).toBeEnabled();
  await expect(button).toContainText('Saltar nivel');
  expect(await button.locator('kbd').innerText()).toBe('N');
  expect((await button.boundingBox()).height).toBeLessThanOrEqual(32);
  await button.click();
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'SKIP' }]);
});

test('CP-53 ATAJOS ends with Saltar nivel N and the CONTROL panel still fits 1000 px', async ({ page }) => {
  await setup(page);
  await show(page);
  const rows = await page.locator('[data-hud="control"] .shortcut').allInnerTexts();
  expect(rows.at(-1)).toMatch(/Saltar nivel\s*N/);
  const fit = await page.evaluate(() => {
    const el = document.querySelector('[data-hud="control"]');
    return [el.scrollHeight <= el.clientHeight, el.getBoundingClientRect().height];
  });
  expect(fit).toEqual([true, 1000]);
});

test('CP-52 CP-56 Saltar nivel is disabled on the last level and on the victory', async ({ page }) => {
  await setup(page);
  await show(page, { level: { index: 5, id: 'level-06' } });
  await expect(page.locator('[data-act="skip"]')).toBeDisabled();
  await show(page, { state: 'Victory', result: { stars: 2, score: 300, shots: 3 } });
  await expect(page.locator('[data-act="skip"]')).toBeDisabled();
  await expect(page.locator('.result.victory [data-act="modal-SKIP"]')).toHaveCount(0);
});

test('CP-48 the defeat modal shows Saltar nivel N under Reiniciar puzzle and dispatches PRESS SKIP', async ({ page }) => {
  await setup(page);
  await show(page, lost(3));
  const skip = page.locator('.result.defeat [data-act="modal-SKIP"]');
  await expect(skip).toBeVisible();
  await expect(skip).toBeEnabled();
  expect(await skip.locator('kbd').innerText()).toBe('N');
  const [restartBox, skipBox] = await Promise.all([page.locator('[data-act="modal-RESTART-defeat"]').boundingBox(), skip.boundingBox()]);
  expect(skipBox.y).toBeGreaterThan(restartBox.y);
  await skip.click();
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'PRESS', target: 'SKIP' }]);
});

test('CP-52 the defeat Saltar nivel is disabled on the last level', async ({ page }) => {
  await setup(page);
  await show(page, lost(5));
  await expect(page.locator('[data-act="modal-SKIP"]')).toBeDisabled();
  await show(page, lost(3));
  await expect(page.locator('[data-act="modal-SKIP"]')).toBeEnabled();
});
