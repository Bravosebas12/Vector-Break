// DOM-free progression: star rating, score, best-record rule and in-session unlock (A1, A5, D1, D4).
export const UNUSED_BONUS = 100; // P1: fixed bonus per unused shot
export const RECORDS_KEY = 'anglecraft.v1.records';

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

  return {
    record: (index) => records[index] ?? null,
    canAccess: (index) => index === 0 || won.has(index - 1),
    submit(index, result) {
      won.add(index);
      const stored = records[index];
      if (stored && !isBetter(result, stored)) return false;
      records[index] = { stars: result.stars, score: result.score, shots: result.shots };
      try {
        storage.setItem(RECORDS_KEY, JSON.stringify(records));
      } catch {
        // memory-only from here on
      }
      return true;
    },
  };
}
