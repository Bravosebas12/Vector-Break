// Renderer: openspec rendering spec "Static layer", "HP feedback", "Destruction particles", "Assets missing".
// Draws into a real canvas; asserts on counters, spied text and pool state, never on pixels.
import { test, expect } from '@playwright/test';

const run = async (page, body, arg) => {
  await page.goto('/tests/blank.html');
  return page.evaluate(
    async ({ body, arg }) => {
      const { createSession } = await import('/src/js/system/GameSession.js');
      const { createRenderer, hpStep, crackFor } = await import('/src/js/system/Renderer.js');
      const { Particles } = await import('/src/js/system/Particles.js');
      const { Rng } = await import('/src/js/system/Rng.js');
      const level = await (await fetch('/src/levels/level1.json')).json();
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      const session = createSession({ rng: new Rng(1) });
      session.setLevels([level]);
      session.setLoadProgress(1, 1);
      const make = (extra = {}) => createRenderer({ session, ctx, particles: new Particles(), ...extra });
      const find = (col, row) => session.board.blocks.find((b) => b.col === col && b.row === row);
      const destroy = (b) => {
        const board = session.board;
        board.cells[b.row * board.cols + b.col] = null;
        board.blocks.splice(board.blocks.indexOf(b), 1);
        session.events.push('DESTROY', b.row * board.cols + b.col, 1);
      };
      const texts = [];
      for (const proto of [CanvasRenderingContext2D.prototype, OffscreenCanvasRenderingContext2D.prototype]) {
        const fillText = proto.fillText;
        proto.fillText = function (t, ...rest) {
          texts.push(String(t));
          return fillText.call(this, t, ...rest);
        };
      }
      const env = { session, ctx, make, find, destroy, texts, level, Particles, createRenderer, hpStep, crackFor };
      return new Function('env', 'arg', `with (env) { return (async () => { ${body} })() }`)(env, arg);
    },
    { body, arg },
  );
};

test('Loading/Title draw only a background: no board layer, no error', async ({ page }) => {
  const r = await run(page, `const r = make(); r.draw(0, 0); return { redraws: r.stats.layerRedraws, frames: r.stats.frames };`);
  expect(r).toEqual({ redraws: 0, frames: 1 });
});

test('static layer: drawn once, no redraw while balls move with no hits (60 frames)', async ({ page }) => {
  const r = await run(
    page,
    `session.loadLevel(0);
     const r = make();
     r.draw(0, 0);
     const first = r.stats.layerRedraws;
     session.dispatch({ type: 'AIM', x: session.run.launcherX, y: 0 });
     session.dispatch({ type: 'FIRE' });
     for (let i = 0; i < 60; i++) { session.step(1 / 120); r.draw(0.5, i * 16); }
     return { first, after: r.stats.layerRedraws, balls: session.balls.count };`,
  );
  expect(r.first).toBe(1);
  expect(r.after).toBe(1);
  expect(r.balls).toBeGreaterThan(0);
});

test('HP change redraws once and shows the new number; destruction redraws once and removes the block', async ({ page }) => {
  const r = await run(
    page,
    `session.loadLevel(0);
     const r = make();
     r.draw(0, 0);
     const core = find(4, 1);
     texts.length = 0;
     core.hp -= 7;
     r.draw(0, 16);
     const afterHit = { redraws: r.stats.layerRedraws, hasNumber: texts.includes(String(core.hp)), blocks: r.stats.blocksDrawn };
     r.draw(0, 32);
     const idle = r.stats.layerRedraws;
     destroy(find(0, 5));
     r.draw(0, 48);
     return { afterHit, idle, destroyed: r.stats.layerRedraws, blocks: r.stats.blocksDrawn, expected: afterHit.blocks - 1, hp: core.hp };`,
  );
  expect(r.hp).toBe(93);
  expect(r.afterHit).toMatchObject({ redraws: 2, hasNumber: true });
  expect(r.idle).toBe(2);
  expect(r.destroyed).toBe(3);
  expect(r.blocks).toBe(r.expected);
});

test('colour and crack overlay follow remaining HP (4 steps, cracks at 30/60/90 % damage)', async ({ page }) => {
  const r = await run(
    page,
    `return { steps: [100, 75, 74, 50, 49, 25, 24, 1].map((hp) => hpStep(hp, 100)),
             cracks: [100, 80, 70, 40, 10, 5, 0].map((hp) => crackFor(hp, 100)) };`,
  );
  expect(r.steps).toEqual([0, 1, 1, 2, 2, 3, 3, 3]);
  expect(r.cracks).toEqual([null, null, 'crack_30', 'crack_60', 'crack_90', 'crack_90', 'crack_90']);
});

test('destruction burst: 12 particles (32 for a core) near the cell, drop-on-full, nothing allocated', async ({ page }) => {
  const r = await run(
    page,
    `session.loadLevel(0);
     const r = make();
     r.draw(0, 0);
     const b = find(0, 5);
     destroy(b);
     r.draw(0, 16);
     const std = r.particles.active;
     const p0 = r.particles.pool.items[0];
     const near = Math.hypot(p0.x - (36 + 56), p0.y - (5 * 56 + 28)) < 40;
     session.events.push('DESTROY', 1 * 9 + 4, 2);
     r.draw(0, 32);
     const small = new Particles(10);
     const tiny = make({ particles: small });
     tiny.draw(0, 0);
     session.events.push('DESTROY', 1 * 9 + 4, 2);
     tiny.draw(0, 16);
     return { std, near, total: r.particles.active, tinyActive: small.active, dropped: small.dropped, created: small.pool.created };`,
  );
  expect(r.std).toBe(12);
  expect(r.near).toBe(true);
  expect(r.total).toBe(12 + 32); // 16 ms later: the first burst is still alive
  expect(r.tinyActive).toBe(10);
  expect(r.dropped).toBe(22);
  expect(r.created).toBe(10);
});

test('missing atlas / placeholder atlas / hit flash: draws every state without error', async ({ page }) => {
  const r = await run(
    page,
    `const r = make({ atlas: { placeholder: true, get: () => ({ source: ctx.canvas, sx: 0, sy: 0, sw: 1, sh: 1 }) } });
     session.loadLevel(0);
     session.events.push('HIT', 4 + 9);
     r.draw(0, 0);
     session.dispatch({ type: 'AIM', x: 300, y: 200 });
     r.draw(0.3, 16);
     session.dispatch({ type: 'FIRE' });
     for (let i = 0; i < 30; i++) { session.step(1 / 120); r.draw(0.3, 32 + i * 16); }
     session.dispatch({ type: 'PAUSE' });
     r.draw(0.3, 600);
     return { frames: r.stats.frames, state: session.fsm.state };`,
  );
  expect(r.frames).toBe(33);
  expect(['Firing', 'Simulating']).toContain(r.state);
});
