// hud spec "Next": result-modal buttons are clickable. Geometry, PRESS action and button sounds.
import { test, expect } from '@playwright/test';
import { modalButtonRects, hitModalButton } from '../../src/js/system/HudView.js';
import { modalModel } from '../../src/js/system/Hud.js';
import { LOGICAL_W, LOGICAL_H } from '../../src/js/system/Viewport.js';
import { createProgression } from '../../src/js/system/Progression.js';
import { RecordingSink, createSoundMapper } from '../../src/js/system/AudioSinks.js';
import { boot, openField, fire, stepUntil } from './helpers/session.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const victory = { state: 'Victory', level: { index: 0 }, result: { stars: 3, score: 600 } };
const defeat = { state: 'GameOver', level: { index: 0 }, result: { stars: 0, score: 10 } };

test.describe('modal button geometry', () => {
  test('rects are centered, laid out left to right inside the logical canvas', () => {
    const rects = modalButtonRects(3);
    expect(rects).toHaveLength(3);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(LOGICAL_W);
      expect(r.y + r.h).toBeLessThanOrEqual(LOGICAL_H);
    }
    expect(rects[0].x + rects[0].w).toBeLessThan(rects[1].x);
    expect(rects[1].x + rects[1].w).toBeLessThan(rects[2].x);
    expect((rects[0].x + rects[2].x + rects[2].w) / 2).toBeCloseTo(LOGICAL_W / 2);
  });

  test('hit test maps each button center to its action and misses elsewhere', () => {
    const modal = modalModel(victory);
    const rects = modalButtonRects(modal.buttons.length);
    expect(modal.buttons.map((b, i) => hitModalButton(modal, center(rects[i]).x, center(rects[i]).y))).toEqual(['RESTART', 'RESTART', 'NEXT']);
    expect(hitModalButton(modal, 5, 5)).toBeNull();
    expect(hitModalButton(modal, rects[0].x - 1, center(rects[0]).y)).toBeNull();
    const lost = modalModel(defeat);
    const [only] = modalButtonRects(1);
    expect(hitModalButton(lost, center(only).x, center(only).y)).toBe('RESTART');
  });
});

test.describe('PRESS action', () => {
  const win = (s, level) => {
    s.loadLevel(level);
    openField(s).setVolley(1);
    s.board.cores[0].hp = 0;
    fire(s);
    stepUntil(s, (snap) => snap.state === 'Victory');
  };
  const drained = (s) => {
    const out = [];
    s.drainEvents((type) => out.push(type));
    return out;
  };

  test('PRESS NEXT in Victory loads level 2 and emits UI_CLICK then UI_CONFIRM', () => {
    const s = boot({ progression: createProgression({ storage: memory() }) });
    win(s, 0);
    drained(s);
    s.dispatch({ type: 'PRESS', target: 'NEXT' });
    expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 1 } });
    const events = drained(s);
    expect(events.indexOf('UI_CLICK')).toBeLessThan(events.indexOf('UI_CONFIRM'));
    expect(events).toContain('UI_CONFIRM');
  });

  test('PRESS RESTART in Victory reloads the same level', () => {
    const s = boot({ progression: createProgression({ storage: memory() }) });
    win(s, 0);
    s.dispatch({ type: 'PRESS', target: 'RESTART' });
    expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 0 } });
  });

  test('a press that does nothing (NEXT locked) emits only UI_CLICK', () => {
    const s = boot(); // no progression: nothing is unlocked
    win(s, 0);
    drained(s);
    s.dispatch({ type: 'PRESS', target: 'NEXT' });
    expect(s.snapshot().state).toBe('Victory');
    expect(drained(s)).toEqual(['UI_CLICK']);
  });

  test('PRESS is ignored outside Victory and GameOver', () => {
    const s = boot();
    drained(s); // boot STATE events
    s.dispatch({ type: 'PRESS', target: 'RESTART' });
    expect(s.snapshot().state).toBe('Aiming');
    expect(drained(s)).toEqual([]);
  });
});

test('sound mapper plays sfx_ui_click and sfx_ui_confirm for the UI events', () => {
  const sink = new RecordingSink();
  const onEvent = createSoundMapper({ audio: sink, now: () => 0 });
  onEvent('UI_CLICK', 0, 0);
  onEvent('UI_CONFIRM', 0, 0);
  expect(sink.log.filter((c) => c.call === 'play').map((c) => c.type)).toEqual(['sfx_ui_click', 'sfx_ui_confirm']);
});
