import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { EventRing, RING_CAPACITY } from '../../src/js/system/EventRing.js';
import { createSession } from '../../src/js/system/GameSession.js';
import { Rng } from '../../src/js/system/Rng.js';
import { STEP } from '../../src/js/system/Layout.js';

const drainAll = (ring) => {
  const out = [];
  ring.drain((type, a, b) => out.push([type, a, b]));
  return out;
};

test.describe('EventRing (D2)', () => {
  test('drains events in push order, then is empty', () => {
    const ring = new EventRing();
    ring.push('A', 1, 2);
    ring.push('B', 3);
    expect(drainAll(ring)).toEqual([
      ['A', 1, 2],
      ['B', 3, 0],
    ]);
    expect(ring.length).toBe(0);
    expect(drainAll(ring)).toEqual([]);
  });

  test('capacity is 1024 and exactly-full does not overflow', () => {
    const ring = new EventRing();
    for (let i = 0; i < RING_CAPACITY; i++) ring.push('E', i);
    expect(RING_CAPACITY).toBe(1024);
    expect(ring.length).toBe(1024);
    expect(ring.overflow).toBe(0);
  });

  test('overflow overwrites the oldest events and counts each drop', () => {
    const ring = new EventRing();
    for (let i = 0; i < RING_CAPACITY + 6; i++) ring.push('E', i);
    expect(ring.overflow).toBe(6);
    const events = drainAll(ring);
    expect(events).toHaveLength(RING_CAPACITY);
    expect(events[0][1]).toBe(6); // 0..5 were overwritten
    expect(events[RING_CAPACITY - 1][1]).toBe(RING_CAPACITY + 5);
  });

  test('wraps correctly across a drain and keeps the overflow counter', () => {
    const ring = new EventRing();
    for (let i = 0; i < 1000; i++) ring.push('E', i);
    drainAll(ring);
    for (let i = 0; i < 30; i++) ring.push('F', i);
    expect(drainAll(ring).map((e) => e[1])).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(ring.overflow).toBe(0);
  });
});

const level = (n) =>
  JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8'));
const LEVELS = [level(1), level(2), level(3)];
const CLICK = { type: 'FIRE', pointer: true };
const AIM_UP = { type: 'AIM', x: 540, y: 300 };

function makeSession(opts = {}) {
  const calls = [];
  const audio = { unlock: () => calls.push('unlock'), music: (on) => calls.push(`music:${on}`) };
  const session = createSession({ rng: new Rng(7), audio, fireMode: 'turn', ...opts });
  session.calls = calls;
  session.setLevels(LEVELS);
  return session;
}
// Boots to Title (assets settled) and optionally clicks into Aiming on level 1.
function boot({ click = true, ...opts } = {}) {
  const s = makeSession(opts);
  s.setLoadProgress(3, 3);
  if (click) s.dispatch(CLICK);
  return s;
}
// Forces a gameplay state through the FSM (turn simulation arrives with the volley economy).
const force = (s, ...path) => path.forEach((st) => s.fsm.transition(st));

test.describe('GameSession boot (HU-09)', () => {
  test('starts in Loading with progress 0/0', () => {
    const snap = makeSession().snapshot();
    expect(snap.state).toBe('Loading');
    expect(snap.loading).toEqual({ done: 0, total: 0 });
    expect(snap.paused).toBe(false);
  });

  test('setLoadProgress moves Loading -> Title only when done == total', () => {
    const s = makeSession();
    s.setLoadProgress(2, 3);
    expect(s.snapshot().state).toBe('Loading');
    expect(s.snapshot().loading).toEqual({ done: 2, total: 3 });
    s.setLoadProgress(3, 3);
    expect(s.snapshot().state).toBe('Title');
  });

  test('loadLevel in Loading throws and loads nothing', () => {
    const s = makeSession();
    expect(() => s.loadLevel(0)).toThrow(/illegal transition/i);
    expect(s.snapshot().state).toBe('Loading');
    expect(s.snapshot().blocks).toEqual([]);
  });

  test('Title click unlocks audio, starts music and enters Aiming on level 1', () => {
    const s = boot({ click: false });
    s.dispatch({ type: 'FIRE' }); // Space is not a click
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().state).toBe('Title');
    s.dispatch(CLICK);
    const snap = s.snapshot();
    expect(snap.state).toBe('Aiming');
    expect(snap.level).toEqual({ index: 0, id: 'level-01' });
    expect(s.calls).toEqual(['unlock', 'music:true']);
  });

  test('loadLevel from Title is a legal Title -> Aiming transition', () => {
    const s = boot({ click: false });
    s.loadLevel(2);
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().level.id).toBe('level-03');
  });

  test('Loading drops every action', () => {
    const s = makeSession();
    for (const a of [CLICK, AIM_UP, { type: 'FIRE' }, { type: 'SET_SPEED', v: 4 }, { type: 'RESTART' }, { type: 'PAUSE' }]) {
      s.dispatch(a);
    }
    expect(s.snapshot().state).toBe('Loading');
    expect(s.snapshot().paused).toBe(false);
    expect(s.calls).toEqual([]);
    s.setLoadProgress(1, 1);
    expect(s.snapshot().state).toBe('Title'); // the dropped click was never queued
  });
});

