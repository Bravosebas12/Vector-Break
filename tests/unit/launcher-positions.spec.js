// openspec change anglecraft-v1-free-launcher, test-harness delta "Flag-gated test hook" (setLauncherX) and
// "Solutions with launcher positions": the session places the launcher only in Aiming, clamped, and re-aims.
import { test, expect } from '@playwright/test';
import { boot, openField, fire } from './helpers/session.js';

const x = (s) => s.snapshot().launcherX;

test('setLauncherX places the launcher in Aiming and clamps it to [50, 1030]', () => {
  const s = boot();
  s.setLauncherX(300);
  expect(x(s)).toBe(300);
  s.setLauncherX(2000);
  expect(x(s)).toBe(1030);
  s.setLauncherX(-5);
  expect(x(s)).toBe(50);
});

test('setLauncherX re-aims from the new origin toward the same target', () => {
  const s = boot();
  s.dispatch({ type: 'AIM', x: 540, y: 300 });
  const straight = s.run.aim;
  s.setLauncherX(300);
  expect(s.run.aim.x).toBeGreaterThan(0); // now aims right, toward x 540
  expect(s.run.aim.x).not.toBeCloseTo(straight.x, 3);
});

test('setLauncherX does nothing outside Aiming', () => {
  const s = boot();
  openField(s);
  fire(s);
  const before = x(s);
  s.setLauncherX(300);
  expect(['Firing', 'Simulating']).toContain(s.snapshot().state);
  expect(x(s)).toBe(before);
});
