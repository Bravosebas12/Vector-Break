// Level list plus atomic loading: a level is validated and built off to the side, then swapped in.
import { Board } from './Board.js';
import { validateLevel } from './LevelValidator.js';

export class LevelError extends Error {
  constructor(errors, message = 'invalid level') {
    super(`${message}: ${errors.map((e) => e.message).join('; ')}`);
    this.name = 'LevelError';
    this.errors = errors;
  }
}

export class LevelCatalog {
  constructor(validate = validateLevel) {
    this.validate = validate;
    this.levels = [];
    this.board = null;
  }

  get length() {
    return this.levels.length;
  }

  // All-or-nothing: one invalid level rejects the whole set and keeps the previous one.
  setLevels(levels) {
    levels.forEach((level, i) => {
      const { valid, errors } = this.validate(level);
      if (!valid) throw new LevelError(errors, `level ${i} is invalid`);
    });
    this.levels = [...levels];
  }

  // indexOrJson: catalog index or a level object. Throws LevelError; `this.board` stays untouched.
  loadLevel(indexOrJson) {
    const level = typeof indexOrJson === 'number' ? this.levels[indexOrJson] : indexOrJson;
    if (level === undefined) {
      throw new LevelError([{ code: 'UNKNOWN_LEVEL', field: 'index', message: `no level at index ${indexOrJson}` }]);
    }
    const { valid, errors } = this.validate(level);
    if (!valid) throw new LevelError(errors);
    const board = Board.fromLevel(level);
    this.board = board;
    return board;
  }
}
