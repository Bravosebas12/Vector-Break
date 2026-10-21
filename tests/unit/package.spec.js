// test-harness spec "No runtime dependency": the game ships with zero runtime packages.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test.describe('package.json', () => {
  test('declares no runtime dependencies', () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  test('only devDependency is @playwright/test pinned to 1.63.0', () => {
    expect(pkg.devDependencies).toEqual({ '@playwright/test': '1.63.0' });
  });
});
