// Board sprites: openspec rendering delta (anglecraft-v1-visual-fidelity) "Atlas and sprite scale",
// "HP feedback", "Board surface", "Aim preview styling", "Launcher styling", "Orb label", "Particle colors".
// Uses a fake atlas whose frames are tagged canvases; asserts on spied draw calls, never on pixels.
import { test, expect } from '@playwright/test';

const run = async (page, body, arg) => {
  await page.goto('/tests/blank.html');
  return page.evaluate(
    async ({ body, arg }) => {
      const { createSession } = await import('/src/js/system/GameSession.js');
      const { createRenderer, aimDots } = await import('/src/js/system/Renderer.js');
      const { Particles } = await import('/src/js/system/Particles.js');
      const { Rng } = await import('/src/js/system/Rng.js');
      const level = await (await fetch('/src/levels/level2.json')).json();
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      const session = createSession({ rng: new Rng(1) });
      session.setLevels([level]);
      session.setLoadProgress(1, 1);
      session.loadLevel(0);
      const frames = new Map();
      const atlas = {
        placeholder: false,
        get(name) {
          if (!frames.has(name)) {
            const source = new OffscreenCanvas(4, 4);
            source.__name = name;
            frames.set(name, { source, sx: 0, sy: 0, sw: 4, sh: 4 });
          }
          return frames.get(name);
        },
      };
      const log = { images: [], fills: [], texts: [], strokes: [] };
      for (const proto of [CanvasRenderingContext2D.prototype, OffscreenCanvasRenderingContext2D.prototype]) {
        const { drawImage, fillRect, fillText, stroke } = proto;
        proto.drawImage = function (src, ...a) {
          log.images.push({ name: src.__name ?? null, x: a.at(-4), y: a.at(-3), w: a.at(-2), h: a.at(-1), alpha: this.globalAlpha });
          return drawImage.call(this, src, ...a);
        };
        proto.fillRect = function (x, y, w, h) {
          log.fills.push({ w, h });
          return fillRect.call(this, x, y, w, h);
        };
        proto.fillText = function (t, ...a) {
          log.texts.push({ text: String(t), color: this.fillStyle, font: this.font });
          return fillText.call(this, t, ...a);
        };
        proto.stroke = function (...a) {
          log.strokes.push({ color: this.strokeStyle, dash: this.getLineDash().map((v) => Math.round(v * 100) / 100).join(',') });
          return stroke.call(this, ...a);
        };
      }
      const ui = {};
      const r = createRenderer({ session, ctx, particles: new Particles(), atlas, ui });
      const clear = () => Object.values(log).forEach((l) => (l.length = 0));
      const named = (n) => log.images.filter((i) => i.name === n);
      const env = { session, r, log, ui, clear, named, aimDots, level };
      return new Function('env', 'arg', `with (env) { return (async () => { ${body} })() }`)(env, arg);
    },
    { body, arg },
  );
};

test('each block type is drawn with its brick sprite at 112x56 and no block body uses fillRect', async ({ page }) => {
  const r = await run(
    page,
    `r.draw(0, 0);
     const count = (t) => session.board.blocks.filter((b) => b.type === t).length;
     const sizes = new Set(log.images.filter((i) => i.name?.startsWith('brick_')).map((i) => i.w + 'x' + i.h));
     return {
       low: named('brick_low').length, mid: named('brick_mid').length, high: named('brick_high').length, steel: named('brick_steel').length,
       expected: [count('standard'), count('reinforced'), count('core'), count('indestructible')],
       sizes: [...sizes], bigFills: log.fills.filter((f) => f.h >= 50 && f.h <= 60).length };`,
  );
  expect([r.low, r.mid, r.high, r.steel]).toEqual(r.expected);
  expect(r.sizes).toEqual(['112x56']);
  expect(r.bigFills).toBe(0);
});

test('HP numbers use JetBrains Mono 700 20px with the per-type color; steel has no number', async ({ page }) => {
  const r = await run(
    page,
    `r.draw(0, 0);
     const of = (t) => { const b = session.board.blocks.find((x) => x.type === t); return log.texts.find((x) => x.text === String(b.hp)); };
     return { std: of('standard'), mid: of('reinforced'), core: of('core'),
              numbers: log.texts.filter((t) => /20px "JetBrains Mono"/.test(t.font)).length, destructible: session.board.blocks.filter((b) => b.type !== 'indestructible').length };`,
  );
  expect(r.std.color).toBe('#e9fffb');
  expect(r.mid.color).toBe('#ffe1b3');
  expect(r.core.color).toBe('#ffe0f0');
  expect(r.std.font).toMatch(/^(700|bold) 20px "JetBrains Mono"/);
  expect(r.numbers).toBe(r.destructible);
});

test('crack overlays follow damage: none, crack_30, crack_60, crack_90 for HP 10/7/4/1 of 10', async ({ page }) => {
  const r = await run(
    page,
    `const b = session.board.blocks.find((x) => x.type === 'core');
     b.hp = 10; // the first draw of a board records max HP = 10
     const seen = [];
     for (const hp of [10, 7, 4, 1]) {
       b.hp = hp;
       clear();
       r.draw(0, seen.length * 16);
       seen.push(named('crack_30').concat(named('crack_60'), named('crack_90'))[0]?.name ?? null);
     }
     return seen;`,
  );
  expect(r).toEqual([null, 'crack_30', 'crack_60', 'crack_90']);
});

