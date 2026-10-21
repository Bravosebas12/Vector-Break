import { test, expect } from '@playwright/test';
import { boot } from './helpers/session.js';
import { hudModel, modalModel, turnsColor, formatTime, TURN_COLORS } from '../../src/js/system/Hud.js';
import { strings } from '../../src/js/system/strings.js';

const snap = (over = {}) => ({
  state: 'Aiming',
  paused: false,
  speed: 1,
  level: { index: 2, id: 'level-03' },
  shots: { used: 1, left: 5, max: 6 },
  volley: { size: 8, emitted: 0, active: 0 },
  score: 120,
  playTime: 0,
  ...over,
});

test.describe('HudModel telemetry (A3)', () => {
  test('stage, puzzle, turns and points are projected from the snapshot', () => {
    const t = hudModel(snap(), { levelCount: 6 }).telemetry;
    expect(t.stage).toBe('03');
    expect(t.puzzle).toBe('03/06');
    expect(t.turns).toEqual({ left: 5, max: 6, color: TURN_COLORS.white });
    expect(t.points).toBe(120);
    expect(t.stageLabel).toBe(strings.stage);
  });

  test('BOLAS shows pips up to 12 and a number above', () => {
    const b8 = hudModel(snap({ volley: { size: 8, emitted: 3, active: 2 } })).telemetry.balls;
    expect(b8).toEqual({ mode: 'pips', count: 8, active: 2 });
    const b12 = hudModel(snap({ volley: { size: 12, emitted: 0, active: 0 } })).telemetry.balls;
    expect(b12.mode).toBe('pips');
    const b20 = hudModel(snap({ volley: { size: 20, emitted: 0, active: 4 } })).telemetry.balls;
    expect(b20).toEqual({ mode: 'number', count: 20, active: 4 });
  });

  test('no PRECISION label anywhere in the model or the copy', () => {
    const json = JSON.stringify([hudModel(snap()), strings]).toUpperCase();
    expect(json).not.toContain('PRECISION');
    expect(json).not.toContain('PRECISIÓN');
  });
});

test.describe('Turns bar colors', () => {
  test('white > 3, amber <= 3, magenta <= 1', () => {
    expect(turnsColor(5)).toBe(TURN_COLORS.white);
    expect(turnsColor(4)).toBe(TURN_COLORS.white);
    expect(turnsColor(3)).toBe(TURN_COLORS.amber);
    expect(turnsColor(2)).toBe(TURN_COLORS.amber);
    expect(turnsColor(1)).toBe(TURN_COLORS.magenta);
    expect(turnsColor(0)).toBe(TURN_COLORS.magenta);
    expect(new Set(Object.values(TURN_COLORS)).size).toBe(3);
  });

  test('model uses the colour for the shots left', () => {
    const color = (left) => hudModel(snap({ shots: { used: 6 - left, left, max: 6 } })).telemetry.turns.color;
    expect([color(5), color(3), color(1)]).toEqual([TURN_COLORS.white, TURN_COLORS.amber, TURN_COLORS.magenta]);
  });
});

test.describe('TIEMPO', () => {
  test('formats play time as mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59.9)).toBe('00:59');
    expect(formatTime(75)).toBe('01:15');
    expect(formatTime(3725)).toBe('62:05');
  });

  test('time follows playTime, which excludes pause', () => {
    expect(hudModel(snap({ playTime: 75 })).telemetry.time).toBe('01:15');
    expect(hudModel(snap({ playTime: 75, paused: true })).telemetry.time).toBe('01:15');
  });
});

