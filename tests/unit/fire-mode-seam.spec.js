// openspec change anglecraft-v1-launcher-and-fire-mode, test-harness delta "Flag-gated test hook":
// the test-only 'turn' fire mode reproduces v1 (one FIRE emits the whole volley) and survives level loads.
import { test, expect } from '@playwright/test';
import { boot, openField, fire, stepUntil, turnOver } from './helpers/session.js';
import { mapEvent } from '../../src/js/system/Input.js';

test("'turn' mode: one FIRE emits the whole volley and counts one shot (v1 behavior)", () => {
  const s = boot({ fireMode: 'turn' });
  s.loadLevel(1); // level 2: startBalls 5
  openField(s);
  fire(s);
  stepUntil(s, turnOver);
  const snap = s.snapshot();
  expect(snap.volley.emitted).toBe(5);
  expect(snap.shots.used).toBe(1);
  expect(snap.fireMode).toBe('turn');
});

test("'turn' is pinned: it survives loadLevel and RESTART", () => {
  const s = boot({ fireMode: 'turn' });
  s.loadLevel(1);
  s.dispatch({ type: 'RESTART' });
  s.loadLevel(2);
  expect(s.snapshot().fireMode).toBe('turn');
});

test('setFireMode accepts 1, 2, 3 and turn; a real mode unpins and resets to 1 on the next load', () => {
  const s = boot({ fireMode: 'turn' });
  for (const v of [1, 2, 3, 'turn']) {
    s.setFireMode(v);
    expect(s.snapshot().fireMode).toBe(v);
  }
  s.setFireMode(3);
  s.loadLevel(1);
  expect(s.snapshot().fireMode).toBe(1);
  expect(() => s.setFireMode(4)).toThrow();
  expect(() => s.setFireMode('2')).toThrow();
});

test("'turn' is unreachable from game input: no key maps to it and SET_MODE turn is ignored", () => {
  const keys = [...'abcdefghijklmnopqrstuvwxyz0123456789', ' ', 'Enter', 'Escape', 'Tab', 'Shift'];
  const actions = keys.map((key) => mapEvent({ type: 'keydown', key, repeat: false })).filter(Boolean);
  expect(actions.some((a) => a.v === 'turn' || a.mode === 'turn')).toBe(false);
  const s = boot({ fireMode: 1 });
  s.dispatch({ type: 'SET_MODE', v: 'turn' });
  expect(s.snapshot().fireMode).toBe(1);
});
