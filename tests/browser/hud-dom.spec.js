// DOM HUD view: openspec hud delta (Telemetry panel, Turns bar colors, Control panel, Keycaps,
// Cheap DOM updates). Renders models from Hud.js into a real document with styles.css.
import { test, expect } from '@playwright/test';

const setup = async (page) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); // stage at scale 1, origin (0, 0)
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
    window.hudView = createHudDom(document.getElementById('hud'), { dispatch: (a) => window.actions.push(a) });
    window.snap = (over = {}) => ({
      state: 'Aiming',
      paused: false,
      speed: 1,
      level: { index: 0, id: 'level-01' },
      shots: { used: 0, left: 7, max: 12 },
      volley: { size: 12, emitted: 0, active: 0 },
      score: 12480,
      playTime: 0,
      ...over,
    });
    window.show = (over) => window.hudView.update(hudModel(window.snap(over)));
  });
};
const show = (page, over = {}) => page.evaluate((o) => window.show(o), over);
const css = (page, sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);

test('panels sit at the mockup regions on the 1920x1080 stage', async ({ page }) => {
  await setup(page);
  await show(page);
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  const pick = ({ x, y, width, height }) => [x, y, width, height];
  expect(pick(await box('[data-hud="telemetry"]'))).toEqual([40, 40, 340, 1000]);
  expect(pick(await box('[data-hud="control"]'))).toEqual([1540, 40, 340, 1000]);
});

test('telemetry text: header, status, stage, puzzle, balls, turns caption, points, time; no PRECISIÓN', async ({ page }) => {
  await setup(page);
  await show(page, { volley: { size: 8, emitted: 5, active: 3 }, playTime: 102.6 });
  const text = await page.locator('[data-hud="telemetry"]').innerText();
  for (const t of ['TELEMETRÍA', 'EN CURSO', 'STAGE', '01', 'PUZZLE 01 / 06', 'BOLAS', '03', '/ 08', 'TURNOS', '07', 'LÍMITE DEL PUZZLE · 12 TURNOS', 'PUNTOS', '12 480', 'TIEMPO', '01:42.6'])
    expect(text).toContain(t);
  expect(text).not.toContain('PRECISIÓN');
  const pips = await page.evaluate(() => [...document.querySelectorAll('.pip')].map((p) => p.dataset.s));
  expect(pips).toEqual(['fly', 'fly', 'fly', 'used', 'used', 'avail', 'avail', 'avail', 'none', 'none', 'none', 'none']);
});

test('above 12 balls the pip grid is hidden and the counter remains', async ({ page }) => {
  await setup(page);
  await show(page, { volley: { size: 20, emitted: 0, active: 0 } });
  expect(await css(page, '.pips', 'display')).toBe('none');
  expect(await page.locator('[data-k="ballsSize"]').innerText()).toContain('20');
});

test('status and turns use the mockup colors (amber <= 3, magenta <= 1)', async ({ page }) => {
  await setup(page);
  await show(page, { paused: true, shots: { used: 9, left: 3, max: 12 } });
  expect(await page.locator('[data-k="status"]').innerText()).toBe('PAUSA');
  expect(await css(page, '.status', 'color')).toBe('rgb(255, 158, 0)');
  expect(await css(page, '.seg.on', 'backgroundColor')).toBe('rgb(255, 158, 0)');
  await show(page, { shots: { used: 11, left: 1, max: 12 } });
  expect(await css(page, '.seg.on', 'backgroundColor')).toBe('rgb(247, 37, 133)');
  await show(page, { shots: { used: 2, left: 10, max: 12 } });
  expect(await css(page, '.seg.on', 'backgroundColor')).toBe('rgb(231, 234, 240)');
  expect(await css(page, '.seg:not(.on)', 'backgroundColor')).toBe('rgb(34, 38, 47)');
  expect(await page.locator('.seg').count()).toBe(12);
});

test('control buttons dispatch FIRE, PAUSE, RESTART and SET_SPEED; disabled ones do not', async ({ page }) => {
  await setup(page);
  await show(page);
  await page.click('[data-act="launch"]');
  await page.click('[data-act="pause"]');
  await page.click('[data-act="restart"]');
  await page.click('[data-act="speed-4"]', { force: true }); // disabled while Aiming
  await show(page, { state: 'Simulating', speed: 1, volley: { size: 5, emitted: 5, active: 3 } });
  await page.click('[data-act="speed-4"]');
  await page.click('[data-act="launch"]', { force: true }); // disabled: every ball of the turn fired (HU-13)
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'FIRE' }, { type: 'PAUSE' }, { type: 'RESTART' }, { type: 'SET_SPEED', v: 4 }]);
  await show(page, { state: 'Simulating', speed: 4, paused: true });
  expect(await page.locator('[data-act="pause"]').innerText()).toContain('Seguir');
  expect(await page.locator('[data-k="speed"]').innerText()).toBe('×4');
  expect(await page.evaluate(() => document.querySelector('[data-act="speed-4"]').classList.contains('on'))).toBe(true);
});

test('ATAJOS shows only v1 controls as keycaps with the mockup keycap style', async ({ page }) => {
  await setup(page);
  await show(page);
  const text = await page.locator('[data-hud="control"]').innerText();
  for (const t of ['ATAJOS', 'Apuntar', 'Ratón', 'Lanzar', 'Clic', 'Velocidad', 'Pausa', 'Reiniciar']) expect(text).toContain(t);
  expect(text).not.toContain('Esc');
  expect(text).not.toContain('Clic der.');
  expect(await css(page, '[data-act="restart"] kbd', 'borderBottomWidth')).toBe('2px');
  expect(await css(page, '[data-act="restart"] kbd', 'fontFamily')).toMatch(/^"JetBrains Mono"/);
});

