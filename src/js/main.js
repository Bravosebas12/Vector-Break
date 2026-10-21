// Fixed-timestep loop: .claude/skills/canvas-renderer-opt/SKILL.md
// Game FSM and input: .claude/skills/game-loop-state-manager/SKILL.md
// Boot: build the session, publish the optional test hook, load every asset (Loading -> Title), then
// forward real DOM input once. Tests: ?test=1 (hook + RecordingSink), &loop=1 (rAF loop), &audio=1 (real
// samples and WebAudio, recorded too), &stress=1.
import { createSession } from './system/GameSession.js';
import { createTestHook } from './system/TestHook.js';
import { Rng } from './system/Rng.js';
import { createLoop } from './system/Loop.js';
import { applyStageScale, applyViewport, mapClientToLogical } from './system/Viewport.js';
import { loadFonts } from './system/Fonts.js';
import { loadAtlas } from './system/Atlas.js';
import { Particles } from './system/Particles.js';
import { createRenderer, BOARD_ORIGIN } from './system/Renderer.js';
import { createProgression } from './system/Progression.js';
import { AssetLoader } from './system/AssetLoader.js';
import { mapEvent } from './system/Input.js';
import { BOARD_W, BOARD_H } from './system/Layout.js';
import { createHudDom } from './system/HudDom.js';
import { RecordingSink, createSoundMapper, teeSink } from './system/AudioSinks.js';
import { createWebAudio } from './system/WebAudio.js';

const LEVEL_FILES = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6'];
const IMPACTS = Array.from({ length: 12 }, (_, i) => `sfx_impact_std_b${String(i).padStart(2, '0')}`);
const SAMPLE_NAMES = ['sfx_block_destroy', 'sfx_burst_launch', 'sfx_orb_split', 'sfx_impact_steel', 'sfx_ui_click', 'sfx_ui_confirm', ...IMPACTS];
const SAMPLES = SAMPLE_NAMES.map((name) => ({ name, url: `assets/audio/${name}.wav` }));
const MUSIC = { name: 'music_loop_95bpm_64bars', url: 'assets/audio/music_loop_95bpm_64bars.wav' };
const PLAYING = ['Aiming', 'Firing', 'Simulating'];
const KEY_ART = 'assets/art/key-art.webp';

const params = new URLSearchParams(location.search);
const testMode = params.get('test') === '1';
// Stress flags are honored only together with ?test=1.
const stress = testMode && params.get('stress') === '1';
const loopOn = !testMode || params.get('loop') === '1';
// Tests keep the real asset set off (instant settle) unless &audio=1 asks for it.
const realAudio = !testMode || params.get('audio') === '1';

const webAudio = createWebAudio();
const recorder = new RecordingSink();
const audio = !testMode ? webAudio : realAudio ? teeSink(webAudio, recorder) : recorder;
const progression = createProgression();
const session = createSession({
  rng: new Rng(1),
  progression,
  audio,
  sealedFloor: stress,
  volleyCapS: stress ? Infinity : 45,
  // ?test=1 pins the test-only 'turn' mode (v1 emission) for the existing suite; tests opt in to 1..3.
  fireMode: testMode ? 'turn' : 1,
});
// Event ring -> sounds. Combo clock is the play time in ms (read from the live run, no snapshot).
const onSound = createSoundMapper({ audio, now: () => session.run.playTime * 1000 });
const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resize = () => {
  applyStageScale(stage);
  return applyViewport(canvas, ctx);
};
const { atlasScale } = resize();
const ui = { loadError: false };
const hudView = createHudDom(document.getElementById('hud'), { dispatch: (action) => session.dispatch(action) });
const renderer = createRenderer({ session, ctx, particles: new Particles(), progression, onEvent: onSound, ui, hudView });
if (testMode) {
  const drain = loopOn ? null : () => session.drainEvents(onSound);
  window.__ANGLECRAFT__ = createTestHook(session, recorder.log, drain, (alpha, nowMs) => renderer.draw(alpha, nowMs));
  window.__ANGLECRAFT_AUDIO__ = webAudio;
  window.__ANGLECRAFT_RENDER__ = renderer.stats;
}
window.addEventListener('resize', resize);

