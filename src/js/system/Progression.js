// DOM-free progression: star rating, score, best-record rule, in-session unlock (A1, A5, D1, D4) and the
// sin resolver mark of skipped levels (HU-12, D-12.5).
export const UNUSED_BONUS = 100; // P1: fixed bonus per unused shot
export const RECORDS_KEY = 'anglecraft.v1.records';
export const SKIPPED_KEY = 'anglecraft.v1.skipped';

export function starRating(shots, limit) {
  return shots === 1 ? 3 : shots <= Math.floor(limit / 2) ? 2 : 1;
}

export const scoreOf = (damage, unused) => damage + UNUSED_BONUS * unused;

// D4: stars desc, then score desc, then shots asc.
export function isBetter(a, b) {
  if (a.stars !== b.stars) return a.stars > b.stars;
  if (a.score !== b.score) return a.score > b.score;
  return a.shots < b.shots;
}

// Storage access may throw (private mode, quota, blocked): the game then runs on the in-memory copy.
function load(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(RECORDS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadSkipped(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SKIPPED_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
}

function save(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // memory-only from here on
  }
}

// Reading `localStorage` itself can throw a SecurityError.
function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createProgression({ storage = defaultStorage() } = {}) {
  const records = load(storage);
  const won = new Set(); // D1: unlock lives in the session; records persist across sessions
  const skipped = loadSkipped(storage); // HU-12: skipped levels without a record, persisted for HU-07

  return {
    record: (index) => records[index] ?? null,
    canAccess: (index) => index === 0 || won.has(index - 1),
    status: (index) => (records[index] ? 'resolved' : skipped.has(index) ? 'unsolved' : 'unplayed'),
    // A skip never touches a record and unlocks nothing; a solved level stays solved.
    markSkipped(index) {
      if (records[index] || skipped.has(index)) return;
      skipped.add(index);
      save(storage, SKIPPED_KEY, [...skipped]);
    },
    submit(index, result) {
      won.add(index);
      if (skipped.delete(index)) save(storage, SKIPPED_KEY, [...skipped]);
      const stored = records[index];
      if (stored && !isBetter(result, stored)) return false;
      records[index] = { stars: result.stars, score: result.score, shots: result.shots };
      save(storage, RECORDS_KEY, records);
      return true;
    },
  };
}
