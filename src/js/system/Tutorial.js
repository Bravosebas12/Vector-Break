// Tutorial hints (HU-10 AC12, HU-11 AC15, D-T.1): the move hint on level 1 and the fire-mode hint on level 2,
// shown in Aiming (not paused) until the player uses the mechanic or fires, once per session (page load).
// Pure and DOM-free; `view` is called every frame and reuses one object.
const HINTS = Object.freeze({ 0: 'move', 1: 'mode' }); // level index -> hint
const DISMISS = Object.freeze({ move: ['LAUNCHER_MOVED', 'FIRE'], mode: ['MODE', 'FIRE'] });

export function createTutorial() {
  const seen = { move: false, mode: false };
  const out = { kind: null, x: 0 };

  return {
    // -> { kind: 'move' | 'mode' | null, x: launcher x (board coordinates) }
    view(state, paused, levelIndex, launcherX) {
      const hint = HINTS[levelIndex] ?? null;
      out.kind = state === 'Aiming' && !paused && hint !== null && !seen[hint] ? hint : null;
      out.x = launcherX;
      return out;
    },
    // Session events (drained by the renderer). Only the hint on screen can be dismissed.
    onEvent(type) {
      if (out.kind !== null && DISMISS[out.kind].includes(type)) seen[out.kind] = true;
    },
  };
}
