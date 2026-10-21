import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Board } from '../../src/js/system/Board.js';
import { findTraps, isTrapEntry } from '../../src/js/system/TrapAnalysis.js';

const TYPES = { S: 'standard', R: 'reinforced', I: 'indestructible', C: 'core', M: 'multiplier' };

// ASCII board, row 0 first, 9 chars per row; missing rows are empty. '.' = empty.
function boardOf(...rows) {
  const blocks = [];
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch === '.') return;
      const type = TYPES[ch];
      blocks.push({ type, col, row, ...(type === 'multiplier' ? { value: 1 } : { hp: { standard: 3, reinforced: 30, core: 100 }[type] }) });
    });
  });
  return Board.fromLevel({ id: 'level-99', name: 't', grid: { cols: 9, rows: 12 }, launcher: { x: 0.5 }, shots: 5, startBalls: 3, blocks });
}
const codes = (b) => findTraps(b).map((e) => e.code);
const cell = (col, row) => ({ col, row });
const fixture = (n) =>
  Board.fromLevel(JSON.parse(readFileSync(new URL(`../../src/levels/level${n}.json`, import.meta.url), 'utf8')));

test.describe('authored levels', () => {
  const entries = [
    [1, cell(4, 1), [cell(3, 2)]],
    [2, cell(7, 1), [cell(6, 2)]],
    [3, cell(4, 4), [cell(4, 6)]],
  ];
  for (const [n, core, entry] of entries) {
    test(`level ${n}: no trap errors and the authored entry is a trap entry`, () => {
      const board = fixture(n);
      expect(findTraps(board)).toEqual([]);
      expect(isTrapEntry(board, core, entry)).toBe(true);
    });
  }

  test('a wrong entry cell is not a trap entry', () => {
    expect(isTrapEntry(fixture(1), cell(4, 1), [cell(0, 11)])).toBe(false);
  });
});

test.describe('findTraps', () => {
  // Walls of kind `ch` around a core in a notch whose only opening is (4,3).
  const notch = (ch) => boardOf('', `...${ch.repeat(3)}...`, `...${ch}C${ch}...`, `...${ch}.${ch}...`);

  test('1-cell entry with a 1-cell pocket is valid', () => {
    expect(codes(notch('I'))).toEqual([]);
  });

  test('2-cell entry is valid', () => {
    expect(codes(boardOf('', '..IIIII..', '..I.C.I..', '..I...I..', '..I..II..'))).toEqual([]);
  });

  test('closed trap -> TRAP_CLOSED (also with reinforced walls)', () => {
    expect(codes(boardOf('', '..IIIII..', '..I.C.I..', '..IIIII..'))).toEqual(['TRAP_CLOSED']);
    expect(codes(boardOf('', '..RRRRR..', '..R.C.R..', '..RRRRR..'))).toEqual(['TRAP_CLOSED']);
  });

  test('3-cell entry -> TRAP_ENTRY_TOO_WIDE', () => {
    expect(codes(boardOf('', '..IIIII..', '..I.C.I..', '..I...I..'))).toEqual(['TRAP_ENTRY_TOO_WIDE']);
  });

  test('core in the open -> TRAP_ENTRY_TOO_WIDE', () => {
    expect(codes(boardOf('', '', '....C....'))).toEqual(['TRAP_ENTRY_TOO_WIDE']);
  });

  test('standard blocks are never trap walls', () => {
    expect(codes(notch('S'))).toEqual(['TRAP_ENTRY_TOO_WIDE']);
  });

  test('multiplier orbs are passable (an orb can be the entry)', () => {
    expect(codes(boardOf('', '...III...', '...ICI...', '...IMI...'))).toEqual([]);
  });

  test('pocket larger than 12 cells -> TRAP_ENTRY_TOO_WIDE', () => {
    expect(codes(boardOf('C........', '.........', '.........', 'IIIIIIII.'))).toEqual(['TRAP_ENTRY_TOO_WIDE']);
  });

  test('every failing core reports its own error', () => {
    const errors = findTraps(boardOf('C.......C'));
    expect(errors.map((e) => [e.col, e.row])).toEqual([[0, 0], [8, 0]]);
  });
});
