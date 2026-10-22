// Rules: .claude/skills/game-loop-state-manager/SKILL.md
// Single flow FSM. `paused` is a session flag, never a state. Nothing leads back to Loading/Title.

export const STATES = Object.freeze([
  'Loading',
  'Title',
  'Aiming',
  'Firing',
  'Simulating',
  'Resolving',
  'Victory',
  'GameOver',
]);

// Aiming is re-enterable from every gameplay state: RESTART (any), NEXT (Victory), Resolving (end of turn).
const TRANSITIONS = Object.freeze({
  Loading: ['Title'],
  Title: ['Aiming'],
  Aiming: ['Firing', 'Aiming'],
  Firing: ['Simulating', 'Aiming', 'Resolving'], // Resolving: victory or the time cap mid-emission (HU-13)
  Simulating: ['Resolving', 'Aiming', 'Firing'], // Firing: a group fired with balls still in flight (HU-13)
  Resolving: ['Victory', 'GameOver', 'Aiming'],
  Victory: ['Aiming'],
  GameOver: ['Aiming'],
});

export class Fsm {
  // strict: illegal transitions throw (dev); otherwise they are refused and return false.
  // onEnter: { [State]: (fromState) => void }, called after the state has switched.
  constructor({ strict = true, onEnter = {} } = {}) {
    this.strict = strict;
    this.onEnter = onEnter;
    this.state = 'Loading';
  }

  can(next) {
    return (TRANSITIONS[this.state] ?? []).includes(next);
  }

  transition(next) {
    if (!this.can(next)) {
      if (this.strict) throw new Error(`illegal transition ${this.state} -> ${next}`);
      return false;
    }
    const from = this.state;
    this.state = next;
    this.onEnter[next]?.(from);
    return true;
  }
}
