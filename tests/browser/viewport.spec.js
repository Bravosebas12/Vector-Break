// Viewport math: openspec rendering spec "DPR and mouse mapping" (E3)
import { test, expect } from '@playwright/test';

const load = async (page) => {
  await page.goto('/tests/blank.html');
};
const call = (page, fn, args) =>
  page.evaluate(
    async ({ fn, args }) => (await import('/src/js/system/Viewport.js'))[fn](...args),
    { fn, args },
  );

const MAP = [
  // [name, client x, client y, rect, expected logical]
  ['center of a vertically letterboxed 1000x1000 window', 500, 500, { left: 0, top: 0, width: 1000, height: 1000 }, [960, 540]],
  ['top-left of the displayed image in 1000x1000', 0, 218.75, { left: 0, top: 0, width: 1000, height: 1000 }, [0, 0]],
  ['pillarboxed 2400x1080 window, center', 1200, 540, { left: 0, top: 0, width: 2400, height: 1080 }, [960, 540]],
  ['rect offset by the page position', 1100, 640, { left: 100, top: 100, width: 1920, height: 1080 }, [1000, 540]],
];

for (const [name, x, y, rect, expected] of MAP) {
  test(`mapClientToLogical: ${name}`, async ({ page }) => {
    await load(page);
    const p = await call(page, 'mapClientToLogical', [x, y, rect]);
    expect(p.x).toBeCloseTo(expected[0], 0);
    expect(p.y).toBeCloseTo(expected[1], 0);
  });
}

test('fit scale is min(W/1920, H/1080) and the DPR scales the backing store and atlas scale', async ({ page }) => {
  await load(page);
  expect(await call(page, 'fitScale', [1000, 1000])).toBeCloseTo(1000 / 1920, 6);
  expect(await call(page, 'fitScale', [3840, 1080])).toBe(1);
  const table = [
    [1920, 1080, 1, { width: 1920, height: 1080, atlas: 1 }],
    [960, 540, 2, { width: 1920, height: 1080, atlas: 1 }],
    [1920, 1080, 2, { width: 3840, height: 2160, atlas: 2 }],
    [1920, 1080, 3, { width: 5760, height: 3240, atlas: 3 }],
    [4000, 2250, 2, { width: 8000, height: 4500, atlas: 3 }],
    [480, 270, 1, { width: 480, height: 270, atlas: 1 }],
  ];
  for (const [w, h, dpr, want] of table) {
    expect(await call(page, 'backingSize', [w, h, dpr])).toEqual({ width: want.width, height: want.height });
    expect(await call(page, 'atlasScale', [w, h, dpr])).toBe(want.atlas);
  }
});

test('DPR 2: a block cell centre maps back into the same cell (round trip)', async ({ page }) => {
  await load(page);
  const result = await page.evaluate(async () => {
    const { mapClientToLogical, fitScale } = await import('/src/js/system/Viewport.js');
    const rect = { left: 0, top: 0, width: 1280, height: 720 };
    const s = fitScale(rect.width, rect.height);
    // Block at col 4,row 3: cell centre in logical px, board origin is applied by the caller.
    const logical = { x: 36 + 112 * 4 + 56, y: 56 * 3 + 28 };
    const p = mapClientToLogical(logical.x * s, logical.y * s, rect);
    return { dx: Math.abs(p.x - logical.x), dy: Math.abs(p.y - logical.y) };
  });
  expect(result.dx).toBeLessThan(1);
  expect(result.dy).toBeLessThan(1);
});
