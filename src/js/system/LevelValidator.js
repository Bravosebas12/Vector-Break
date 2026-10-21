// Hand-written validator for level.schema.json plus grid, launcher, trap and reachability rules.
// Returns { valid, errors: [{ code, field?, message }] }; never throws on bad input.
import { BLOCK_TYPES, HP_RANGES } from '../entities/Block.js';
import { Board } from './Board.js';
import { isLauncherXValid } from './Layout.js';
import { findTraps } from './TrapAnalysis.js';

const REQUIRED = ['id', 'name', 'grid', 'launcher', 'shots', 'startBalls', 'blocks'];
const isInt = (v) => Number.isInteger(v);
const inRange = (v, lo, hi) => isInt(v) && v >= lo && v <= hi;

// Static reachability is completed in slice 4 (Raycaster.sweep); until then it reports nothing.
const staticReachabilityStub = () => [];

export function validateLevel(level, { reachability = staticReachabilityStub } = {}) {
  const errors = [];
  const add = (code, field, message) => errors.push({ code, field, message: message ?? `${code}: ${field}` });
  const bad = (field, why) => add('INVALID_FIELD', field, `${field} ${why}`);

  if (level === null || typeof level !== 'object' || Array.isArray(level)) {
    add('INVALID_LEVEL', 'level', 'level must be an object');
    return { valid: false, errors };
  }
  for (const f of REQUIRED) if (!(f in level)) add('MISSING_FIELD', f, `missing required field ${f}`);

  if ('id' in level && !/^level-[0-9]{2,3}$/.test(level.id)) bad('id', 'must match level-NN');
  if ('name' in level && !(typeof level.name === 'string' && level.name.length >= 1 && level.name.length <= 40)) {
    bad('name', 'must be 1-40 characters');
  }
  if ('shots' in level && !inRange(level.shots, 1, 50)) bad('shots', 'must be an integer 1-50');
  if ('startBalls' in level && !inRange(level.startBalls, 1, 200)) bad('startBalls', 'must be an integer 1-200');
  if ('grid' in level) {
    if (!level.grid || !inRange(level.grid.cols, 5, 15)) bad('grid.cols', 'must be an integer 5-15');
    if (!level.grid || !inRange(level.grid.rows, 6, 20)) bad('grid.rows', 'must be an integer 6-20');
  }
  if ('launcher' in level) {
    const x = level.launcher?.x;
    if (typeof x !== 'number' || x < 0 || x > 1) bad('launcher.x', 'must be a number 0-1');
    else if (!isLauncherXValid(x)) add('LAUNCHER_OUT_OF_RANGE', 'launcher.x', 'launcher.x is outside the playable range');
  }
  if ('blocks' in level) {
    if (!Array.isArray(level.blocks) || level.blocks.length < 1) bad('blocks', 'must be a non-empty array');
    else validateBlocks(level, add, bad);
  }
  if (errors.length > 0) return { valid: false, errors };

  const board = Board.fromLevel(level);
  errors.push(...findTraps(board), ...reachability(board));
  return { valid: errors.length === 0, errors };
}

function validateBlocks(level, add, bad) {
  const cols = inRange(level.grid?.cols, 5, 15) ? level.grid.cols : 9;
  const rows = inRange(level.grid?.rows, 6, 20) ? level.grid.rows : 12;
  const seen = new Set();
  let cores = 0;
  level.blocks.forEach((b, i) => {
    const at = `blocks[${i}]`;
    if (!b || !BLOCK_TYPES.includes(b.type)) return add('BAD_TYPE', `${at}.type`, `${at} has an unknown type`);
    if (!isInt(b.col) || !isInt(b.row) || b.col < 0 || b.row < 0 || b.col >= cols || b.row >= rows) {
      return add('OUT_OF_BOUNDS', at, `${at} (${b.col},${b.row}) is outside the ${cols}x${rows} grid`);
    }
    const cell = `${b.col},${b.row}`;
    if (seen.has(cell)) add('DUPLICATE_CELL', at, `${at} duplicates cell (${cell})`);
    seen.add(cell);
    if (b.type === 'core') cores++;

    const range = HP_RANGES[b.type];
    const allowed = new Set(['type', 'col', 'row', range ? 'hp' : null, b.type === 'multiplier' ? 'value' : null]);
    for (const k of Object.keys(b)) if (!allowed.has(k)) add('UNEXPECTED_FIELD', `${at}.${k}`, `${at} must not have ${k}`);
    if (range && !inRange(b.hp, range[0], range[1])) {
      add('BAD_HP', `${at}.hp`, `${at} ${b.type} hp must be an integer ${range[0]}-${range[1]}`);
    }
    if (b.type === 'multiplier' && !inRange(b.value, 1, 5)) bad(`${at}.value`, 'must be an integer 1-5');
  });
  if (cores === 0) add('NO_CORE', 'blocks', 'level needs at least one core');
}
