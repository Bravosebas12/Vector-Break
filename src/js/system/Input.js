// Rules: .claude/skills/game-loop-state-manager/SKILL.md
// DOM-free input layer. The adapter (main.js) forwards plain event records to `mapEvent` once at
// boot; states never read DOM events. `allows` is the single gating table used by the session.

const SPEED_KEYS = { 1: 1, 2: 2, 4: 4 };
const PLAYING = ['Aiming', 'Firing', 'Simulating']; // also where FIRE, AIM and A / D act (HU-13)
const GAMEPLAY = ['Aiming', 'Firing', 'Simulating', 'Resolving', 'Victory', 'GameOver'];
const SKIPPABLE = ['Aiming', 'Firing', 'Simulating', 'Resolving', 'GameOver']; // HU-12: not Victory (D-12.4)

// event: { type: 'mousemove'|'mousedown'|'keydown'|'keyup', x?, y?, button?, key?, repeat? } -> action | null
export function mapEvent(e) {
  switch (e.type) {
    case 'mousemove':
      return { type: 'AIM', x: e.x, y: e.y };
    case 'mousedown':
      return e.button === 0 ? { type: 'FIRE', pointer: true } : null;
    case 'keydown':
      return mapKey(e);
    case 'keyup':
      return mapKeyUp(e);
    default:
      return null; // contextmenu and anything else are inert
  }
}

function mapKey({ key, repeat = false }) {
  if (key === ' ' || key === 'Space') return { type: 'FIRE' };
  if (key in SPEED_KEYS) return { type: 'SET_SPEED', v: SPEED_KEYS[key] };
  if (key === 'Enter') return { type: 'CONFIRM' }; // modal primary action
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (repeat) return null; // R, P, A, D, M and N ignore auto-repeat
  if (k === 'p') return { type: 'PAUSE' };
  if (k === 'r') return { type: 'RESTART' };
  if (k === 'a') return { type: 'MOVE_START', dir: -1 }; // HU-10: hold to move the launcher
  if (k === 'd') return { type: 'MOVE_START', dir: 1 };
  if (k === 'm') return { type: 'CYCLE_MODE' }; // HU-11
  if (k === 'n') return { type: 'SKIP' }; // HU-12: next level, no classification
  return null; // Esc and every other key
}

function mapKeyUp({ key }) {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === 'a') return { type: 'MOVE_STOP', dir: -1 };
  if (k === 'd') return { type: 'MOVE_STOP', dir: 1 };
  return null;
}

// Whether `action` may act in `state`. Level-specific NEXT gating (unlocked, exists) lives in the session.
export function allows(state, paused, action) {
  if (state === 'Loading') return false;
  if (action.type === 'MOVE_STOP') return true; // a release always clears the held key, even paused
  if (state === 'Title') return action.type === 'FIRE' && action.pointer === true;
  if (paused) return action.type === 'PAUSE' || action.type === 'RESTART' || action.type === 'SKIP';
  switch (action.type) {
    case 'AIM':
    case 'FIRE':
    case 'MOVE_START':
      return PLAYING.includes(state); // HU-13: in flight too; the session checks balls left and cadence
    case 'CYCLE_MODE':
      return state === 'Aiming'; // D-13.5: the mode stays locked in flight
    case 'SET_MODE':
      return state === 'Aiming' && [1, 2, 3].includes(action.v);
    case 'SET_SPEED':
      return (state === 'Firing' || state === 'Simulating') && action.v in SPEED_KEYS;
    case 'PAUSE':
      return PLAYING.includes(state);
    case 'RESTART':
      return GAMEPLAY.includes(state);
    case 'NEXT':
      return state === 'Victory';
    case 'SKIP':
      return SKIPPABLE.includes(state);
    case 'CONFIRM':
    case 'PRESS': // modal button click, hit-tested by the adapter in logical coordinates
      return state === 'Victory' || state === 'GameOver';
    default:
      return false;
  }
}
