// Volley economy: .claude/skills/game-loop-state-manager/SKILL.md (turn flow)
import { test, expect } from '@playwright/test';
import { STEP, EMIT_INTERVAL } from '../../src/js/system/Layout.js';
import { boot, openField, fire, stepUntil, turnOver, LEVELS } from './helpers/session.js';

const states = (s) => {
  const out = [];
  s.drainEvents((type, a) => type === 'STATE' && out.push(a));
  return out;
};

test.describe('volley emission', () => {
  for (const speed of [1, 2, 4]) {
    test(`balls are spaced ${(EMIT_INTERVAL * 1000).toFixed(1)} ms of simTime apart at ${speed}X`, () => {
      const s = openField(boot());
      s.setVolley(8);
      fire(s);
      s.dispatch({ type: 'SET_SPEED', v: speed });
      const times = [s.snapshot().simTime];
      let emitted = 1;
      while (emitted < 8) {
        s.step(STEP);
        const snap = s.snapshot();
        if (snap.volley.emitted > emitted) times.push(snap.simTime);
        emitted = snap.volley.emitted;
      }
      times.forEach((t, k) => expect(Math.abs(t - k * EMIT_INTERVAL)).toBeLessThanOrEqual(STEP * speed + 1e-9));
    });
  }

  test('the first ball is emitted on FIRE and exactly startBalls follow', () => {
    const s = openField(boot());
    fire(s);
    expect(s.snapshot().volley).toEqual({ size: 3, emitted: 1, active: 1 });
    stepUntil(s, (n) => n.state === 'Simulating');
    expect(s.snapshot().volley.emitted).toBe(3);
  });

  test('a one-ball volley whose ball lands resolves Firing -> Simulating -> Resolving -> Aiming', () => {
    const s = openField(boot());
    s.setVolley(1);
    states(s);
    fire(s);
    stepUntil(s, turnOver);
    expect(states(s)).toEqual([3, 4, 5, 2]);
    expect(s.snapshot().shots.used).toBe(1);
  });

  test('the turn does not end while balls are still active', () => {
    const s = openField(boot());
    fire(s);
    stepUntil(s, (n) => n.state === 'Simulating');
    expect(s.snapshot().volley.active).toBeGreaterThan(0);
    expect(s.snapshot().state).toBe('Simulating');
  });
});

test.describe('Resolving order', () => {
  // [name, core hp, level shots, expected state] (one volley is fired)
  for (const [name, coreHp, shots, expected] of [
    ['cores down on the last shot -> Victory', 0, 1, 'Victory'],
    ['cores alive on the last shot -> GameOver', 100, 1, 'GameOver'],
    ['cores down with shots left -> Victory', 0, 3, 'Victory'],
    ['cores alive with shots left -> Aiming', 100, 3, 'Aiming'],
  ]) {
    test(name, () => {
      const s = boot();
      s.loadLevel({ ...LEVELS[0], shots });
      openField(s).setVolley(1);
      s.board.cores[0].hp = coreHp;
      fire(s);
      stepUntil(s, turnOver);
      expect(s.snapshot().state).toBe(expected);
    });
  }
});

test.describe('launcher after a turn (HU-14)', () => {
  test('landings never move the launcher (mirrored aims both leave it at 540)', () => {
    const land = (x) => {
      const s = openField(boot());
      s.setVolley(1);
      fire(s, { type: 'AIM', x, y: 756 });
      stepUntil(s, turnOver);
      return s.snapshot().launcherX;
    };
    expect([land(740), land(340)]).toEqual([540, 540]);
  });
});
