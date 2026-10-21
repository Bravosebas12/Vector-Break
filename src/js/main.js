// Fixed-timestep loop: .claude/skills/canvas-renderer-opt/SKILL.md
// Game FSM and input: .claude/skills/game-loop-state-manager/SKILL.md
// Boot: build the session, publish the optional test hook, then load levels (Loading -> Title).
import { createSession } from './system/GameSession.js';
import { createTestHook } from './system/TestHook.js';
import { Rng } from './system/Rng.js';
import { createLoop } from './system/Loop.js';
import { applyViewport } from './system/Viewport.js';
import { loadAtlas } from './system/Atlas.js';
import { Particles } from './system/Particles.js';
import { createRenderer } from './system/Renderer.js';

const LEVEL_FILES = ['level1', 'level2', 'level3'];

const params = new URLSearchParams(location.search);
const testMode = params.get('test') === '1';
// Stress flags are honored only together with ?test=1.
const stress = testMode && params.get('stress') === '1';

const session = createSession({
  rng: new Rng(1),
  sealedFloor: stress,
  volleyCapS: stress ? Infinity : 45,
});
if (testMode) window.__ANGLECRAFT__ = createTestHook(session);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resize = () => applyViewport(canvas, ctx);
const { atlasScale } = resize();
const renderer = createRenderer({ session, ctx, particles: new Particles() });
// Sprites are optional: a failed sheet falls back to procedural drawing (loadAtlas never rejects).
loadAtlas(atlasScale).then((atlas) => renderer.setAtlas(atlas));
if (testMode) window.__ANGLECRAFT_RENDER__ = renderer.stats;
window.addEventListener('resize', resize);

// Real-time loop. Tests keep the session under their own control unless ?loop=1 is set (with ?test=1).
if (!testMode || params.get('loop') === '1') {
  const raf = testMode ? probeRaf(session, renderer.particles) : undefined;
  createLoop({ step: (dt) => session.step(dt), render: (alpha) => renderer.draw(alpha, performance.now()), raf }).start();
}

// Test-only frame probe (stress spec): CPU time of each loop frame, counted from the first frame with
// 50 active balls, plus the ball/particle pool sizes at start and now (they must never grow).
function probeRaf(sess, particles) {
  const created = () => sess.balls.created + particles.pool.created;
  const perf = (window.__ANGLECRAFT_PERF__ = { frames: 0, cpuMs: 0, createdStart: 0, createdEnd: 0 });
  return (tick) =>
    requestAnimationFrame((now) => {
      const t0 = performance.now();
      tick(now);
      const cpu = performance.now() - t0;
      if (perf.frames === 0 && sess.balls.count < 50) return;
      if (perf.frames === 0) perf.createdStart = created();
      perf.frames++;
      perf.cpuMs += cpu;
      perf.createdEnd = created();
    });
}

async function boot() {
  let done = 0;
  const levels = await Promise.all(
    LEVEL_FILES.map(async (name) => {
      const level = await (await fetch(`src/levels/${name}.json`)).json();
      session.setLoadProgress(++done, LEVEL_FILES.length + 1);
      return level;
    }),
  );
  session.setLevels(levels);
  session.setLoadProgress(LEVEL_FILES.length + 1, LEVEL_FILES.length + 1); // sprites/audio join in later slices
}

boot().catch((error) => console.error('boot failed', error));
