// Rules: .claude/skills/level-design-architect/SKILL.md
// Multiplier orb: captured by overlap, never a solid obstacle.
import { cellMinX, cellMinY, CELL_W, CELL_H } from '../system/Layout.js';

export const ORB_RADIUS = 24;

export class Multiplier {
  constructor(col, row, value) {
    this.col = col;
    this.row = row;
    this.type = 'multiplier';
    this.value = value;
    this.radius = ORB_RADIUS;
    this.x = cellMinX(col) + CELL_W / 2;
    this.y = cellMinY(row) + CELL_H / 2;
    this.captured = false;
  }
}
