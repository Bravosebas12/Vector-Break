// HU-12 skip level: openspec change anglecraft-v1-skip-level, game-state delta "Skip level" and progression delta
// "Skip without classification". The unit catalog has 3 levels (index 2 is the last). Titles carry the QA case IDs
// (Design/casos/hu-12-casos-de-prueba.md).
import { test, expect } from '@playwright/test';
import { createSession } from '../../src/js/system/GameSession.js';
import { createProgression } from '../../src/js/system/Progression.js';
import { Rng } from '../../src/js/system/Rng.js';
import { LEVELS, boot, openField, fire, stepUntil, turnOver } from './helpers/session.js';

const SKIP = { type: 'SKIP' };
const memory = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};
const drain = (s) => {
  const out = [];
  s.drainEvents((type, a) => out.push([type, a]));
  return out;
};
const types = (events) => events.map(([type]) => type);

// Fire-mode-1 session on level `index` with a real progression.
function play(index, progression = createProgression({ storage: memory() })) {
  const s = boot({ fireMode: 1, progression });
  s.loadLevel(index);
  drain(s);
  return { s, progression };
}
function lose(s) {
  openField(s).setVolley(1);
  for (let i = 0; s.snapshot().state !== 'GameOver' && i < 20; i++) {
    fire(s);
    stepUntil(s, turnOver);
  }
  expect(s.snapshot().state).toBe('GameOver');
}
function win(s) {
  openField(s).setVolley(1);
  s.board.cores[0].hp = 0;
  fire(s);
  stepUntil(s, (snap) => snap.state === 'Victory');
}

test('CP-45 N in Aiming loads the next level with its initial values', () => {
  const { s } = play(1);
  openField(s).setVolley(1);
  for (let i = 0; i < 3; i++) {
    fire(s);
    stepUntil(s, turnOver);
  }
  s.setLauncherX(300);
  s.dispatch({ type: 'SET_MODE', v: 2 });
  expect(s.snapshot()).toMatchObject({ shots: { used: 3 }, launcherX: 300, fireMode: 2 });
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({
    state: 'Aiming',
    level: { index: 2 },
    shots: { used: 0, max: LEVELS[2].shots },
    volley: { size: LEVELS[2].startBalls },
    launcherX: 540,
    fireMode: 1,
  });
});

test('CP-46 N with balls in flight removes them and loads the next level', () => {
  const { s } = play(1);
  fire(s);
  stepUntil(s, (snap) => snap.state === 'Simulating' && snap.volley.active > 0);
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 2 }, balls: [] });
});

test('CP-47 N while paused skips and clears the pause', () => {
  const { s } = play(1);
  s.dispatch({ type: 'PAUSE' });
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 2 }, paused: false });
});

test('CP-49 N on the defeat loads the next level', () => {
  const { s } = play(1);
  lose(s);
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 2 } });
});

test('PRESS SKIP from the defeat modal: click, skip and a single confirm sound', () => {
  const { s } = play(1);
  lose(s);
  drain(s);
  s.dispatch({ type: 'PRESS', target: 'SKIP' });
  const kinds = types(drain(s));
  expect(s.snapshot().level.index).toBe(2);
  expect(kinds).toContain('UI_CLICK');
  expect(kinds.filter((t) => t === 'SKIP' || t === 'UI_CONFIRM')).toEqual(['SKIP']);
});

test('CP-50 skipping does not classify: no record, stars, victory or turns events', () => {
  const { s, progression } = play(1);
  openField(s).setVolley(1);
  fire(s);
  stepUntil(s, turnOver);
  drain(s);
  s.dispatch(SKIP);
  const events = drain(s);
  expect(progression.record(1)).toBeNull();
  expect(progression.status(1)).toBe('unsolved');
  expect(types(events)).not.toContain('STARS');
  expect(types(events)).not.toContain('TURNS');
  expect(events.filter(([t, a]) => t === 'STATE' && a !== 2)).toEqual([]);
  expect(events).toContainEqual(['SKIP', 1]);
});

test('CP-51 skipping a solved level keeps its record and status', () => {
  const progression = createProgression({ storage: memory() });
  progression.submit(1, { stars: 2, score: 900, shots: 5 });
  const { s } = play(1, progression);
  s.dispatch(SKIP);
  expect(progression.record(1)).toEqual({ stars: 2, score: 900, shots: 5 });
  expect(progression.status(1)).toBe('resolved');
});

test('CP-52 on the last level skipping does nothing, in play and on the defeat', () => {
  const { s, progression } = play(2);
  const before = s.snapshot();
  s.dispatch(SKIP);
  expect(s.snapshot()).toEqual(before);
  expect(drain(s)).toEqual([]);
  lose(s);
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ state: 'GameOver', level: { index: 2 } });
  expect(progression.status(2)).toBe('unplayed');
});

test('CP-54 N is ignored while loading and on the title screen', () => {
  const s = createSession({ rng: new Rng(1), fireMode: 1 });
  s.setLevels(LEVELS);
  s.dispatch(SKIP);
  expect(s.snapshot().state).toBe('Loading');
  s.setLoadProgress(1, 1);
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ state: 'Title', level: { index: null } });
});

test('CP-56 N does nothing on the victory (Siguiente nivel classifies instead)', () => {
  const { s } = play(1);
  win(s);
  s.dispatch(SKIP);
  s.dispatch({ type: 'PRESS', target: 'SKIP' });
  expect(s.snapshot()).toMatchObject({ state: 'Victory', level: { index: 1 } });
});

test('CP-57 no action loads a previous level after a skip', () => {
  const { s } = play(0);
  s.dispatch(SKIP);
  const actions = [
    { type: 'RESTART' },
    { type: 'NEXT' },
    { type: 'CONFIRM' },
    { type: 'PRESS', target: 'RESTART' },
    { type: 'PRESS', target: 'NEXT' },
    { type: 'CYCLE_MODE' },
    { type: 'PAUSE' },
    { type: 'PAUSE' },
  ];
  for (const a of actions) {
    s.dispatch(a);
    expect(s.snapshot().level.index, a.type).toBeGreaterThanOrEqual(1);
  }
});

test('CP-58 after a skip the launcher starts at the level start and Siguiente nivel still needs a win', () => {
  const { s, progression } = play(0);
  s.setLauncherX(300);
  s.dispatch(SKIP);
  expect(s.snapshot()).toMatchObject({ level: { index: 1 }, launcherX: 540 }); // HU-14 AC4 (CP-40 skip path)
  expect(progression.canAccess(1)).toBe(false); // a skip is not a win of level 1
  win(s);
  s.dispatch({ type: 'NEXT' });
  expect(s.snapshot().level.index).toBe(2);
  expect(progression.record(0)).toBeNull();
});
