// Atlas: openspec rendering spec "Atlas and sprite scale" and "Assets missing"
import { test, expect } from '@playwright/test';

const run = async (page, body, arg) => {
  await page.goto('/tests/blank.html');
  return page.evaluate(
    async ({ body, arg }) => {
      const mod = await import('/src/js/system/Atlas.js');
      return new Function('mod', 'arg', `return (async () => { ${body} })()`)(mod, arg);
    },
    { body, arg },
  );
};

const SIZES = [
  [1, 112, 56],
  [2, 224, 112],
  [3, 336, 168],
];

for (const [scale, w, h] of SIZES) {
  test(`bricks and cracks are pre-scaled once to ${w}x${h} at ${scale}x`, async ({ page }) => {
    const r = await run(
      page,
      `const a = await mod.loadAtlas(arg);
       const first = a.get('brick_low'), again = a.get('brick_low');
       const crack = a.get('crack_60');
       return { scale: a.scale, placeholder: a.placeholder, w: first.sw, h: first.sh, src: [first.source.width, first.source.height],
                same: first.source === again.source, crack: [crack.sw, crack.sh], prescales: a.prescaleCount,
                ball: a.get('ball').sw };`,
      scale,
    );
    expect(r.placeholder).toBe(false);
    expect(r.scale).toBe(scale);
    expect([r.w, r.h]).toEqual([w, h]);
    expect(r.src).toEqual([w, h]);
    expect(r.same).toBe(true);
    expect(r.crack).toEqual([w, h]);
    expect(r.prescales).toBe(7); // brick_low/mid/high, crack_30/60/90, brick_steel, once each
    expect(r.ball).toBe(32 * scale); // non-brick frames keep their sheet size
  });
}

test('without OffscreenCanvas the pre-scale falls back to a detached DOM canvas', async ({ page }) => {
  const r = await run(
    page,
    `delete globalThis.OffscreenCanvas;
     const c = mod.createCanvas(10, 6);
     const a = await mod.loadAtlas(1);
     return { isDom: c instanceof HTMLCanvasElement, size: [c.width, c.height], attached: c.isConnected,
              brick: a.get('brick_mid').source instanceof HTMLCanvasElement };`,
  );
  expect(r).toEqual({ isDom: true, size: [10, 6], attached: false, brick: true });
});

test('with OffscreenCanvas available it is preferred', async ({ page }) => {
  const r = await run(page, `return mod.createCanvas(4, 4) instanceof OffscreenCanvas;`);
  expect(r).toBe(true);
});

test('a failed sheet image yields placeholders of the same size and the game keeps going', async ({ page }) => {
  const r = await run(
    page,
    `const a = await mod.loadAtlas(2, { loadImage: () => Promise.reject(new Error('404')) });
     const b = a.get('brick_high'), o = a.get('orb_splitter');
     return { placeholder: a.placeholder, brick: [b.sw, b.sh], hasSource: b.source.width > 0, orb: [o.sw, o.sh] };`,
  );
  expect(r.placeholder).toBe(true);
  expect(r.brick).toEqual([224, 112]);
  expect(r.hasSource).toBe(true);
  expect(r.orb).toEqual([128, 128]);
});

test('a frame missing from the atlas (hit_flash) returns a placeholder without throwing', async ({ page }) => {
  const r = await run(
    page,
    `const a = await mod.loadAtlas(1);
     const f = a.get('hit_flash');
     return { placeholder: a.placeholder, sw: f.sw, sh: f.sh, drawable: f.source.width > 0 };`,
  );
  expect(r).toEqual({ placeholder: false, sw: 112, sh: 56, drawable: true });
});
