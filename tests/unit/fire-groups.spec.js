// HU-11 fire groups: openspec change anglecraft-v1-launcher-and-fire-mode, volley-economy delta (shot = turn
// counted at Resolving, group sizes, relocation per group, orbs for following turns) and game-state delta
// (group end -> Aiming, fire mode, cap per group). Titles carry the QA case IDs.
import { test, expect } from '@playwright/test';
import { boot, openField, stepUntil, turnOver } from './helpers/session.js';
import { mapEvent } from '../../src/js/system/Input.js';

const UP = { type: 'AIM', x: 540, y: 300 };
const SLANT = { type: 'AIM', x: 330, y: 300 };

// Level 2 (startBalls 5, shots 12) on an open field, in a real fire mode.
function level2(mode = 1, extra = []) {
  const s = boot({ fireMode: mode });
  s.loadLevel(1);
  openField(s, extra);
  if (mode !== 1) s.setFireMode(mode);
  return s;
}
// One FIRE, then step until the group (or the turn) is over.
function group(s, aim = UP) {
  const before = s.snapshot().volley.emitted;
  s.dispatch(aim);
  s.dispatch({ type: 'FIRE' });
  stepUntil(s, turnOver);
  const after = s.snapshot();
  return { fired: (after.volley.emitted || after.volley.size) - before, state: after.state, snap: after };
}
const drain = (s) => {
  const out = [];
  s.drainEvents((type, a) => out.push([type, a]));
  return out;
};

test('CP-19 the fire mode is 1 on start, after R and on the next level', () => {
  const s = boot({ fireMode: 1 });
  expect(s.snapshot().fireMode).toBe(1);
  s.dispatch({ type: 'CYCLE_MODE' });
  s.dispatch({ type: 'CYCLE_MODE' });
  expect(s.snapshot().fireMode).toBe(3);
  s.dispatch({ type: 'RESTART' });
  expect(s.snapshot().fireMode).toBe(1);
  s.dispatch({ type: 'SET_MODE', v: 2 });
  s.loadLevel(1);
  expect(s.snapshot().fireMode).toBe(1);
});

for (const [mode, fired, left] of [[1, 1, 4], [2, 2, 3], [3, 3, 2]]) {
  test(`CP-20 mode ${mode}: one FIRE emits exactly ${fired} ball(s) and leaves ${left} to fire`, () => {
    const s = level2(mode);
    s.dispatch(UP);
    s.dispatch({ type: 'FIRE' });
    stepUntil(s, (snap) => snap.state !== 'Firing');
    expect(s.snapshot().volley.emitted).toBe(fired);
    stepUntil(s, turnOver);
    expect(s.snapshot().volley).toMatchObject({ size: 5, emitted: fired, active: 0 });
    expect(s.snapshot().state).toBe('Aiming');
  });
}

test('CP-21 when a group lands with balls left, the game returns to Aiming without spending a shot', () => {
  const s = level2(2);
  const g = group(s);
  expect(g.state).toBe('Aiming');
  expect(g.snap.shots).toMatchObject({ used: 0, left: 12 });
  expect(g.snap.volley.emitted).toBe(2);
});

test('CP-24 the shot is counted when the last ball of the turn lands', () => {
  const s = level2(1);
  for (let i = 0; i < 4; i++) group(s);
  expect(s.snapshot().shots.used).toBe(0);
  group(s);
  expect(s.snapshot()).toMatchObject({ state: 'Aiming', shots: { used: 1 }, volley: { size: 5, emitted: 0 } });
});

test('CP-25 GameOver only after the last ball of the last turn', () => {
  const s = level2(2);
  s.board.shots = 1;
  expect(group(s).state).toBe('Aiming');
  expect(group(s).state).toBe('Aiming');
  expect(group(s).state).toBe('GameOver');
});

test('CP-26 a group is limited by the balls left: mode 3 fires 3 then 2; mode 2 fires 2, 2, 1', () => {
  const s3 = level2(3);
  expect([group(s3).fired, group(s3).fired]).toEqual([3, 2]);
  expect(s3.snapshot().shots.used).toBe(1);
  const s2 = level2(2);
  expect([group(s2).fired, group(s2).fired, group(s2).fired]).toEqual([2, 2, 1]);
});

