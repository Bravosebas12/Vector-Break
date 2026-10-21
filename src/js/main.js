// Fixed-timestep loop: .claude/skills/canvas-renderer-opt/SKILL.md
// Game FSM and input: .claude/skills/game-loop-state-manager/SKILL.md
// Boot: build the session, publish the optional test hook, then load levels (Loading -> Title).
import { createSession } from './system/GameSession.js';
import { createTestHook } from './system/TestHook.js';
import { Rng } from './system/Rng.js';

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