test('board surface: launch line at y 956 is part of the static layer and idle frames do not redraw it', async ({ page }) => {
  const r = await run(
    page,
    `r.draw(0, 0);
     const line = log.fills.some((f) => f.h === 1 && f.w >= 990);
     for (let i = 1; i <= 30; i++) r.draw(0, i * 16);
     return { line, redraws: r.stats.layerRedraws };`,
  );
  expect(r.line).toBe(true);
  expect(r.redraws).toBe(1);
});

test('balls and orbs use their sprites (64x64 centered) and each orb shows +V in cyan', async ({ page }) => {
  const r = await run(
    page,
    `session.dispatch({ type: 'AIM', x: session.run.launcherX, y: 0 });
     session.dispatch({ type: 'FIRE' });
     for (let i = 0; i < 40; i++) session.step(1 / 120);
     clear();
     r.draw(0, 16);
     const balls = named('ball');
     const orbs = session.board.orbs.filter((o) => !o.captured);
     const labels = log.texts.filter((t) => t.text.startsWith('+'));
     const b0 = session.balls.items[0];
     return { balls: balls.length, active: session.balls.count, size: balls[0].w + 'x' + balls[0].h,
              centered: balls.some((i) => Math.abs(i.x + 32 - b0.x) < 20 && Math.abs(i.y + 32 - b0.y) < 20),
              orbSprites: named('orb_splitter').length, orbs: orbs.length, labels: labels.map((t) => t.text),
              values: orbs.map((o) => '+' + o.value), labelColor: labels[0]?.color };`,
  );
  expect(r.balls).toBe(r.active);
  expect(r.size).toBe('64x64');
  expect(r.centered).toBe(true);
  expect(r.orbSprites).toBe(r.orbs);
  expect(r.labels).toEqual(r.values);
  expect(r.labelColor).toBe('#00f5d4');
});

test('launcher: cyan dashed ring with glow while Aiming, muted and no glow while Simulating', async ({ page }) => {
  const r = await run(
    page,
    `const ring = () => log.strokes.find((s) => s.dash === '16.99,5');
     clear(); r.draw(0, 0);
     const aiming = { ring: ring()?.color, glow: r.stats.launcherGlow };
     session.dispatch({ type: 'AIM', x: session.run.launcherX, y: 0 });
     session.dispatch({ type: 'FIRE' });
     for (let i = 0; i < 40; i++) session.step(1 / 120);
     clear(); r.draw(0, 16);
     return { aiming, simulating: { ring: ring()?.color, glow: r.stats.launcherGlow }, glowSprites: r.stats.glowSpritesBuilt };`,
  );
  expect(r.aiming).toEqual({ ring: '#00f5d4', glow: 1 });
  expect(r.simulating).toEqual({ ring: '#8a93a6', glow: 1 });
  expect(r.glowSprites).toBe(1);
});

test('aimDots: 28 px spacing from 36 px with opacity 1 - 0.55 s/total', async ({ page }) => {
  const r = await run(
    page,
    `const out = new Float32Array(3 * 64);
     const n = aimDots([0, 0, 280, 0], 2, out);
     return { n, xs: Array.from({ length: n }, (_, i) => out[i * 3]), alphas: Array.from({ length: n }, (_, i) => out[i * 3 + 2]) };`,
  );
  expect(r.n).toBe(9);
  expect(r.xs).toEqual([36, 64, 92, 120, 148, 176, 204, 232, 260]);
  expect(r.alphas[0]).toBeCloseTo(1 - (0.55 * 36) / 280, 5);
  for (let i = 1; i < r.n; i++) expect(r.alphas[i]).toBeLessThan(r.alphas[i - 1]);
});

test('aim preview draws traj_dot sprites, a bounce or impact marker, and the crosshair at the pointer', async ({ page }) => {
  const r = await run(
    page,
    `ui.pointer = { x: 200, y: 300, inBoard: true };
     session.dispatch({ type: 'AIM', x: 200, y: 300 });
     clear(); r.draw(0, 0);
     const cross = named('cursor_crosshair')[0];
     return { dots: named('traj_dot').length, dotSize: named('traj_dot')[0]?.w,
              markers: named('traj_bounce').length + named('traj_impact').length,
              cross: cross && { x: cross.x + 32, y: cross.y + 32, w: cross.w } };`,
  );
  expect(r.dots).toBeGreaterThan(5);
  expect(r.dotSize).toBe(16);
  expect(r.markers).toBe(1);
  expect(r.cross).toEqual({ x: 200, y: 300, w: 64 });
});

test('destruction particles take the block type color (reinforced is amber)', async ({ page }) => {
  const r = await run(
    page,
    `r.draw(0, 0);
     const b = session.board.blocks.find((x) => x.type === 'reinforced');
     const board = session.board;
     session.events.push('DESTROY', b.row * board.cols + b.col, 1); // BLOCK_TYPES[1] = reinforced
     r.draw(0, 16);
     const colors = new Set();
     for (let i = 0; i < r.particles.pool.count; i++) colors.add(r.particles.pool.items[i].color);
     return [...colors];`,
  );
  expect(r).toEqual(['#FF9E00']);
});
