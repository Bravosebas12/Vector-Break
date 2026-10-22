// Progression storage: openspec progression spec "Record persistence", "Session start".
// Real Chromium localStorage; each test gets a fresh browser context, so storage starts empty.
import { test, expect } from '@playwright/test';

const run = async (page, body, arg) => {
  await page.goto('/tests/blank.html');
  return page.evaluate(
    async ({ body, arg }) => {
      const { createProgression } = await import('/src/js/system/Progression.js');
      return new Function('createProgression', 'arg', `return (async () => { ${body} })()`)(createProgression, arg);
    },
    { body, arg },
  );
};
const KEY = 'anglecraft.v1.records';
const R = '{ stars: 2, score: 700, shots: 4 }';

test('a win is stored under anglecraft.v1.records and read back after a reload', async ({ page }) => {
  await run(page, `createProgression().submit(0, ${R});`);
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).toEqual({
    0: { stars: 2, score: 700, shots: 4 },
  });
  await page.reload();
  const after = await run(page, `const p = createProgression(); return [p.record(0), p.canAccess(1)];`);
  expect(after).toEqual([{ stars: 2, score: 700, shots: 4 }, false]);
});

test('CP-55 the sin resolver mark is stored under anglecraft.v1.skipped and read back after a reload', async ({ page }) => {
  await run(page, `createProgression().markSkipped(2);`);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('anglecraft.v1.skipped')))).toEqual([2]);
  await page.reload();
  expect(await run(page, `return createProgression().status(2);`)).toBe('unsolved');
  await run(page, `createProgression().submit(2, ${R});`);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('anglecraft.v1.skipped')))).toEqual([]);
});

test('a corrupt skipped value and a throwing storage still let a skip be marked in memory', async ({ page }) => {
  await page.goto('/tests/blank.html');
  await page.evaluate(() => localStorage.setItem('anglecraft.v1.skipped', '{oops'));
  expect(await run(page, `return createProgression().status(4);`)).toBe('unplayed');
  const out = await run(
    page,
    `const boom = () => { throw new Error('denied'); };
     const p = createProgression({ storage: { getItem: boom, setItem: boom } });
     p.markSkipped(4);
     return p.status(4);`,
  );
  expect(out).toBe('unsolved');
});

test('a throwing localStorage never breaks the game; records live in memory', async ({ page }) => {
  const out = await run(
    page,
    `const boom = () => { throw new Error('denied'); };
     const p = createProgression({ storage: { getItem: boom, setItem: boom } });
     p.submit(0, ${R});
     return [p.record(0), p.canAccess(1)];`,
  );
  expect(out).toEqual([{ stars: 2, score: 700, shots: 4 }, true]);
});

test('an unreadable or corrupt stored value starts with no records', async ({ page }) => {
  await page.goto('/tests/blank.html');
  await page.evaluate((k) => localStorage.setItem(k, '{not json'), KEY);
  expect(await run(page, `return createProgression().record(0);`)).toBeNull();
});

test('a missing localStorage object falls back to memory', async ({ page }) => {
  const out = await run(page, `const p = createProgression({ storage: null }); p.submit(1, ${R}); return p.record(1);`);
  expect(out).toEqual({ stars: 2, score: 700, shots: 4 });
});

test('restart never touches the stored records', async ({ page }) => {
  const out = await run(
    page,
    `const { createSession } = await import('/src/js/system/GameSession.js');
     const { Rng } = await import('/src/js/system/Rng.js');
     const level = await (await fetch('/src/levels/level1.json')).json();
     const writes = [];
     const real = localStorage;
     const storage = { getItem: (k) => real.getItem(k), setItem: (k, v) => (writes.push(k), real.setItem(k, v)) };
     const progression = createProgression({ storage });
     progression.submit(0, ${R});
     const s = createSession({ rng: new Rng(1), progression, fireMode: 'turn' });
     s.setLevels([level]);
     s.setLoadProgress(1, 1);
     s.dispatch({ type: 'FIRE', pointer: true });
     const before = real.getItem('${KEY}');
     s.dispatch({ type: 'RESTART' });
     s.dispatch({ type: 'RESTART' });
     return { same: real.getItem('${KEY}') === before, writes: writes.length, state: s.snapshot().state };`,
  );
  expect(out).toEqual({ same: true, writes: 1, state: 'Aiming' });
});
