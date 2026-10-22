import { test, expect } from '@playwright/test';
import { allows, mapEvent } from '../../src/js/system/Input.js';

const key = (k, extra = {}) => ({ type: 'keydown', key: k, ...extra });

test.describe('Input.mapEvent (DOM-free event -> action)', () => {
  test('mousemove -> AIM with coordinates', () => {
    expect(mapEvent({ type: 'mousemove', x: 120, y: 340 })).toEqual({ type: 'AIM', x: 120, y: 340 });
  });

  test('left mousedown -> pointer FIRE; Space -> keyboard FIRE', () => {
    expect(mapEvent({ type: 'mousedown', button: 0 })).toEqual({ type: 'FIRE', pointer: true });
    expect(mapEvent(key(' '))).toEqual({ type: 'FIRE' });
    expect(mapEvent(key('Space'))).toEqual({ type: 'FIRE' });
  });

  const keys = [
    ['1', { type: 'SET_SPEED', v: 1 }],
    ['2', { type: 'SET_SPEED', v: 2 }],
    ['4', { type: 'SET_SPEED', v: 4 }],
    ['p', { type: 'PAUSE' }],
    ['P', { type: 'PAUSE' }],
    ['r', { type: 'RESTART' }],
    ['R', { type: 'RESTART' }],
    ['Enter', { type: 'CONFIRM' }],
    ['n', { type: 'SKIP' }],
    ['N', { type: 'SKIP' }],
  ];
  for (const [k, action] of keys) {
    test(`key ${k} -> ${action.type}`, () => expect(mapEvent(key(k))).toEqual(action));
  }

  test('R, P and N ignore key auto-repeat; speed keys do not', () => {
    expect(mapEvent(key('r', { repeat: true }))).toBeNull();
    expect(mapEvent(key('P', { repeat: true }))).toBeNull();
    expect(mapEvent(key('n', { repeat: true }))).toBeNull();
    expect(mapEvent(key('4', { repeat: true }))).toEqual({ type: 'SET_SPEED', v: 4 });
  });

  test('right-click, middle click, Esc and unknown keys are inert', () => {
    expect(mapEvent({ type: 'mousedown', button: 2 })).toBeNull();
    expect(mapEvent({ type: 'mousedown', button: 1 })).toBeNull();
    expect(mapEvent(key('Escape'))).toBeNull();
    expect(mapEvent(key('x'))).toBeNull();
    expect(mapEvent({ type: 'contextmenu' })).toBeNull();
  });
});

const ACTIONS = {
  AIM: { type: 'AIM', x: 1, y: 1 },
  FIRE: { type: 'FIRE' },
  CLICK: { type: 'FIRE', pointer: true },
  SPEED: { type: 'SET_SPEED', v: 2 },
  PAUSE: { type: 'PAUSE' },
  RESTART: { type: 'RESTART' },
  NEXT: { type: 'NEXT' },
  CONFIRM: { type: 'CONFIRM' },
  PRESS: { type: 'PRESS', target: 'RESTART' },
  SKIP: { type: 'SKIP' },
};
const accepted = (state, paused = false) =>
  Object.keys(ACTIONS).filter((name) => allows(state, paused, ACTIONS[name]));

test.describe('Input.allows (state gating)', () => {
  test('Loading ignores every action', () => expect(accepted('Loading')).toEqual([]));

  test('Title acts only on a pointer FIRE (click), not Space or keys', () => {
    expect(accepted('Title')).toEqual(['CLICK']);
  });

  const table = {
    Aiming: ['AIM', 'FIRE', 'CLICK', 'PAUSE', 'RESTART', 'SKIP'],
    Firing: ['SPEED', 'PAUSE', 'RESTART', 'SKIP'],
    Simulating: ['SPEED', 'PAUSE', 'RESTART', 'SKIP'],
    Resolving: ['RESTART', 'SKIP'],
    Victory: ['RESTART', 'NEXT', 'CONFIRM', 'PRESS'], // HU-12 D-12.4: no skip on victory
    GameOver: ['RESTART', 'CONFIRM', 'PRESS', 'SKIP'],
  };
  for (const [state, expected] of Object.entries(table)) {
    test(`${state} accepts exactly ${expected.join(', ')}`, () => {
      expect(accepted(state)).toEqual(expected);
    });
  }

  test('while paused only PAUSE, RESTART and SKIP act', () => {
    for (const state of ['Aiming', 'Firing', 'Simulating']) {
      expect(accepted(state, true), state).toEqual(['PAUSE', 'RESTART', 'SKIP']);
    }
  });

  test('SET_SPEED accepts only 1, 2 or 4', () => {
    expect(allows('Firing', false, { type: 'SET_SPEED', v: 4 })).toBe(true);
    expect(allows('Firing', false, { type: 'SET_SPEED', v: 3 })).toBe(false);
  });
});
