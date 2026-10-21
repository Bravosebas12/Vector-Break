// HU-10 / HU-11 HUD in the DOM (openspec change anglecraft-v1-launcher-and-fire-mode, hud delta):
// MODO DE DISPARO section, BOLAS of the turn, ATAJOS, panel height.
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
    const { hudModel } = await import('/src/js/system/Hud.js');
    window.actions = [];
    const view = createHudDom(document.getElementById('hud'), { dispatch: (a) => window.actions.push(a) });
    window.show = (over = {}) =>
      view.update(
        hudModel({
          state: 'Aiming',
          paused: false,
          speed: 1,
          fireMode: 1,
          level: { index: 0, id: 'level-01' },
          shots: { used: 0, left: 12, max: 12 },
          volley: { size: 5, emitted: 0, active: 0 },
          score: 0,
          playTime: 0,
          ...over,
        }),
      );
  });
};
const show = (page, over = {}) => page.evaluate((o) => window.show(o), over);
const css = (page, sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);

test('CP-29 MODO DE DISPARO: 1-3 with dots and an M keycap; a click dispatches SET_MODE', async ({ page }) => {
  await setup(page);
  await show(page);
  const section = page.locator('[data-k="modeSection"]');
  await expect(section).toContainText('MODO DE DISPARO');
  await expect(section).toContainText('BOLAS POR TIRO');
  expect(await section.locator('kbd').first().innerText()).toBe('M');
  expect(await page.locator('[data-act="mode-3"] .mdot').count()).toBe(3);
  expect(await page.evaluate(() => document.querySelector('[data-act="mode-1"]').classList.contains('on'))).toBe(true);
  await page.click('[data-act="mode-3"]');
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'SET_MODE', v: 3 }]);
});

test('the MODO selector is disabled in flight and amber when limited', async ({ page }) => {
  await setup(page);
  await show(page, { state: 'Simulating', fireMode: 2 });
  await expect(page.locator('[data-act="mode-1"]')).toBeDisabled();
  await show(page, { fireMode: 3, volley: { size: 5, emitted: 3, active: 0 } });
  expect(await css(page, '[data-act="mode-3"]', 'color')).toBe('rgb(255, 158, 0)');
});

test('CP-16 CP-33 ATAJOS shows Mover lanzador A D and Modo M; BOLAS shows balls left to fire with its legend', async ({ page }) => {
  await setup(page);
  await show(page, { fireMode: 2, volley: { size: 5, emitted: 2, active: 0 } });
  const control = await page.locator('[data-hud="control"]').innerText();
  expect(control).toMatch(/Mover lanzador\s*A\s*D/);
  expect(control).toMatch(/Modo\s*M/);
  const tele = await page.locator('[data-hud="telemetry"]').innerText();
  for (const t of ['POR DISPARAR EN EL TURNO', '03', '/ 05', 'en vuelo', 'por disparar', 'recogida']) expect(tele).toContain(t);
});

test('both panels fit their 1000 px height with the new section', async ({ page }) => {
  await setup(page);
  await show(page);
  const fits = await page.evaluate(() =>
    ['telemetry', 'control'].map((k) => {
      const el = document.querySelector(`[data-hud="${k}"]`);
      return el.scrollHeight <= el.clientHeight;
    }),
  );
  expect(fits).toEqual([true, true]);
});