test.describe('GameSession level state', () => {
  test('level 1 start values', () => {
    const snap = boot().snapshot();
    expect(snap.shots).toEqual({ used: 0, left: 10, max: 10 });
    expect(snap.volley).toEqual({ size: 3, emitted: 0, active: 0 });
    expect(snap.launcherX).toBe(540);
    expect(snap.speed).toBe(1);
    expect(snap.cores).toBe(1);
    expect(snap.score).toBe(0);
    expect(snap.blocks.find((b) => b.type === 'core')).toEqual({ col: 4, row: 1, type: 'core', hp: 100 });
  });

  test('a failed loadLevel keeps the old level (atomic)', () => {
    const s = boot();
    const before = JSON.stringify(s.snapshot());
    expect(() => s.loadLevel({ ...LEVELS[0], blocks: [] })).toThrow();
    expect(() => s.loadLevel(99)).toThrow();
    expect(JSON.stringify(s.snapshot())).toBe(before);
  });

  test('setLevels rejects an invalid set and keeps the previous one', () => {
    const s = boot();
    expect(() => s.setLevels([{ ...LEVELS[0], blocks: [] }])).toThrow();
    s.loadLevel(1);
    expect(s.snapshot().level.id).toBe('level-02');
  });

  test('AIM acts only in Aiming and stores a unit direction', () => {
    const s = boot();
    s.dispatch(AIM_UP);
    const aim = s.snapshot().aim;
    expect(aim.x).toBeCloseTo(0, 6);
    expect(aim.y).toBeCloseTo(-1, 6);
    s.dispatch({ type: 'AIM', x: 740, y: 756 });
    expect(s.snapshot().aim.x).toBeCloseTo(0.7071, 3);
  });

  test('FIRE without a valid aim is ignored', () => {
    const s = boot();
    s.dispatch({ type: 'FIRE' });
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().shots.used).toBe(0);
  });

  test('FIRE locks the direction and enters Firing; the shot is counted when the turn resolves', () => {
    const s = boot();
    s.dispatch({ type: 'AIM', x: 740, y: 756 });
    const aimed = { ...s.snapshot().aim };
    s.dispatch({ type: 'FIRE' });
    s.dispatch({ type: 'AIM', x: 100, y: 100 }); // ignored while Firing
    const snap = s.snapshot();
    expect(snap.state).toBe('Firing');
    expect(snap.shots).toEqual({ used: 0, left: 10, max: 10 }); // HU-11: counted at Resolving
    expect(snap.aim).toEqual(aimed);
    expect(snap.lockedDir).toEqual(aimed);
  });

  test('step advances time only in playing states', () => {
    const s = boot({ click: false });
    s.step(STEP);
    expect(s.snapshot().playTime).toBe(0); // Title
    s.dispatch(CLICK);
    s.step(STEP);
    expect(s.snapshot().playTime).toBeCloseTo(STEP, 9);
    expect(s.snapshot().simTime).toBe(0); // Aiming: no simulation time
    s.dispatch(AIM_UP);
    s.dispatch({ type: 'FIRE' });
    s.dispatch({ type: 'SET_SPEED', v: 4 });
    s.step(STEP);
    expect(s.snapshot().simTime).toBeCloseTo(4 * STEP, 9);
    expect(s.snapshot().volleySimTime).toBeCloseTo(4 * STEP, 9);
  });

  test('ring overflow is reported and never changes game state', () => {
    const s = boot();
    s.dispatch(AIM_UP);
    const before = JSON.stringify({ ...s.snapshot(), eventOverflow: 0 });
    for (let i = 0; i < 1030; i++) s.events.push('NOISE', i);
    const snap = s.snapshot();
    expect(snap.eventOverflow).toBeGreaterThan(0);
    expect(JSON.stringify({ ...snap, eventOverflow: 0 })).toBe(before);
    let drained = 0;
    s.drainEvents(() => drained++);
    expect(drained).toBe(1024);
  });
});

const firing = () => {
  const s = boot();
  s.dispatch(AIM_UP);
  s.dispatch({ type: 'FIRE' });
  return s;
};

test.describe('GameSession speed', () => {
  test('SET_SPEED acts in Firing and Simulating, not in Aiming', () => {
    const s = boot();
    s.dispatch({ type: 'SET_SPEED', v: 2 });
    expect(s.snapshot().speed).toBe(1);
    s.dispatch(AIM_UP);
    s.dispatch({ type: 'FIRE' });
    s.dispatch({ type: 'SET_SPEED', v: 2 });
    expect(s.snapshot().speed).toBe(2);
    force(s, 'Simulating');
    s.dispatch({ type: 'SET_SPEED', v: 4 });
    expect(s.snapshot().speed).toBe(4);
  });

  test('entering Aiming resets the speed to 1X', () => {
    const s = firing();
    s.dispatch({ type: 'SET_SPEED', v: 4 });
    force(s, 'Simulating', 'Resolving', 'Aiming');
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().speed).toBe(1);
  });
});