test('CP-27 a group that destroys the last core wins at once; the remaining balls are never fired', () => {
  const s = level2(1);
  s.board.cores[0].hp = 0;
  const g = group(s);
  expect(g.state).toBe('Victory');
  expect(g.snap.result).toMatchObject({ stars: 3, shots: 1 });
});

test('CP-01 CP-22 the launcher relocates after each group to where its first ball landed', () => {
  const single = level2(1);
  group(single, SLANT);
  const v1 = level2('turn');
  group(v1, SLANT); // the same first ball, fired as part of the whole volley
  expect(single.snapshot().launcherX).not.toBe(540);
  expect(single.snapshot().launcherX).toBeCloseTo(v1.snapshot().launcherX, 6);
  single.dispatch({ type: 'MOVE_START', dir: -1 });
  single.dispatch({ type: 'MOVE_STOP', dir: -1 });
  const moved = single.snapshot().launcherX;
  single.dispatch(UP);
  single.dispatch({ type: 'FIRE' });
  expect(single.snapshot().balls[0].x).toBeCloseTo(moved, 6);
});

test('CP-23 an orb captured mid-turn grows only the following turns', () => {
  const s = level2(1, [{ type: 'multiplier', col: 4, row: 5, value: 2 }]);
  group(s); // straight up through the orb
  expect(s.snapshot().pendingBonus).toBe(2);
  for (let i = 0; i < 4; i++) group(s);
  expect(s.snapshot()).toMatchObject({ shots: { used: 1 }, volley: { size: 7, emitted: 0 } });
});

test('a group capped at 45 s ends the group, keeps the launcher and returns to Aiming', () => {
  const s = boot({ fireMode: 1, volleyCapS: 0.05 });
  s.loadLevel(1);
  openField(s);
  const g = group(s, SLANT);
  expect(g.state).toBe('Aiming');
  expect(g.snap.launcherX).toBe(540);
  expect(g.snap.volley.emitted).toBe(1);
});

test('CP-28 M cycles 1 -> 2 -> 3 -> 1 and emits a UI click; auto-repeat of M is ignored', () => {
  const s = level2(1);
  drain(s);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    s.dispatch({ type: 'CYCLE_MODE' });
    seen.push(s.snapshot().fireMode);
  }
  expect(seen).toEqual([2, 3, 1]);
  expect(drain(s).filter(([t]) => t === 'UI_CLICK').length).toBe(3);
  expect(mapEvent({ type: 'keydown', key: 'm', repeat: true })).toBeNull();
});

test('CP-30 the mode cannot change with a group in flight or while paused', () => {
  const s = level2(2);
  s.dispatch(UP);
  s.dispatch({ type: 'FIRE' });
  s.dispatch({ type: 'CYCLE_MODE' });
  s.dispatch({ type: 'SET_MODE', v: 1 });
  expect(s.snapshot().fireMode).toBe(2);
  stepUntil(s, turnOver);
  s.dispatch({ type: 'PAUSE' });
  s.dispatch({ type: 'SET_MODE', v: 3 });
  expect(s.snapshot().fireMode).toBe(2);
});

test('CP-32 speed keys change the speed, never the mode', () => {
  const s = level2(3);
  s.dispatch(UP);
  s.dispatch({ type: 'FIRE' });
  s.dispatch(mapEvent({ type: 'keydown', key: '2' }));
  expect(s.snapshot()).toMatchObject({ speed: 2, fireMode: 3 });
  stepUntil(s, turnOver);
  expect(mapEvent({ type: 'keydown', key: '1' })).toEqual({ type: 'SET_SPEED', v: 1 });
  expect(s.snapshot().fireMode).toBe(3);
});

test('CP-31 the same shots give the same stars and score rule in mode 1 and mode 3', () => {
  const win = (mode) => {
    const s = level2(mode);
    s.board.cores[0].hp = 0;
    return group(s).snap.result;
  };
  expect(win(1)).toEqual(win(3));
});

test('SET_MODE accepts only 1, 2 and 3', () => {
  const s = level2(1);
  for (const v of [0, 4, 'turn', '2']) s.dispatch({ type: 'SET_MODE', v });
  expect(s.snapshot().fireMode).toBe(1);
  s.dispatch({ type: 'SET_MODE', v: 3 });
  expect(s.snapshot().fireMode).toBe(3);
});
