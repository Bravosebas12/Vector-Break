// Rules: .claude/skills/level-design-architect/SKILL.md
// Block types and HP ranges (level-loading spec). `null` range = type carries no HP.

export const HP_RANGES = Object.freeze({
  standard: Object.freeze([1, 15]),
  reinforced: Object.freeze([20, 80]),
  core: Object.freeze([100, 500]),
  indestructible: null,
  multiplier: null,
});

export const BLOCK_TYPES = Object.freeze(Object.keys(HP_RANGES));

// Trap walls: balls cannot pass and never destroy them cheaply (design P4: standard is not one).
const TRAP_WALL_TYPES = new Set(['indestructible', 'reinforced', 'core']);

export function isTrapWallType(type) {
  return TRAP_WALL_TYPES.has(type);
}

// Solid obstacle with an HP; orbs (`multiplier`) are separate entities and never collide.
export class Block {
  constructor(type, col, row, hp = 0) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.hp = hp;
  }

  get destructible() {
    return this.type !== 'indestructible';
  }
}
