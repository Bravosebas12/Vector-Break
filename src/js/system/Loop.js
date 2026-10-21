// Fixed-timestep loop (skill canvas-renderer-opt): STEP = 1/120 s, frame delta clamped to 0.25 s,
// render receives alpha = accumulator / STEP. `frame(nowMs)` is pure of the rAF so tests can drive it.
import { STEP } from './Layout.js';

export const MAX_FRAME_DELTA = 0.25;

export function createLoop({ step, render, raf = (cb) => requestAnimationFrame(cb) }) {
  let acc = 0;
  let last = null;

  function frame(nowMs) {
    if (last !== null) acc += Math.min((nowMs - last) / 1000, MAX_FRAME_DELTA);
    last = nowMs;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }
    render(acc / STEP);
  }

  const tick = (nowMs) => {
    frame(nowMs);
    raf(tick);
  };

  return { frame, start: () => raf(tick) };
}
