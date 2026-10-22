// Traceability (openspec test-harness "Traceability to the QA cases"): every QA case in the coverage matrices of
// Design/casos/hu-10-11-casos-de-prueba.md (HU-10, HU-11) and hu-14-casos-de-prueba.md (HU-14) appears in at
// least one automated test title.
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ids = (name) => [...new Set(readFileSync(join(root, 'Design/casos', name), 'utf8').match(/CP-\d{2}/g))].sort();
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `CP-${String(from + i).padStart(2, '0')}`);
const hu1011 = ids('hu-10-11-casos-de-prueba.md');
const hu14 = ids('hu-14-casos-de-prueba.md');
const cases = [...new Set([...hu1011, ...hu14])].sort();

function specs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? specs(path) : name.endsWith('.spec.js') ? [path] : [];
  });
}

test('the QA matrices list CP-01 to CP-35 (HU-10, HU-11) and CP-36 to CP-44 (HU-14)', () => {
  expect(hu1011.filter((id) => id <= 'CP-35')).toEqual(range(1, 35));
  expect(hu14.filter((id) => id >= 'CP-36')).toEqual(range(36, 44));
  expect(cases).toEqual(range(1, 44));
});

test('every QA case is referenced by at least one test title', () => {
  const titles = specs(join(root, 'tests'))
    .map((f) => readFileSync(f, 'utf8'))
    .flatMap((src) => [...src.matchAll(/\b(?:test|modeOne)\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]));
  const missing = cases.filter((id) => !titles.some((t) => t.includes(id)));
  expect(missing).toEqual([]);
});
