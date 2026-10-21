// Audio seam: openspec audio spec (Test seam, Combo ladder, Event sounds, Voice limits, Fallback).
import { test, expect } from '@playwright/test';
import {
  NullSink,
  RecordingSink,
  createComboLadder,
  comboSound,
  createVoiceLimiter,
  detuneCents,
  createSoundMapper,
  synthRecipe,
  RECIPE_NAMES,
} from '../../src/js/system/AudioSinks.js';
import { EventRing } from '../../src/js/system/EventRing.js';
import { boot, openField, fire, stepUntil, turnOver } from './helpers/session.js';

const STATE_RESOLVING = 5;
const types = (sink) => sink.log.filter((c) => c.call === 'play').map((c) => c.type);

test.describe('sinks', () => {
  test('the null sink accepts every call and records nothing', () => {
    const sink = new NullSink();
    sink.unlock();
    sink.play('sfx_ui_click', {});
    sink.music(true);
    sink.setVolume(0.5);
    expect(sink.state).toBe('none');
  });

  test('the recording sink keeps every call in order and exposes a copy', () => {
    const sink = new RecordingSink();
    sink.unlock();
    sink.music(true);
    sink.play('sfx_orb_split', { step: 0 });
    sink.setVolume(0.3);
    expect(sink.log.map((c) => c.call)).toEqual(['unlock', 'music', 'play', 'setVolume']);
    expect(sink.log[2]).toEqual({ call: 'play', type: 'sfx_orb_split', opts: { step: 0 } });
    expect(sink.state).toBe('running');
    const copy = sink.audioLog();
    copy.length = 0;
    expect(sink.log).toHaveLength(4);
  });
});

test.describe('combo ladder', () => {
  const steps = (times) => {
    const ladder = createComboLadder();
    return times.map((t) => ladder.hit(t));
  };

  test('hits within 250 ms rise by one', () => expect(steps([0, 100, 200])).toEqual([0, 1, 2]));
  test('a gap over 250 ms resets to step 0', () => expect(steps([0, 300, 400])).toEqual([0, 0, 1]));
  test('exactly 250 ms still counts as consecutive', () => expect(steps([0, 250])).toEqual([0, 1]));
  test('reset() (turn end) restarts the ladder', () => {
    const ladder = createComboLadder();
    ladder.hit(0);
    ladder.hit(10);
    ladder.reset();
    expect(ladder.hit(20)).toBe(0);
  });
  test('the step is capped at 47 after 60 consecutive hits', () => {
    const out = steps(Array.from({ length: 60 }, (_, i) => i * 10));
    expect(Math.max(...out)).toBe(47);
    expect(out[59]).toBe(47);
  });

  test('steps 0-11 pick b00..b11 and steps >= 12 replay b11 faster', () => {
    expect(comboSound(0)).toEqual({ type: 'sfx_impact_std_b00', rate: 1 });
    expect(comboSound(11)).toEqual({ type: 'sfx_impact_std_b11', rate: 1 });
    const s12 = comboSound(12);
    expect(s12.type).toBe('sfx_impact_std_b11');
    expect(s12.rate).toBeCloseTo(2 ** (33 / 1200), 10);
    expect(comboSound(47).rate).toBeCloseTo(2 ** ((36 * 33) / 1200), 10);
  });
});

test.describe('voice limits', () => {
  test('30 distinct-type requests at once leave 24 active voices', () => {
    const limiter = createVoiceLimiter();
    const admitted = Array.from({ length: 30 }, (_, i) => limiter.admit(`t${i}`, 0, 500)).filter(Boolean);
    expect(admitted).toHaveLength(24);
    expect(limiter.active(0)).toBe(24);
  });

  test('a same-type request within 15 ms is dropped, one at 15 ms or later is not', () => {
    const limiter = createVoiceLimiter();
    expect(limiter.admit('a', 0, 500)).toBe(true);
    expect(limiter.admit('a', 10, 500)).toBe(false);
    expect(limiter.admit('a', 15, 500)).toBe(true);
  });

  test('finished voices free their slot', () => {
    const limiter = createVoiceLimiter();
    for (let i = 0; i < 24; i++) limiter.admit(`t${i}`, 0, 100);
    expect(limiter.admit('late', 50, 100)).toBe(false);
    expect(limiter.admit('late', 100, 100)).toBe(true);
  });

  test('detune stays within +-5 cents', () => {
    expect(detuneCents(0)).toBe(-5);
    expect(detuneCents(0.5)).toBe(0);
    expect(detuneCents(1)).toBe(5);
  });
});

