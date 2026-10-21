// Board B1: a validated level turned into entities on the 9x12 grid (board coordinates).
import { Block } from '../entities/Block.js';
import { Multiplier } from '../entities/Multiplier.js';
import { BOARD_W, CELL_H, CELL_W, LAUNCHER_Y, cellMinX, cellMinY } from './Layout.js';

export class Board {
  // Builds a board from level JSON. Callers validate first (see LevelValidator).
  static fromLevel(level) {
    const board = new Board();
    board.id = level.id;
    board.name = level.name;
    board.cols = level.grid.cols;
    board.rows = level.grid.rows;
    board.shots = level.shots;
    board.startBalls = level.startBalls;
    board.launcher = { x: level.launcher.x * BOARD_W, y: LAUNCHER_Y };
    board.cells = new Array(board.cols * board.rows).fill(null);
    board.blocks = [];
    board.orbs = [];
    board.cores = [];
    for (const def of level.blocks) {
      const entity =
        def.type === 'multiplier'
          ? new Multiplier(def.col, def.row, def.value)
          : new Block(def.type, def.col, def.row, def.hp ?? 0);
      board.cells[def.row * board.cols + def.col] = entity;
      if (def.type === 'multiplier') board.orbs.push(entity);
      else board.blocks.push(entity);
      if (def.type === 'core') board.cores.push(entity);
    }
    return board;
  }

  static cellRect(col, row) {
    return { x: cellMinX(col), y: cellMinY(row), w: CELL_W, h: CELL_H };
  }

  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  // Entity at a cell (block or orb), null when empty or out of bounds.
  entityAt(col, row) {
    return this.inBounds(col, row) ? this.cells[row * this.cols + col] : null;
  }

  typeAt(col, row) {
    return this.entityAt(col, row)?.type ?? null;
  }

  // Physics world contract: solid blocks only, orbs never collide.
  blockAt(col, row) {
    const e = this.entityAt(col, row);
    return e instanceof Block ? e : null;
  }
}