test.describe('GameSession pause', () => {
  test('PAUSE freezes time and only PAUSE/RESTART act; PAUSE again resumes', () => {
    const s = firing();
    s.dispatch({ type: 'SET_SPEED', v: 2 });
    s.step(STEP);
    const frozen = JSON.stringify(s.snapshot());
    s.dispatch({ type: 'PAUSE' });
    expect(s.snapshot().paused).toBe(true);
    for (let i = 0; i < 600; i++) s.step(STEP);
    s.dispatch({ type: 'SET_SPEED', v: 4 });
    s.dispatch({ type: 'AIM', x: 1, y: 1 });
    s.dispatch({ type: 'NEXT' });
    expect(JSON.stringify({ ...s.snapshot(), paused: false })).toBe(frozen);
    s.dispatch({ type: 'PAUSE' });
    expect(s.snapshot().paused).toBe(false);
    s.step(STEP);
    expect(s.snapshot().simTime).toBeCloseTo(4 * STEP, 9);
  });

  test('FIRE is ignored while paused in Aiming', () => {
    const s = boot();
    s.dispatch(AIM_UP);
    s.dispatch({ type: 'PAUSE' });
    s.dispatch({ type: 'FIRE' });
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().shots.used).toBe(0);
    s.dispatch({ type: 'PAUSE' });
    s.dispatch({ type: 'FIRE' });
    expect(s.snapshot().state).toBe('Firing');
  });

  for (const state of [['Resolving'], ['Resolving', 'Victory'], ['Resolving', 'GameOver']]) {
    test(`PAUSE is ignored in ${state.at(-1)}`, () => {
      const s = firing();
      force(s, 'Simulating', ...state);
      s.dispatch({ type: 'PAUSE' });
      expect(s.snapshot().paused).toBe(false);
    });
  }
});

test.describe('GameSession restart', () => {
  for (const path of [[], ['Simulating'], ['Simulating', 'Resolving'], ['Simulating', 'Resolving', 'GameOver']]) {
    test(`RESTART from ${path.at(-1) ?? 'Firing'} reloads the level into Aiming`, () => {
      const s = firing();
      s.dispatch({ type: 'SET_SPEED', v: 4 });
      s.step(STEP);
      force(s, ...path);
      s.dispatch({ type: 'RESTART' });
      const snap = s.snapshot();
      expect(snap.state).toBe('Aiming');
      expect(snap.shots.used).toBe(0);
      expect(snap.speed).toBe(1);
      expect(snap.simTime).toBe(0);
      expect(snap.lockedDir).toBeNull();
      expect(snap.blocks.find((b) => b.type === 'core').hp).toBe(100);
    });
  }

  test('RESTART restores damaged blocks and clears paused', () => {
    const s = boot();
    s.board.cores[0].hp = 7;
    expect(s.snapshot().blocks.find((b) => b.type === 'core').hp).toBe(7);
    s.dispatch({ type: 'PAUSE' });
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().paused).toBe(false);
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().blocks.find((b) => b.type === 'core').hp).toBe(100);
  });

  test('RESTART reloads the current level, not level 1', () => {
    const s = boot({ click: false });
    s.loadLevel(2);
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().level.id).toBe('level-03');
  });

  test('RESTART is ignored in Title and Loading', () => {
    const s = boot({ click: false });
    s.dispatch({ type: 'RESTART' });
    expect(s.snapshot().state).toBe('Title');
    expect(s.snapshot().level.index).toBeNull();
  });
});

test.describe('GameSession NEXT gating', () => {
  const victory = (opts) => {
    const s = boot(opts);
    s.dispatch(AIM_UP);
    s.dispatch({ type: 'FIRE' });
    force(s, 'Simulating', 'Resolving', 'Victory');
    return s;
  };

  test('NEXT loads the next level when it is unlocked', () => {
    const s = victory({ canAccess: (i) => i === 1 });
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().state).toBe('Aiming');
    expect(s.snapshot().level).toEqual({ index: 1, id: 'level-02' });
  });

  test('NEXT is ignored when locked', () => {
    const s = victory();
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().state).toBe('Victory');
  });

  test('NEXT is ignored past the last level', () => {
    const s = boot({ click: false, canAccess: () => true });
    s.loadLevel(2);
    s.dispatch(AIM_UP);
    s.dispatch({ type: 'FIRE' });
    force(s, 'Simulating', 'Resolving', 'Victory');
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().state).toBe('Victory');
    expect(s.snapshot().level.index).toBe(2);
  });

  test('NEXT is ignored outside Victory', () => {
    const s = boot({ canAccess: () => true });
    s.dispatch({ type: 'NEXT' });
    expect(s.snapshot().level.index).toBe(0);
  });
});
