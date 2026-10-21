// HU-10 launcher states (openspec change anglecraft-v1-launcher-and-fire-mode, hud delta "Launcher states"):
// ready, moving, at edge, disabled. Chevrons (24x24) and the trail (56x12) are cached sprites drawn with alpha.
import { test, expect } from '@playwright/test';

async function run(page, body) {
  await page.goto('/tests/blank.html');
  return page.evaluate(async (body) => {
    const { createSession } = await import('/src/js/system/GameSession.js');
    const { createRenderer } = await import('/src/js/system/Renderer.js');
    const { Particles } = await import('/src/js/system/Particles.js');
    const { Rng } = await import('/src/js/system/Rng.js');
    const level = await (await fetch('/src/levels/level1.json')).json();
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const session = createSession({ rng: new Rng(1), fireMode: 1 });
    session.setLevels([level]);
    session.setLoadProgress(1, 1);
    session.loadLevel(0);
    const r = createRenderer({ session, ctx: canvas.getContext('2d'), particles: new Particles() });
    const frame = () => {
      const sprites = [];
      const proto = CanvasRenderingContext2D.prototype;
      const drawImage = proto.drawImage;
      proto.drawImage = function (img, ...a) {
        if ((img.width === 24 && img.height === 24) || (img.width === 56 && img.height === 12))
          sprites.push({ kind: img.width === 24 ? 'chevron' : 'trail', x: a[0], alpha: +this.globalAlpha.toFixed(2) });
        return drawImage.call(this, img, ...a);
      };
      r.draw(0, 0);
      proto.drawImage = drawImage;
      return sprites;
    };
    return new Function('session', 'frame', `return (async () => { ${body} })()`)(session, frame);
  }, body);
}

test('ready: two dim chevrons, no trail', async ({ page }) => {
  const s = await run(page, `return frame();`);
  expect(s.filter((d) => d.kind === 'chevron').map((d) => d.alpha)).toEqual([0.35, 0.35]);
  expect(s.filter((d) => d.kind === 'trail')).toEqual([]);
});

test('moving right: right chevron lit, left at 15 %, a trail behind the launcher', async ({ page }) => {
  const s = await run(page, `session.dispatch({ type: 'MOVE_START', dir: 1 }); for (let i = 0; i < 12; i++) session.step(1 / 120); return frame();`);
  const chev = s.filter((d) => d.kind === 'chevron').sort((a, b) => a.x - b.x);
  expect(chev.map((d) => d.alpha)).toEqual([0.15, 1]);
  expect(s.find((d) => d.kind === 'trail').x).toBeLessThan(chev[1].x);
});

test('at the left edge the left chevron is hidden', async ({ page }) => {
  const s = await run(page, `session.run.launcherX = 50; return frame();`);
  const chev = s.filter((d) => d.kind === 'chevron');
  expect(chev.length).toBe(1);
  expect(chev[0].x).toBeGreaterThan(50);
});

test('disabled while a group flies: no chevrons and no trail', async ({ page }) => {
  const s = await run(page, `session.dispatch({ type: 'AIM', x: 540, y: 300 }); session.dispatch({ type: 'FIRE' }); return frame();`);
  expect(s).toEqual([]);
});