test('pause overlay covers the board only and follows the paused flag', async ({ page }) => {
  await setup(page);
  await show(page, { paused: true });
  const box = await page.evaluate(() => document.querySelector('.pause-overlay').getBoundingClientRect().toJSON());
  expect([box.x, box.y, box.width, box.height]).toEqual([420, 40, 1080, 1000]);
  expect(await page.locator('.pause-overlay').innerText()).toContain('PAUSA');
  await show(page, { paused: false });
  expect(await page.locator('.pause-overlay').isVisible()).toBe(false);
});

test('idle updates add or remove no nodes; hide() hides the whole HUD', async ({ page }) => {
  await setup(page);
  await show(page);
  const mutations = await page.evaluate(() => {
    let changed = 0;
    const obs = new MutationObserver((list) => list.forEach((m) => (changed += m.addedNodes.length + m.removedNodes.length)));
    obs.observe(document.getElementById('hud'), { childList: true, subtree: true });
    for (let i = 0; i < 120; i++) window.show();
    return new Promise((r) => setTimeout(() => (obs.disconnect(), r(changed)), 0));
  });
  expect(mutations).toBe(0);
  await page.evaluate(() => window.hudView.update(null));
  expect(await page.locator('[data-hud="telemetry"]').isVisible()).toBe(false);
});

// Result modals (hud delta "Victory modal", "Defeat modal", "Button actions").
const modal = (page, over = {}, opts = {}) =>
  page.evaluate(
    async ([o, opt]) => {
      const { hudModel, modalModel } = await import('/src/js/system/Hud.js');
      const s = window.snap(o);
      window.hudView.update(hudModel(s), modalModel(s, opt));
    },
    [over, opts],
  );
const won = (stars, shots, extra = {}) => ({ state: 'Victory', result: { stars, score: 18420, shots }, playTime: 102.6, ...extra });

test('victory modal: 680 px over a full-stage scrim, kicker, title, 2 of 3 stars, metrics and buttons', async ({ page }) => {
  await setup(page);
  await modal(page, won(2, 9), { record: { stars: 3, score: 20100, shots: 1 } });
  const box = await page.locator('.result.victory .card').boundingBox();
  expect(box.width).toBe(680);
  expect(await page.locator('.result.victory').boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  const text = await page.locator('.result.victory').innerText();
  for (const t of ['STAGE 01 · RESUELTO', 'Puzzle completado', 'PUNTOS', '18 420', 'récord 20 100 pts', 'TIEMPO', '01:42.6', 'TURNOS', '09', '/ 12', '3 de margen', 'Repetir', 'Siguiente nivel', 'Enter'])
    expect(text).toContain(t);
  expect(await page.locator('.result.victory .star.on').count()).toBe(2);
  expect(await page.locator('.result.victory .star').count()).toBe(3);
  await expect(page.locator('.result.victory .perfect')).toBeHidden();
  await expect(page.locator('.result.defeat')).toBeHidden();
});

test('three stars show TIRO PERFECTO; the last level drops Siguiente nivel and shows the notice', async ({ page }) => {
  await setup(page);
  await modal(page, won(3, 1));
  await expect(page.locator('.result.victory .perfect')).toHaveText('TIRO PERFECTO');
  await modal(page, won(1, 5, { level: { index: 5, id: 'level-06' } }));
  await expect(page.locator('[data-act="modal-NEXT"]')).toBeHidden();
  await expect(page.locator('.result.victory .notice')).toHaveText('Último nivel completado');
  expect(await page.evaluate(() => document.querySelector('[data-act="modal-RESTART"]').classList.contains('primary'))).toBe(true);
});

test('defeat modal: 520 px, SIN TURNOS, sentence and Reiniciar puzzle', async ({ page }) => {
  await setup(page);
  await modal(page, {
    state: 'GameOver',
    result: { stars: 0, score: 7960, shots: 12 },
    shots: { used: 12, left: 0, max: 12 },
    cores: 2,
    blocks: [{ type: 'core', hp: 320 }, { type: 'core', hp: 320 }],
  });
  expect((await page.locator('.result.defeat .card').boundingBox()).width).toBe(520);
  const text = await page.locator('.result.defeat').innerText();
  for (const t of ['SIN TURNOS', 'Puzzle no resuelto', 'Se agotaron los 12 turnos. Quedan 2 núcleos activos con 640 HP combinados.', 'Reiniciar puzzle'])
    expect(text).toContain(t);
  await page.click('[data-act="modal-RESTART-defeat"]');
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'PRESS', target: 'RESTART' }]);
});

test('modal buttons dispatch PRESS with their action and the modal hides when the model is null', async ({ page }) => {
  await setup(page);
  await modal(page, won(2, 3));
  await page.click('[data-act="modal-RESTART"]');
  await page.click('[data-act="modal-NEXT"]');
  expect(await page.evaluate(() => window.actions)).toEqual([{ type: 'PRESS', target: 'RESTART' }, { type: 'PRESS', target: 'NEXT' }]);
  await show(page);
  await expect(page.locator('.result.victory')).toBeHidden();
});
