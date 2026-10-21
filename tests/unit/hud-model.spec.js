import { test, expect } from '@playwright/test';
import { boot } from './helpers/session.js';
import { hudModel, modalModel, turnsTone, formatTime, formatPoints } from '../../src/js/system/Hud.js';
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
    const t = hudModel(snap({ score: 12480 }), { levelCount: 6 }).telemetry;
    expect(t.title).toBe(strings.telemetry);
    expect(t.stage).toBe('03');
    expect(t.puzzle).toBe('PUZZLE 03 / 06');
    expect(t.turns).toMatchObject({ left: '05', max: '06', tone: 'strong', segments: { filled: 5, total: 6 } });
    expect(t.turns.caption).toBe('LÍMITE DEL PUZZLE · 6 TURNOS');
    expect(t.points).toBe('12 480');
    expect(t.stageLabel).toBe(strings.stage);
  });

  test('status: EN CURSO cyan while playing, PAUSA amber, RESUELTO cyan, FALLIDO magenta', () => {
    const st = (over) => hudModel(snap(over)).telemetry.status;
    expect(st({})).toEqual({ label: 'EN CURSO', tone: 'cyan' });
    expect(st({ paused: true })).toEqual({ label: 'PAUSA', tone: 'amber' });
    expect(st({ state: 'Victory' })).toEqual({ label: 'RESUELTO', tone: 'cyan' });
    expect(st({ state: 'GameOver' })).toEqual({ label: 'FALLIDO', tone: 'magenta' });
  });

  test('BOLAS: counter in flight / size, pips in flight / used / available, number above 12', () => {
    const b8 = hudModel(snap({ volley: { size: 8, emitted: 5, active: 3 } })).telemetry.balls;
    expect(b8).toMatchObject({ mode: 'pips', active: '03', size: '08', pips: { flying: 3, used: 2, available: 3 } });
    expect(hudModel(snap({ volley: { size: 12, emitted: 0, active: 0 } })).telemetry.balls.mode).toBe('pips');
    const b20 = hudModel(snap({ volley: { size: 20, emitted: 0, active: 4 } })).telemetry.balls;
    expect(b20).toMatchObject({ mode: 'number', active: '04', size: '20' });
  });

  test('no PRECISION label anywhere in the model or the copy', () => {
    const json = JSON.stringify([hudModel(snap()), strings]).toUpperCase();
    expect(json).not.toContain('PRECISION');
    expect(json).not.toContain('PRECISIÓN');
  });
});

test.describe('Turns bar tones', () => {
  test('strong > 3, amber <= 3, magenta <= 1', () => {
    expect([5, 4, 3, 2, 1, 0].map(turnsTone)).toEqual(['strong', 'strong', 'amber', 'amber', 'magenta', 'magenta']);
  });

  test('model uses the tone for the shots left', () => {
    const tone = (left) => hudModel(snap({ shots: { used: 6 - left, left, max: 6 } })).telemetry.turns.tone;
    expect([tone(5), tone(3), tone(1)]).toEqual(['strong', 'amber', 'magenta']);
  });
});

test.describe('TIEMPO and PUNTOS formats', () => {
  test('play time as mm:ss.d', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(59.96)).toBe('00:59.9');
    expect(formatTime(102.6)).toBe('01:42.6');
    expect(formatTime(3725)).toBe('62:05.0');
  });

  test('points grouped by thousands with a space', () => {
    expect([0, 999, 12480, 1234567].map(formatPoints)).toEqual(['0', '999', '12 480', '1 234 567']);
  });

  test('time follows playTime, which excludes pause', () => {
    expect(hudModel(snap({ playTime: 75 })).telemetry.time).toBe('01:15.0');
    expect(hudModel(snap({ playTime: 75, paused: true })).telemetry.time).toBe('01:15.0');
  });
});

test.describe('Control panel', () => {
  test('LANZAR is enabled only while Aiming and not paused', () => {
    expect(hudModel(snap()).control.launch).toEqual({ label: strings.launch, key: 'Space', enabled: true });
    expect(hudModel(snap({ state: 'Simulating' })).control.launch.enabled).toBe(false);
    expect(hudModel(snap({ paused: true })).control.launch.enabled).toBe(false);
  });

  test('Pausa toggles to Seguir while paused; Reiniciar is always available in a level', () => {
    expect(hudModel(snap()).control.pause).toEqual({ label: 'Pausa', key: 'P', active: false, enabled: true });
    expect(hudModel(snap({ paused: true })).control.pause).toEqual({ label: 'Seguir', key: 'P', active: true, enabled: true });
    expect(hudModel(snap({ state: 'Victory' })).control.pause.enabled).toBe(false);
    expect(hudModel(snap()).control.restart).toEqual({ label: strings.restart, key: 'R', enabled: true });
  });

  test('VELOCIDAD shows ×N; options are enabled only while the volley runs', () => {
    const s4 = hudModel(snap({ state: 'Simulating', speed: 4 })).control.speed;
    expect(s4.current).toBe('×4');
    expect(s4.options).toEqual([
      { label: '1X', key: '1', v: 1, active: false, enabled: true },
      { label: '2X', key: '2', v: 2, active: false, enabled: true },
      { label: '4X', key: '4', v: 4, active: true, enabled: true },
    ]);
    expect(hudModel(snap()).control.speed.options.every((o) => !o.enabled)).toBe(true);
    expect(hudModel(snap({ state: 'Simulating', paused: true })).control.speed.options.every((o) => !o.enabled)).toBe(true);
  });

  test('ATAJOS lists only valid v1 controls as keycaps', () => {
    const list = hudModel(snap()).control.shortcuts;
    expect(list).toEqual([
      { label: 'Apuntar', keys: ['Ratón'] },
      { label: 'Lanzar', keys: ['Clic', 'Space'] },
      { label: 'Velocidad', keys: ['1', '2', '4'] },
      { label: 'Pausa', keys: ['P'] },
      { label: 'Reiniciar', keys: ['R'] },
    ]);
    const text = JSON.stringify(list).toLowerCase();
    expect(text).not.toContain('esc');
    expect(text).not.toContain('der.');
  });
});

