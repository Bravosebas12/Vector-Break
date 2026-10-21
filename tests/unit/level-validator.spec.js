import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { validateLevel } from '../../src/js/system/LevelValidator.js';

const load = (n) =>
  JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8'));

// Valid L1 with the given overrides applied to a deep copy.
function level(mutate = () => {}) {
  const l = structuredClone(load(1));
  mutate(l);
  return l;
}
const codes = (l) => validateLevel(l).errors.map((e) => e.code);
const withBlock = (b) => level((l) => l.blocks.push(b));

test.describe('validateLevel: schema', () => {
  for (const n of [1, 2, 3]) {
    test(`level${n}.json is valid`, () => {
      expect(validateLevel(load(n))).toEqual({ valid: true, errors: [] });
    });
  }

  for (const field of ['id', 'name', 'grid', 'launcher', 'shots', 'startBalls', 'blocks']) {
    test(`missing ${field} names the field`, () => {
      const r = validateLevel(level((l) => delete l[field]));
      expect(r.valid).toBe(false);
      expect(r.errors).toContainEqual(expect.objectContaining({ code: 'MISSING_FIELD', field }));
    });
  }

  const badValues = [
    ['id pattern', (l) => (l.id = 'L1'), 'id'],
    ['empty name', (l) => (l.name = ''), 'name'],
    ['shots 0', (l) => (l.shots = 0), 'shots'],
    ['shots fractional', (l) => (l.shots = 2.5), 'shots'],
    ['startBalls 201', (l) => (l.startBalls = 201), 'startBalls'],
    ['grid cols 4', (l) => (l.grid.cols = 4), 'grid.cols'],
    ['launcher x 1.5', (l) => (l.launcher.x = 1.5), 'launcher.x'],
    ['blocks empty', (l) => (l.blocks = []), 'blocks'],
  ];
  for (const [name, mutate, field] of badValues) {
    test(`rejects ${name}`, () => {
      const r = validateLevel(level(mutate));
      expect(r.errors).toContainEqual(expect.objectContaining({ code: 'INVALID_FIELD', field }));
    });
  }

  test('non-object input is a hard failure, not a throw', () => {
    for (const bad of [null, 42, 'x', []]) expect(validateLevel(bad).valid).toBe(false);
  });
});

test.describe('validateLevel: block types and HP', () => {
  const hpCases = [
    ['standard', 0, false], ['standard', 1, true], ['standard', 15, true], ['standard', 16, false],
    ['reinforced', 19, false], ['reinforced', 20, true], ['reinforced', 80, true], ['reinforced', 81, false],
  ];
  for (const [type, hp, ok] of hpCases) {
    test(`${type} hp ${hp} is ${ok ? 'accepted' : 'rejected'}`, () => {
      const r = validateLevel(withBlock({ type, col: 0, row: 8, hp }));
      expect(r.errors.some((e) => e.code === 'BAD_HP')).toBe(!ok);
    });
  }

  test('core hp 99 / 501 rejected', () => {
    for (const hp of [99, 501]) {
      expect(codes(level((l) => (l.blocks.find((b) => b.type === 'core').hp = hp)))).toContain('BAD_HP');
    }
  });

  test('missing hp on standard is rejected', () => {
    expect(codes(withBlock({ type: 'standard', col: 0, row: 8 }))).toContain('BAD_HP');
  });

  test('hp on indestructible or multiplier is rejected', () => {
    expect(codes(withBlock({ type: 'indestructible', col: 0, row: 8, hp: 5 }))).toContain('UNEXPECTED_FIELD');
    expect(codes(withBlock({ type: 'multiplier', col: 0, row: 8, value: 2, hp: 5 }))).toContain('UNEXPECTED_FIELD');
  });

  test('unknown type and bad multiplier value are rejected', () => {
    expect(codes(withBlock({ type: 'glass', col: 0, row: 8 }))).toContain('BAD_TYPE');
    expect(codes(withBlock({ type: 'multiplier', col: 0, row: 8, value: 6 }))).toContain('INVALID_FIELD');
  });
});

