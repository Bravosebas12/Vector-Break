// Traceability (openspec change anglecraft-v1-launcher-and-fire-mode, test-harness delta): every QA case in the
// coverage matrix of Design/casos/hu-10-11-casos-de-prueba.md appears in at least one automated test title.
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const matrix = readFileSync(join(root, 'Design/casos/hu-10-11-casos-de-prueba.md'), 'utf8');
const cases = [...new Set(matrix.match(/CP-\d{2}/g))].sort();

function specs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? specs(path) : name.endsWith('.spec.js') ? [path] : [];
  });
}

test('the QA matrix lists CP-01 to CP-35', () => {
  expect(cases).toEqual(Array.from({ length: 35 }, (_, i) => `CP-${String(i + 1).padStart(2, '0')}`));
});

test('every QA case is referenced by at least one test title', () => {
  const titles = specs(join(root, 'tests'))
    .map((f) => readFileSync(f, 'utf8'))
    .flatMap((src) => [...src.matchAll(/\btest\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]));
  const missing = cases.filter((id) => !titles.some((t) => t.includes(id)));
  expect(missing).toEqual([]);
});