test.describe('Pause overlay', () => {
  test('visible while paused, hidden after resume', () => {
    expect(hudModel(snap({ paused: true })).pause).toEqual({ visible: true, label: strings.pause, key: 'P' });
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
  test('kicker, title, stars, PUNTOS with record, TIEMPO, TURNOS with margin; Repetir + Siguiente nivel', () => {
    const m = modalModel(snap({ ...result(2, 18420, 9), shots: { used: 9, left: 3, max: 12 }, playTime: 102.6, level: { index: 2, id: 'level-03' } }), {
      levelCount: 6,
      record: { stars: 3, score: 20100, shots: 1 },
    });
    expect(m).toMatchObject({ kind: 'victory', kicker: 'STAGE 03 · RESUELTO', title: 'Puzzle completado', stars: 2, perfect: false, notice: null, primaryAction: 'NEXT' });
    expect(m.metrics).toEqual([
      { label: 'PUNTOS', value: '18 420', total: '', sub: 'récord 20 100 pts' },
      { label: 'TIEMPO', value: '01:42.6', total: '', sub: '' },
      { label: 'TURNOS', value: '09', total: ' / 12', sub: '3 de margen' },
    ]);
    expect(m.buttons).toEqual([
      { label: strings.retry, key: 'R', action: 'RESTART', primary: false },
      { label: strings.nextLevel, key: 'Enter', action: 'NEXT', primary: true },
    ]);
  });

  test('a new best shows "nuevo récord"; no stored record shows nothing', () => {
    const fresh = modalModel(snap({ ...result(2, 500, 3), newRecord: true }), { record: { stars: 2, score: 500, shots: 3 } });
    expect(fresh.metrics[0].sub).toBe('nuevo récord');
    expect(modalModel(snap(result(2, 500, 3))).metrics[0].sub).toBe('');
  });

  test('3 stars in one shot carries the perfect-shot mark', () => {
    const m = modalModel(snap(result(3, 700, 1)), { levelCount: 6 });
    expect(m.stars).toBe(3);
    expect(m.perfect).toBe(true);
    expect(m.perfectLabel).toBe(strings.perfectShot);
  });

  test('last level: no Siguiente, notice shown, Repetir primary', () => {
    const m = modalModel(snap({ ...result(1, 300, 5), level: { index: 5, id: 'level-06' } }), { levelCount: 6 });
    expect(m.buttons).toEqual([{ label: strings.retry, key: 'R', action: 'RESTART', primary: true }]);
    expect(m.notice).toBe(strings.lastLevel);
    expect(m.primaryAction).toBe('RESTART');
  });
});

test.describe('Defeat modal', () => {
  const lost = (over = {}) =>
    snap({ state: 'GameOver', result: { stars: 0, score: 45, shots: 12 }, shots: { used: 12, left: 0, max: 12 }, ...over });

  test('SIN TURNOS, title, sentence with active cores and combined HP, one Reiniciar puzzle button', () => {
    const m = modalModel(lost({ cores: 2, blocks: [{ type: 'core', hp: 320 }, { type: 'core', hp: 320 }, { type: 'standard', hp: 4 }] }));
    expect(m).toMatchObject({ kind: 'defeat', kicker: 'SIN TURNOS', title: 'Puzzle no resuelto', primaryAction: 'RESTART' });
    expect(m.message).toBe('Se agotaron los 12 turnos. Quedan 2 núcleos activos con 640 HP combinados.');
    expect(m.buttons).toEqual([{ label: strings.restartPuzzle, key: 'R', action: 'RESTART', primary: true }]);
  });

  test('singular forms for one shot and one core', () => {
    const m = modalModel(lost({ shots: { used: 1, left: 0, max: 1 }, cores: 1, blocks: [{ type: 'core', hp: 100 }] }));
    expect(m.message).toBe('Se agotó el único turno. Queda 1 núcleo activo con 100 HP.');
  });

  test('no modal outside Victory/GameOver', () => {
    expect(modalModel(snap())).toBeNull();
    expect(modalModel(snap({ state: 'Simulating' }))).toBeNull();
  });
});
