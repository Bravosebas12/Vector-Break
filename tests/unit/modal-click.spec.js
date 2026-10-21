// hud spec "Button actions": PRESS action, new-record flag and button sounds (the buttons are DOM, see hud-dom).
import { test, expect } from '@playwright/test';
import { createProgression } from '../../src/js/system/Progression.js';
import { RecordingSink, createSoundMapper } from '../../src/js/system/AudioSinks.js';
import { boot, openField, fire, stepUntil } from './helpers/session.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

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

  test('newRecord is true when the win beats the stored record and false when it does not', () => {
    const progression = createProgression({ storage: memory() });
    const s = boot({ progression });
    win(s, 0);
    expect(s.snapshot().newRecord).toBe(true);
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().newRecord).toBe(false);
    win(s, 0); // same result: not better
    expect(s.snapshot().newRecord).toBe(false);
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
