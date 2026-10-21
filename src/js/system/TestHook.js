// Dev-only test hook (window.__ANGLECRAFT__), installed by main.js only with ?test=1.
// Everything except snapshot() throws NOT_READY while the session is still Loading.
import { STEP, LAUNCHER_Y } from './Layout.js';

// `drain()` pumps the event ring into the audio mapper after each step; main.js passes it only when the
// real loop (renderer) is not running, so every event is consumed exactly once.
// `render(alpha, nowMs)` draws one frame (canvas + HUD) without the rAF loop; visual tests capture after it.
export function createTestHook(session, audioLog = [], drain = null, render = null) {
  const guard =
    (fn) =>
    (...args) => {
      if (session.snapshot().state === 'Loading') throw new Error('NOT_READY');
      return fn(...args);
    };

  return {
    snapshot: () => session.snapshot(),
    step: guard((n) => {
      for (let i = 0; i < n; i++) {
        session.step(STEP);
        drain?.();
      }
    }),
    loadLevel: guard((x) => session.loadLevel(x)),
    aim: guard((x, y) => session.dispatch({ type: 'AIM', x, y })),
    // Angle in radians from the +x axis, upward positive (same convention as Raycaster.sweep).
    fire: guard((angle) => {
      const { launcherX } = session.snapshot();
      session.dispatch({ type: 'AIM', x: launcherX + Math.cos(angle) * 1000, y: LAUNCHER_Y - Math.sin(angle) * 1000 });
      session.dispatch({ type: 'FIRE' });
    }),
    action: guard((a) => session.dispatch(a)),
    setSeed: guard((seed) => session.rng.setSeed(seed)),
    setVolley: guard((n) => session.setVolley(n)),
    setFireMode: guard((v) => session.setFireMode(v)),
    // Holds A (dir -1) or D (dir +1) for `seconds` of play time, stepping the session, then releases it.
    move: guard((dir, seconds) => {
      session.dispatch({ type: 'MOVE_START', dir });
      for (let i = 0; i < Math.round(seconds / STEP); i++) {
        session.step(STEP);
        drain?.();
      }
      session.dispatch({ type: 'MOVE_STOP', dir });
    }),
    start: guard(() => session.dispatch({ type: 'FIRE', pointer: true })),
    audioLog: guard(() => audioLog.slice()),
    render: guard((nowMs = 0) => render?.(1, nowMs)),
  };
}
