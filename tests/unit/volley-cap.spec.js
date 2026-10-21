// Volley time cap (D11) and the stress configuration
import { test, expect } from '@playwright/test';
import { STEP } from '../../src/js/system/Layout.js';
import { boot, openField, fire, stepUntil, turnOver } from './helpers/session.js';

const SHALLOW = { type: 'AIM', x: 740, y: 756 };
const events = (s) => {
  const out = [];
  s.drainEvents((type) => out.push(type));
  return out;
};

test.describe('volley time cap', () => {
  test('releases every ball at the cap, keeps the launcher x when none landed, emits VOLLEY_CAPPED', () => {
    const s = openField(boot({ sealedFloor: true, volleyCapS: 1 }));
    fire(s);
    const used = stepUntil(s, turnOver);
    const snap = s.snapshot();
    expect(used * STEP).toBeGreaterThanOrEqual(1 - 2 * STEP);
    expect(snap.volley.active).toBe(0);
    expect(snap.launcherX).toBe(540);
    expect(snap.state).toBe('Aiming');
    expect(events(s)).toContain('VOLLEY_CAPPED');
  });

  test('a cap after the first landing keeps that landing x as the launcher x', () => {
    const ref = openField(boot());
    fire(ref, SHALLOW);
    let firstLand = 0;
    for (; ref.snapshot().volley.active === ref.snapshot().volley.emitted; firstLand++) ref.step(STEP);
    stepUntil(ref, turnOver);

    const s = openField(boot({ volleyCapS: (firstLand + 3) * STEP }));
    fire(s, SHALLOW);
    stepUntil(s, turnOver);
    expect(s.snapshot().launcherX).toBe(ref.snapshot().launcherX);
    expect(events(s)).toContain('VOLLEY_CAPPED');
  });

  test('a normal turn never reports VOLLEY_CAPPED', () => {
    const s = openField(boot());
    fire(s);
    stepUntil(s, turnOver);
    expect(events(s)).not.toContain('VOLLEY_CAPPED');
  });
});

test.describe('stress configuration', () => {
  test('sealedFloor + infinite cap keep balls bouncing for 5 s', () => {
    const s = openField(boot({ sealedFloor: true, volleyCapS: Infinity }));
    fire(s);
    for (let i = 0; i < 600; i++) s.step(STEP);
    const snap = s.snapshot();
    expect(snap.state).toBe('Simulating');
    expect(snap.volley.active).toBe(3);
    expect(Math.max(...snap.balls.map((b) => b.y))).toBeLessThanOrEqual(956 + 1);
    expect(events(s)).not.toContain('VOLLEY_CAPPED');
  });
});

test.describe('pause excluded from the cap', () => {
  test('600 paused steps at 40 s do not trigger the cap; it fires at 45 s of sim time after resuming', () => {
    const s = openField(boot({ sealedFloor: true }));
    fire(s);
    while (s.snapshot().volleySimTime < 40) s.step(STEP);
    expect(s.snapshot().volleySimTime).toBeGreaterThanOrEqual(40);
    s.dispatch({ type: 'PAUSE' });
    events(s);
    for (let i = 0; i < 600; i++) s.step(STEP);
    expect(events(s)).not.toContain('VOLLEY_CAPPED');
    expect(s.snapshot().state).toBe('Simulating');
    expect(s.snapshot().volleySimTime).toBeLessThan(40 + 2 * STEP);
    s.dispatch({ type: 'PAUSE' });
    while (s.snapshot().state === 'Simulating') s.step(STEP);
    const snap = s.snapshot();
    expect(events(s)).toContain('VOLLEY_CAPPED');
    expect(snap.volleySimTime).toBeGreaterThanOrEqual(45);
    expect(snap.volleySimTime).toBeLessThan(45 + 2 * STEP);
  });
});