test.describe('validateLevel: grid, core and launcher', () => {
  test('block out of bounds (col 9, row 12, negative, fractional)', () => {
    for (const [col, row] of [[9, 8], [0, 12], [-1, 8], [1.5, 8]]) {
      expect(codes(withBlock({ type: 'standard', col, row, hp: 1 }))).toContain('OUT_OF_BOUNDS');
    }
  });

  test('two blocks in the same cell are rejected', () => {
    expect(codes(withBlock({ type: 'standard', col: 4, row: 1, hp: 1 }))).toContain('DUPLICATE_CELL');
  });

  test('level without a core is rejected', () => {
    expect(codes(level((l) => (l.blocks = l.blocks.filter((b) => b.type !== 'core'))))).toContain('NO_CORE');
  });

  test('launcher.x outside [50, 1030] px is LAUNCHER_OUT_OF_RANGE; edges accepted', () => {
    expect(codes(level((l) => (l.launcher.x = 0.01)))).toContain('LAUNCHER_OUT_OF_RANGE');
    expect(codes(level((l) => (l.launcher.x = 0.99)))).toContain('LAUNCHER_OUT_OF_RANGE');
    for (const x of [50 / 1080, 1030 / 1080, 0.3]) {
      expect(codes(level((l) => (l.launcher.x = x)))).not.toContain('LAUNCHER_OUT_OF_RANGE');
    }
  });

  test('a structurally broken level skips trap analysis (no crash)', () => {
    expect(() => validateLevel(withBlock({ type: 'standard', col: 99, row: 99, hp: 1 }))).not.toThrow();
  });
});

test.describe('validateLevel: trap and reachability wiring', () => {
  test('trap errors surface through validateLevel', () => {
    // Fill the cell below the core pocket opening so the core is fully enclosed.
    const closed = level((l) => l.blocks.push({ type: 'indestructible', col: 3, row: 2 }));
    expect(codes(closed)).toContain('TRAP_CLOSED');
  });

  test('an injected reachability check is called with the board and its errors are reported', () => {
    let seen = null;
    const r = validateLevel(load(1), {
      reachability: (board) => {
        seen = board;
        return [{ code: 'CORE_UNREACHABLE', message: 'stub' }];
      },
    });
    expect(seen.cores).toHaveLength(1);
    expect(r.errors.map((e) => e.code)).toEqual(['CORE_UNREACHABLE']);
  });

  test('the default static reachability accepts the authored level 2', () => {
    expect(validateLevel(load(2)).valid).toBe(true);
  });
});

// ASCII level: row 0 first, 9 chars per row, I indestructible, C core, S standard, '.' empty.
function asciiLevel(...rows) {
  const TYPES = { I: 'indestructible', C: 'core', S: 'standard' };
  const blocks = [];
  rows.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (ch === '.') return;
      blocks.push({ type: TYPES[ch], col, row, ...(ch === 'C' ? { hp: 100 } : ch === 'S' ? { hp: 3 } : {}) });
    }),
  );
  return { id: 'level-98', name: 'ascii', grid: { cols: 9, rows: 12 }, launcher: { x: 0.5 }, shots: 5, startBalls: 3, blocks };
}
const NOTCH = ['', '...III...', '...ICI...', '...I.I...'];
// Serpentine corridor under the notch: each gap is on the far side, so no single bounce threads both.
const SERPENTINE = ['', '', '', '', '', '', '.IIIIIIII', '', 'IIIIIIII.'];

test.describe('validateLevel: core reachability (static geometry)', () => {
  test('a notch with a straight approach is reachable', () => {
    expect(validateLevel(asciiLevel(...NOTCH))).toEqual({ valid: true, errors: [] });
  });

  test('a trap-valid core with no <=1-bounce path to any entry or to the core -> CORE_UNREACHABLE', () => {
    const rows = NOTCH.concat(SERPENTINE.slice(NOTCH.length));
    const r = validateLevel(asciiLevel(...rows));
    expect(r.errors.map((e) => e.code)).toEqual(['CORE_UNREACHABLE']);
    expect(r.errors[0]).toMatchObject({ col: 4, row: 2 });
    expect(r.valid).toBe(false);
  });

  test('standard blocks do not make a core unreachable (the ball removes them)', () => {
    const rows = NOTCH.concat(['', '', '', '', 'SSSSSSSSS']);
    expect(validateLevel(asciiLevel(...rows)).valid).toBe(true);
  });

  test('an injected reachability still replaces the default check', () => {
    const rows = NOTCH.concat(SERPENTINE.slice(NOTCH.length));
    expect(validateLevel(asciiLevel(...rows), { reachability: () => [] }).valid).toBe(true);
  });
});