test.describe('event-to-sound mapping', () => {
  const setup = () => {
    const sink = new RecordingSink();
    const clock = { t: 0 };
    return { sink, clock, onEvent: createSoundMapper({ audio: sink, now: () => clock.t }) };
  };

  test('damageable hits climb the ladder; titanium and orbs use their own sounds', () => {
    const { sink, clock, onEvent } = setup();
    for (const t of [0, 100, 200]) {
      clock.t = t;
      onEvent('HIT', 3, 0);
    }
    onEvent('STEEL', 4, 0);
    onEvent('ORB', 5, 0);
    expect(types(sink)).toEqual([
      'sfx_impact_std_b00',
      'sfx_impact_std_b01',
      'sfx_impact_std_b02',
      'sfx_impact_steel',
      'sfx_orb_split',
    ]);
    expect(sink.log.filter((c) => c.call === 'play').map((c) => c.opts.step ?? null)).toEqual([0, 1, 2, null, null]);
  });

  test('destruction plays the destroy sound, FIRE the launch sound', () => {
    const { sink, onEvent } = setup();
    onEvent('DESTROY', 3, 0);
    onEvent('FIRE', 1, 0);
    expect(types(sink)).toEqual(['sfx_impact_std_b00', 'sfx_block_destroy', 'sfx_burst_launch']);
  });

  test('a gap resets the ladder and entering Resolving resets it too', () => {
    const { sink, clock, onEvent } = setup();
    onEvent('HIT', 1, 0);
    clock.t = 300;
    onEvent('HIT', 1, 0);
    clock.t = 350;
    onEvent('HIT', 1, 0);
    onEvent('STATE', STATE_RESOLVING, 0);
    clock.t = 360;
    onEvent('HIT', 1, 0);
    expect(sink.log.map((c) => c.opts?.step)).toEqual([0, 0, 1, 0]);
  });

  test('screen events map to pending sounds; unknown events are ignored', () => {
    const { sink, onEvent } = setup();
    onEvent('SPEED', 4, 0);
    onEvent('PAUSE', 0, 0);
    onEvent('RESUME', 0, 0);
    onEvent('STATE', 6, 0);
    onEvent('STATE', 7, 0);
    onEvent('STATE', 2, 0);
    onEvent('NOPE', 0, 0);
    expect(types(sink)).toEqual(['sfx_speed_x4', 'sfx_ui_pause_in', 'sfx_ui_pause_out', 'sfx_victory', 'sfx_defeat']);
  });

  test('a real session turn feeds the mapper through a single drain', () => {
    const s = openField(boot(), [
      { type: 'standard', col: 4, row: 8, hp: 1 },
      { type: 'indestructible', col: 4, row: 6 },
    ]);
    s.setVolley(1);
    const { sink, onEvent } = setup();
    fire(s);
    let seen = 0;
    stepUntil(s, (snap) => {
      s.drainEvents((...e) => (seen++, onEvent(...e)));
      return turnOver(snap);
    });
    expect(seen).toBeGreaterThan(0);
    expect(types(sink)).toEqual(expect.arrayContaining(['sfx_burst_launch', 'sfx_block_destroy']));
    expect(types(sink).some((t) => t.startsWith('sfx_impact_std_'))).toBe(true);
  });

  test('a session orb capture and a titanium hit emit ORB and STEEL events', () => {
    const run = (extra) => {
      const s = openField(boot(), extra);
      s.setVolley(1);
      fire(s);
      const out = [];
      stepUntil(s, (snap) => {
        s.drainEvents((type) => out.push(type));
        return turnOver(snap);
      });
      return out;
    };
    expect(run([{ type: 'multiplier', col: 4, row: 8, value: 2 }])).toContain('ORB');
    const steel = run([{ type: 'indestructible', col: 4, row: 8 }]);
    expect(steel).toContain('STEEL');
    expect(steel).not.toContain('HIT');
  });

  test('the ring is drained once even when two consumers are attached', () => {
    const ring = new EventRing();
    ring.push('HIT', 1);
    const a = [];
    const b = [];
    ring.drain((type) => (a.push(type), b.push(type)));
    ring.drain((type) => b.push(type));
    expect([a, b]).toEqual([['HIT'], ['HIT']]);
  });
});

test.describe('synth recipes', () => {
  test('every wired pending screen sound has a recipe; aim_cancel is unwired', () => {
    expect(RECIPE_NAMES).toEqual(
      expect.arrayContaining([
        'sfx_ui_pause_in',
        'sfx_ui_pause_out',
        'sfx_speed_x1',
        'sfx_speed_x2',
        'sfx_speed_x4',
        'sfx_turns_warning',
        'sfx_turns_critical',
        'sfx_victory',
        'sfx_star_1',
        'sfx_star_2',
        'sfx_star_3',
        'sfx_defeat',
      ]),
    );
    expect(RECIPE_NAMES).not.toContain('sfx_aim_cancel');
  });

  test('every recipe name resolves to layers; unknown names return null', () => {
    for (const name of RECIPE_NAMES) expect(synthRecipe(name).layers.length, name).toBeGreaterThan(0);
    expect(synthRecipe('sfx_nope')).toBeNull();
  });

  test('speed ticks pulse 1/2/4 times inside 80 ms; star 3 adds a detuned partial', () => {
    for (const n of [1, 2, 4]) {
      const { layers } = synthRecipe(`sfx_speed_x${n}`);
      expect(layers).toHaveLength(n);
      expect(Math.max(...layers.map((l) => l.t0 + l.dur))).toBeLessThanOrEqual(0.08 + 0.012 + 1e-9);
    }
    expect(synthRecipe('sfx_star_3').layers).toHaveLength(2);
    expect(synthRecipe('sfx_star_1').layers).toHaveLength(1);
  });

  test('the impact fallback follows 330 * 2^(step/24) Hz', () => {
    expect(synthRecipe('sfx_impact_std_b00').layers[0].f0).toBeCloseTo(330, 6);
    expect(synthRecipe('sfx_impact_std_b11').layers[0].f0).toBeCloseTo(330 * 2 ** (11 / 24), 6);
    expect(synthRecipe('sfx_impact_std_b11', { step: 24 }).layers[0].f0).toBeCloseTo(660, 6);
  });
});
