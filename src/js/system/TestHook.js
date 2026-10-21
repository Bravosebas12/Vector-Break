// Dev-only test hook (window.__ANGLECRAFT__), installed by main.js only with ?test=1.
// Everything except snapshot() throws NOT_READY while the session is still Loading.
import { STEP, LAUNCHER_Y } from './Layout.js';

// `drain()` pumps the event ring into the audio mapper after each step; main.js passes it only when the
// real loop (renderer) is not running, so every event is consumed exactly once.
export function createTestHook(session, audioLog = [], drain = null) {
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
    start: guard(() => session.dispatch({ type: 'FIRE', pointer: true })),
    audioLog: guard(() => audioLog.slice()),
  };
}
