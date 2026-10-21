// Progression: openspec progression spec "Star rating", "Score", "Unlock", "Chain and end", record replace rule (D4).
import { test, expect } from '@playwright/test';
import { starRating, scoreOf, isBetter, createProgression } from '../../src/js/system/Progression.js';
import { boot, openField, fire, stepUntil } from './helpers/session.js';

const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
};

test.describe('starRating (A1)', () => {
  test('1 shot is 3 stars, <= floor(N/2) is 2, otherwise 1', () => {
    expect([starRating(1, 10), starRating(5, 10), starRating(6, 10)]).toEqual([3, 2, 1]);
  });

  test('odd limit uses the floor', () => {
    expect([starRating(3, 7), starRating(4, 7)]).toEqual([2, 1]);
  });
});

test.describe('scoreOf (A5/P1)', () => {
  test('damage plus 100 per unused shot', () => {
    expect(scoreOf(150, 4)).toBe(550);
    expect(scoreOf(150, 0)).toBe(150);
  });
});

test.describe('isBetter (D4: stars desc, score desc, shots asc)', () => {
  const a = { stars: 2, score: 700, shots: 4 };
  test('stars dominate, then score, then fewer shots', () => {
    expect(isBetter({ ...a, stars: 3, score: 1 }, a)).toBe(true);
    expect(isBetter({ ...a, stars: 1, score: 9999 }, a)).toBe(false);
    expect(isBetter({ ...a, score: 800 }, a)).toBe(true);
    expect(isBetter({ ...a, score: 600 }, a)).toBe(false);
    expect(isBetter({ ...a, shots: 3 }, a)).toBe(true);
    expect(isBetter({ ...a, shots: 5 }, a)).toBe(false);
  });

  test('an identical record is not better', () => expect(isBetter(a, { ...a })).toBe(false));
});

test.describe('createProgression records and unlock', () => {
  test('first record is stored and a worse run keeps the better one', () => {
    const p = createProgression({ storage: memory() });
    expect(p.record(0)).toBeNull();
    p.submit(0, { stars: 2, score: 700, shots: 4 });
    expect(p.record(0)).toEqual({ stars: 2, score: 700, shots: 4 });
    p.submit(0, { stars: 1, score: 900, shots: 9 });
    expect(p.record(0)).toEqual({ stars: 2, score: 700, shots: 4 });
    p.submit(0, { stars: 3, score: 600, shots: 1 });
    expect(p.record(0)).toEqual({ stars: 3, score: 600, shots: 1 });
  });

  test('level 1 is open; N+1 unlocks only after N is won in this session', () => {
    const p = createProgression({ storage: memory() });
    expect([p.canAccess(0), p.canAccess(1)]).toEqual([true, false]);
    p.submit(0, { stars: 1, score: 1, shots: 3 });
    expect([p.canAccess(1), p.canAccess(2)]).toEqual([true, false]);
    p.submit(4, { stars: 1, score: 1, shots: 3 });
    expect(p.canAccess(5)).toBe(true);
  });

  test('stored records do not unlock levels in a new session (D1)', () => {
    const storage = memory();
    createProgression({ storage }).submit(0, { stars: 3, score: 1, shots: 1 });
    const next = createProgression({ storage });
    expect(next.record(0)).toEqual({ stars: 3, score: 1, shots: 1 });
    expect([next.canAccess(0), next.canAccess(1)]).toEqual([true, false]);
  });
});

test.describe('session wiring (NEXT gating, end of content)', () => {
  const win = (s, level) => {
    s.loadLevel(level);
    openField(s).setVolley(1);
    s.board.cores[0].hp = 0;
    fire(s);
    stepUntil(s, (snap) => snap.state === 'Victory');
  };

  test('a win records the result and unlocks NEXT', () => {
    const progression = createProgression({ storage: memory() });
    const s = boot({ progression });
    win(s, 0);
    expect(progression.record(0)).toEqual(s.snapshot().result);
    expect(progression.record(0).stars).toBe(3);
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().level.index).toBe(1);
  });

  test('NEXT stays locked without a win and a defeat records nothing', () => {
    const progression = createProgression({ storage: memory() });
    const s = boot({ progression });
    s.loadLevel(0);
    openField(s).setVolley(1);
    for (let i = 0; i < s.snapshot().shots.max; i++) {
      fire(s);
      stepUntil(s, (snap) => snap.state !== 'Firing' && snap.state !== 'Simulating' && snap.state !== 'Resolving');
    }
    expect(s.snapshot().state).toBe('GameOver');
    expect(progression.record(0)).toBeNull();
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().state).toBe('GameOver');
  });

  test('the last level offers no next even after a win', () => {
    const progression = createProgression({ storage: memory() });
    const s = boot({ progression });
    win(s, 2);
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().state).toBe('Victory');
    expect(progression.canAccess(3)).toBe(true); // unlocked but nonexistent: the catalog bound still holds
  });

  test('Enter (CONFIRM) advances after a win, restarts on the last level', () => {
    const s = boot({ progression: createProgression({ storage: memory() }) });
    win(s, 0);
    s.dispatch({ type: 'CONFIRM' });
    expect(s.snapshot().level.index).toBe(1);
    win(s, 2);
    s.dispatch({ type: 'CONFIRM' });
    expect(s.snapshot()).toMatchObject({ state: 'Aiming', level: { index: 2 } });
  });
});