test.describe('Control panel', () => {
  test('LANZAR is enabled only while Aiming and not paused', () => {
    expect(hudModel(snap()).control.launch).toEqual({ label: strings.launch, key: 'Space', enabled: true });
    expect(hudModel(snap({ state: 'Simulating' })).control.launch.enabled).toBe(false);
    expect(hudModel(snap({ paused: true })).control.launch.enabled).toBe(false);
  });

  test('VELOCIDAD shows the current speed among 1X/2X/4X', () => {
    const s4 = hudModel(snap({ state: 'Simulating', speed: 4 })).control.speed;
    expect(s4.current).toBe('4X');
    expect(s4.options).toEqual([
      { label: '1X', key: '1', active: false },
      { label: '2X', key: '2', active: false },
      { label: '4X', key: '4', active: true },
    ]);
    expect(hudModel(snap()).control.speed.current).toBe('1X');
  });

  test('ATAJOS lists only valid v1 controls', () => {
    const list = hudModel(snap()).control.shortcuts;
    expect(list.length).toBe(5);
    const text = JSON.stringify(list).toLowerCase();
    expect(text).toContain('"p"');
    expect(text).toContain('"r"');
    expect(text).not.toContain('esc');
    expect(text).not.toContain('derecho');
    expect(text).not.toContain('right');
  });
});

test.describe('Pause overlay', () => {
  test('visible while paused, hidden after resume', () => {
    expect(hudModel(snap({ paused: true })).pause).toEqual({ visible: true, label: strings.pause });
    expect(hudModel(snap({ paused: false })).pause.visible).toBe(false);
  });
});

test('P toggles the overlay through a real session', () => {
  const s = boot();
  const visible = () => hudModel(s.snapshot()).pause.visible;
  expect(visible()).toBe(false);
  s.dispatch({ type: 'PAUSE' });
  expect(visible()).toBe(true);
  s.dispatch({ type: 'PAUSE' });
  expect(visible()).toBe(false);
});

const result = (stars, score = 640, shots = 1) => ({ state: 'Victory', result: { stars, score, shots } });

test.describe('Victory modal', () => {
  test('RESUELTO shows points, stars, record and Repetir/Reiniciar/Siguiente', () => {
    const m = modalModel(snap({ ...result(2, 640, 3), level: { index: 2, id: 'level-03' } }), {
      levelCount: 6,
      record: { stars: 3, score: 900, shots: 1 },
    });
    expect(m.kind).toBe('victory');
    expect(m.title).toBe(strings.solved);
    expect(m.points).toBe(640);
    expect(m.stars).toBe(2);
    expect(m.perfect).toBe(false);
    expect(m.record).toEqual({ stars: 3, score: 900, shots: 1 });
    expect(m.buttons).toEqual([
      { label: strings.retry, action: 'RESTART', primary: false },
      { label: strings.restart, action: 'RESTART', primary: false },
      { label: strings.nextLevel, action: 'NEXT', primary: true },
    ]);
    expect(m.primaryAction).toBe('NEXT');
    expect(m.notice).toBeNull();
  });

  test('3 stars in one shot carries the perfect-shot mark', () => {
    const m = modalModel(snap(result(3, 700, 1)), { levelCount: 6 });
    expect(m.stars).toBe(3);
    expect(m.perfect).toBe(true);
    expect(m.perfectLabel).toBe(strings.perfectShot);
  });

  test('last level: no Siguiente, notice shown, Repetir primary', () => {
    const m = modalModel(snap({ ...result(1, 300, 5), level: { index: 5, id: 'level-06' } }), { levelCount: 6 });
    expect(m.buttons.map((b) => b.label)).toEqual([strings.retry, strings.restart]);
    expect(m.notice).toBe(strings.lastLevel);
    expect(m.primaryAction).toBe('RESTART');
    expect(m.buttons[0].primary).toBe(true);
  });
});

test.describe('Defeat modal', () => {
  const lost = snap({ state: 'GameOver', result: { stars: 0, score: 45, shots: 6 } });

  test('FALLIDO shows PUNTOS and one primary restart button; Enter restarts', () => {
    const m = modalModel(lost);
    expect(m.kind).toBe('defeat');
    expect(m.title).toBe(strings.failed);
    expect(m.points).toBe(45);
    expect(m.buttons).toEqual([{ label: strings.restartPuzzle, action: 'RESTART', primary: true }]);
    expect(m.primaryAction).toBe('RESTART');
  });

  test('no modal outside Victory/GameOver', () => {
    expect(modalModel(snap())).toBeNull();
    expect(modalModel(snap({ state: 'Simulating' }))).toBeNull();
  });
});
