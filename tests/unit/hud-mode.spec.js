// HU-11 MODO DE DISPARO model (openspec change anglecraft-v1-launcher-and-fire-mode, hud delta "Control panel").
import { test, expect } from '@playwright/test';
import { hudModel } from '../../src/js/system/Hud.js';

const snap = (over = {}) => ({
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
});

test('options 1-3 with dots, the active one, the M key and the caption', () => {
  const m = hudModel(snap({ fireMode: 2 })).control.mode;
  expect(m).toMatchObject({ label: 'MODO DE DISPARO', key: 'M', caption: 'BOLAS POR TIRO', current: 2, enabled: true, limited: false });
  expect(m.options).toEqual([
    { v: 1, label: '1', dots: 1, active: false },
    { v: 2, label: '2', dots: 2, active: true },
    { v: 3, label: '3', dots: 3, active: false },
  ]);
});

test('disabled outside Aiming or while paused', () => {
  expect(hudModel(snap({ state: 'Simulating' })).control.mode.enabled).toBe(false);
  expect(hudModel(snap({ paused: true })).control.mode.enabled).toBe(false);
});

test('limited when the balls left in the turn are fewer than the mode', () => {
  expect(hudModel(snap({ fireMode: 3, volley: { size: 5, emitted: 3, active: 0 } })).control.mode).toMatchObject({ current: 3, limited: true });
  expect(hudModel(snap({ fireMode: 2, volley: { size: 5, emitted: 3, active: 0 } })).control.mode.limited).toBe(false);
});

test("the test-only 'turn' mode shows no option active and is never limited", () => {
  const m = hudModel(snap({ fireMode: 'turn' })).control.mode;
  expect(m.options.every((o) => !o.active)).toBe(true);
  expect(m.limited).toBe(false);
});