// DOM input: listeners are registered once and forward plain records to Input.mapEvent. The session
// gates every action by state (Loading drops all input; Title accepts only the left click).
const send = (record) => {
  const action = mapEvent(record);
  if (action) session.dispatch(action);
};
// The crosshair sprite (Renderer) replaces the system cursor while the pointer is over the board.
const pointer = (ui.pointer = { x: 0, y: 0, inBoard: false });
window.addEventListener('mousemove', (e) => {
  const p = mapClientToLogical(e.clientX, e.clientY, canvas.getBoundingClientRect());
  pointer.x = p.x - BOARD_ORIGIN.x;
  pointer.y = p.y - BOARD_ORIGIN.y;
  const inBoard = pointer.x >= 0 && pointer.x <= BOARD_W && pointer.y >= 0 && pointer.y <= BOARD_H;
  if (inBoard !== pointer.inBoard) canvas.style.cursor = inBoard ? 'none' : '';
  pointer.inBoard = inBoard;
  send({ type: 'mousemove', x: pointer.x, y: pointer.y }); // AIM works in board coordinates
});
// Pointer presses come from the canvas only (HUD panels sit above it and catch their own clicks). While
// playing, a press fires only inside the board; on the title any press on the canvas starts the game.
canvas.addEventListener('mousedown', (e) => {
  const p = mapClientToLogical(e.clientX, e.clientY, canvas.getBoundingClientRect());
  const x = p.x - BOARD_ORIGIN.x;
  const y = p.y - BOARD_ORIGIN.y;
  const inBoard = x >= 0 && x <= BOARD_W && y >= 0 && y <= BOARD_H;
  if (inBoard || session.fsm.state === 'Title') send({ type: 'mousedown', button: e.button }); // same gesture unlocks audio
});
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') e.preventDefault();
  send({ type: 'keydown', key: e.key, repeat: e.repeat });
});
window.addEventListener('keyup', (e) => send({ type: 'keyup', key: e.key }));
// Losing focus releases A and D, so the launcher never keeps moving without a held key.
window.addEventListener('blur', () => ['a', 'd'].forEach((key) => send({ type: 'keyup', key })));
window.addEventListener('contextmenu', (e) => e.preventDefault());
// Hiding the page pauses a running level; showing it never resumes (the player does).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && PLAYING.includes(session.fsm.state) && !session.run.paused) session.dispatch({ type: 'PAUSE' });
});

// Real-time loop. Tests keep the session under their own control unless ?loop=1 is set (with ?test=1).
if (loopOn) {
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

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image failed: ${url}`));
    image.src = url;
  });
}

async function boot() {
  const spec = {
    atlas: () => loadAtlas(atlasScale),
    fonts: () => loadFonts(),
    art: () => loadImage(KEY_ART).then((image) => (renderer.setTitleArt(image), image)),
    levels: LEVEL_FILES.map((name) => `src/levels/${name}.json`),
    samples: realAudio ? SAMPLES : [],
    music: realAudio ? MUSIC : null,
  };
  // The last settle is held back so Title is entered only after levels and buffers are installed.
  const loaded = await AssetLoader.load(spec, (done, total) => session.setLoadProgress(Math.min(done, total - 1), total));
  webAudio.setBuffers(loaded.buffers);
  loaded.failed.forEach((name) => webAudio.markFailed(name));
  if (loaded.atlas) renderer.setAtlas(loaded.atlas);
  if (loaded.fonts) renderer.invalidate();
  session.setLevels(loaded.levels);
  const { total } = session.loading;
  session.setLoadProgress(total, total);
}

boot().catch((error) => {
  ui.loadError = true; // stays in Loading
  console.error('boot failed', error);
});
