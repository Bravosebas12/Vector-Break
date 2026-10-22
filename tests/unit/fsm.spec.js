import { test, expect } from '@playwright/test';
import { Fsm, STATES } from '../../src/js/system/Fsm.js';

// Walks a fresh FSM to `target` through the legal path.
const PATH = {
  Loading: [],
  Title: ['Title'],
  Aiming: ['Title', 'Aiming'],
  Firing: ['Title', 'Aiming', 'Firing'],
  Simulating: ['Title', 'Aiming', 'Firing', 'Simulating'],
  Resolving: ['Title', 'Aiming', 'Firing', 'Simulating', 'Resolving'],
  Victory: ['Title', 'Aiming', 'Firing', 'Simulating', 'Resolving', 'Victory'],
  GameOver: ['Title', 'Aiming', 'Firing', 'Simulating', 'Resolving', 'GameOver'],
};
const at = (state, opts) => {
  const fsm = new Fsm(opts);
  for (const s of PATH[state]) fsm.transition(s);
  return fsm;
};

test.describe('Fsm', () => {
  test('starts in Loading and lists the eight states', () => {
    expect(new Fsm().state).toBe('Loading');
    expect(STATES).toEqual(['Loading', 'Title', 'Aiming', 'Firing', 'Simulating', 'Resolving', 'Victory', 'GameOver']);
  });

  const legal = [
    ['Loading', 'Title'],
    ['Title', 'Aiming'],
    ['Aiming', 'Firing'],
    ['Firing', 'Simulating'],
    ['Simulating', 'Resolving'],
    ['Resolving', 'Victory'],
    ['Resolving', 'GameOver'],
    ['Resolving', 'Aiming'],
    // RESTART and NEXT re-enter Aiming from any gameplay state.
    ['Aiming', 'Aiming'],
    ['Firing', 'Aiming'],
    ['Simulating', 'Aiming'],
    ['Victory', 'Aiming'],
    ['GameOver', 'Aiming'],
  ];
  for (const [from, to] of legal) {
    test(`${from} -> ${to} is legal`, () => {
      const fsm = at(from);
      expect(fsm.transition(to)).toBe(true);
      expect(fsm.state).toBe(to);
    });
  }

  const illegal = [
    ['Loading', 'Aiming'],
    ['Loading', 'Firing'],
    ['Aiming', 'Victory'],
    ['Aiming', 'Simulating'],
    ['Firing', 'Victory'], // Firing -> Resolving is legal since HU-13 (immediate victory, time cap)
    ['Simulating', 'Victory'],
    ['Title', 'Firing'],
    ['Victory', 'GameOver'],
  ];
  for (const [from, to] of illegal) {
    test(`${from} -> ${to} throws and keeps the state`, () => {
      const fsm = at(from);
      expect(() => fsm.transition(to)).toThrow(/illegal transition/i);
      expect(fsm.state).toBe(from);
    });
  }

  test('no state ever returns to Loading or Title', () => {
    for (const from of STATES) {
      for (const to of ['Loading', 'Title']) {
        if (from === 'Loading' && to === 'Title') continue;
        expect(() => at(from).transition(to), `${from} -> ${to}`).toThrow(/illegal transition/i);
      }
    }
  });

  test('non-strict mode refuses an illegal transition without throwing', () => {
    const fsm = at('Loading', { strict: false });
    expect(fsm.transition('Aiming')).toBe(false);
    expect(fsm.state).toBe('Loading');
  });

  test('unknown target state is illegal', () => {
    expect(() => new Fsm().transition('Paused')).toThrow(/illegal transition/i);
  });

  test('can() reports legality and onEnter fires after the switch', () => {
    const seen = [];
    const fsm = new Fsm({ onEnter: { Title: (from) => seen.push(`${from}->${fsm.state}`) } });
    expect(fsm.can('Aiming')).toBe(false);
    expect(fsm.can('Title')).toBe(true);
    fsm.transition('Title');
    expect(seen).toEqual(['Loading->Title']);
  });
});
