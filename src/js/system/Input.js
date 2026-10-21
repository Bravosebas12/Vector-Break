// Rules: .claude/skills/game-loop-state-manager/SKILL.md
// DOM-free input layer. The adapter (main.js) forwards plain event records to `mapEvent` once at
// boot; states never read DOM events. `allows` is the single gating table used by the session.

const SPEED_KEYS = { 1: 1, 2: 2, 4: 4 };
const PLAYING = ['Aiming', 'Firing', 'Simulating'];
const GAMEPLAY = ['Aiming', 'Firing', 'Simulating', 'Resolving', 'Victory', 'GameOver'];

// event: { type: 'mousemove'|'mousedown'|'keydown', x?, y?, button?, key?, repeat? } -> action | null
export function mapEvent(e) {
  switch (e.type) {
    case 'mousemove':
      return { type: 'AIM', x: e.x, y: e.y };
    case 'mousedown':
      return e.button === 0 ? { type: 'FIRE', pointer: true } : null;
    case 'keydown':
      return mapKey(e);
    default:
      return null; // contextmenu and anything else are inert
  }
}

function mapKey({ key, repeat = false }) {
  if (key === ' ' || key === 'Space') return { type: 'FIRE' };
  if (key in SPEED_KEYS) return { type: 'SET_SPEED', v: SPEED_KEYS[key] };
  if (key === 'Enter') return { type: 'CONFIRM' }; // modal primary action
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (repeat) return null; // R and P ignore auto-repeat
  if (k === 'p') return { type: 'PAUSE' };
  if (k === 'r') return { type: 'RESTART' };
  return null; // Esc and every other key
}

// Whether `action` may act in `state`. Level-specific NEXT gating (unlocked, exists) lives in the session.
export function allows(state, paused, action) {
  if (state === 'Loading') return false;
  if (state === 'Title') return action.type === 'FIRE' && action.pointer === true;
  if (paused) return action.type === 'PAUSE' || action.type === 'RESTART';
  switch (action.type) {
    case 'AIM':
    case 'FIRE':
      return state === 'Aiming';
    case 'SET_SPEED':
      return (state === 'Firing' || state === 'Simulating') && action.v in SPEED_KEYS;
    case 'PAUSE':
      return PLAYING.includes(state);
    case 'RESTART':
      return GAMEPLAY.includes(state);
    case 'NEXT':
      return state === 'Victory';
    case 'CONFIRM':
    case 'PRESS': // modal button click, hit-tested by the adapter in logical coordinates
      return state === 'Victory' || state === 'GameOver';
    default:
      return false;
  }
}
