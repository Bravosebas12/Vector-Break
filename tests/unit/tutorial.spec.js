// Tutorial hints model (openspec change anglecraft-v1-launcher-and-fire-mode, tutorial-hints capability).
// createTutorial() is session-scoped: once dismissed, a hint never returns until the page reloads.
import { test, expect } from '@playwright/test';
import { createTutorial } from '../../src/js/system/Tutorial.js';

// view(state, paused, levelIndex, launcherX) -> { kind, x }
const aiming = (t, level, x = 540) => ({ ...t.view('Aiming', false, level, x) });

test('CP-17 level 1 in Aiming shows the move hint next to the launcher; it follows the launcher', () => {
  const t = createTutorial();
  expect(aiming(t, 0)).toEqual({ kind: 'move', x: 540 });
  expect(aiming(t, 0, 600)).toEqual({ kind: 'move', x: 600 });
});

test('CP-17 the move hint is dismissed by the first launcher movement and never returns', () => {
  const t = createTutorial();
  aiming(t, 0);
  t.onEvent('LAUNCHER_MOVED');
  expect(aiming(t, 0).kind).toBeNull();
  expect(aiming(t, 0).kind).toBeNull(); // restart / replay
});

test('CP-18 the move hint is dismissed by the first FIRE', () => {
  const t = createTutorial();
  aiming(t, 0);
  t.onEvent('FIRE');
  expect(aiming(t, 0).kind).toBeNull();
});

test('CP-34 level 2 shows the mode hint; a mode change dismisses it for the session', () => {
  const t = createTutorial();
  expect(aiming(t, 1).kind).toBe('mode');
  t.onEvent('MODE');
  expect(aiming(t, 1).kind).toBeNull();
});

test('CP-35 the mode hint is dismissed by the first FIRE', () => {
  const t = createTutorial();
  aiming(t, 1);
  t.onEvent('FIRE');
  expect(aiming(t, 1).kind).toBeNull();
});

test('each hint belongs to its level: no mode hint on level 1, no move hint on level 2, none on levels 3-6', () => {
  const t = createTutorial();
  expect(aiming(t, 0).kind).toBe('move');
  expect(aiming(t, 1).kind).toBe('mode');
  for (const level of [2, 3, 4, 5]) expect(aiming(t, level).kind).toBeNull();
});

test('events only dismiss the hint on screen: moving on level 2 keeps the move hint for level 1', () => {
  const t = createTutorial();
  aiming(t, 1); // mode hint showing
  t.onEvent('LAUNCHER_MOVED');
  expect(aiming(t, 0).kind).toBe('move');
  expect(aiming(t, 1).kind).toBe('mode');
});

test('hidden while paused, in flight or on a result modal, without being dismissed', () => {
  const t = createTutorial();
  for (const [state, paused] of [['Aiming', true], ['Firing', false], ['Simulating', false], ['Victory', false], ['GameOver', false], ['Title', false]])
    expect(t.view(state, paused, 0, 540).kind).toBeNull();
  t.onEvent('FIRE'); // no hint on screen: nothing to dismiss
  expect(aiming(t, 0).kind).toBe('move');
});

test('view() reuses one object (no per-frame allocation)', () => {
  const t = createTutorial();
  expect(t.view('Aiming', false, 0, 540)).toBe(t.view('Aiming', false, 0, 600));
});
