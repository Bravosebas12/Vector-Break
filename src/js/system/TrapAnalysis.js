// Loop-trap analysis (design "Loop trap"): graph over grid cells plus a virtual LAUNCH node
// joined to every passable cell of the last row. Passable = empty, standard, multiplier.
import { isTrapWallType } from '../entities/Block.js';

const MAX_POCKET = 12;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const key = (col, row) => `${col},${row}`;

// Out of bounds (side walls, ceiling, floor) and trap-wall types block; everything else passes.
function passable(board, col, row) {
  if (!board.inBounds(col, row)) return false;
  const type = board.typeAt(col, row);
  return type === null || !isTrapWallType(type);
}

// Cells reachable from `seeds` over passable cells, never entering `blocked`.
function flood(board, seeds, blocked = new Set()) {
  const seen = new Set();
  const stack = seeds.filter((c) => passable(board, c.col, c.row) && !blocked.has(key(c.col, c.row)));
  for (const c of stack) seen.add(key(c.col, c.row));
  while (stack.length > 0) {
    const { col, row } = stack.pop();
    for (const [dc, dr] of DIRS) {
      const next = { col: col + dc, row: row + dr };
      const k = key(next.col, next.row);
      if (seen.has(k) || blocked.has(k) || !passable(board, next.col, next.row)) continue;
      seen.add(k);
      stack.push(next);
    }
  }
  return seen;
}

function launchSeeds(board) {
  return Array.from({ length: board.cols }, (_, col) => ({ col, row: board.rows - 1 }));
}

function passableNeighbours(board, core) {
  return DIRS.map(([dc, dr]) => ({ col: core.col + dc, row: core.row + dr })).filter((c) =>
    passable(board, c.col, c.row),
  );
}

// E is 1 passable cell or 2 4-adjacent passable cells, all connected to LAUNCH; removing E
// strands the core's remaining pocket (1..12 cells) from LAUNCH.
function isEntry(board, core, entry, connected) {
  const cells = entry.map((c) => key(c.col, c.row));
  const adjacent = entry.length === 1 || Math.abs(entry[0].col - entry[1].col) + Math.abs(entry[0].row - entry[1].row) === 1;
  if (!adjacent || !entry.every((c) => connected.has(key(c.col, c.row)))) return false;
  const removed = new Set(cells);
  const pocket = flood(board, passableNeighbours(board, core), removed);
  if (pocket.size < 1 || pocket.size > MAX_POCKET) return false;
  return ![...pocket].some((k) => Number(k.split(',')[1]) === board.rows - 1);
}

export function isTrapEntry(board, core, entry) {
  if (entry.length < 1 || entry.length > 2) return false;
  return isEntry(board, core, entry, flood(board, launchSeeds(board)));
}

// One error per core that is not seated in a loop trap.
export function findTraps(board) {
  const connected = flood(board, launchSeeds(board));
  const candidates = [...connected].map((k) => {
    const [col, row] = k.split(',').map(Number);
    return { col, row };
  });
  const errors = [];
  for (const core of board.cores) {
    const at = { col: core.col, row: core.row };
    const code = !passableNeighbours(board, core).some((c) => connected.has(key(c.col, c.row)))
      ? 'TRAP_CLOSED'
      : hasEntry(board, at, candidates, connected)
        ? null
        : 'TRAP_ENTRY_TOO_WIDE';
    if (code) errors.push({ code, col: core.col, row: core.row, message: `${code} at core (${core.col},${core.row})` });
  }
  return errors;
}

function hasEntry(board, core, candidates, connected) {
  for (const a of candidates) {
    if (isEntry(board, core, [a], connected)) return true;
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const b = { col: a.col + dc, row: a.row + dr };
      if (connected.has(key(b.col, b.row)) && isEntry(board, core, [a, b], connected)) return true;
    }
  }
  return false;
}
