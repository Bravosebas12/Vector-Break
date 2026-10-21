import { test, expect } from '@playwright/test';
// S2: Node-side ESM import of a pure module by explicit .js path, no `page` fixture.
import * as vectorModule from '../../src/js/engine/Vector2D.js';

test('S2: pure engine module imports Node-side and exports are callable', () => {
  expect(Object.keys(vectorModule)).toEqual(['Vector2D']);
  expect(typeof vectorModule.Vector2D).toBe('function');
  expect(vectorModule.Vector2D.name).toBe('Vector2D');
  expect(new vectorModule.Vector2D()).toBeInstanceOf(vectorModule.Vector2D);
});

test('S2: dynamic import of another src module works too', async () => {
  const mod = await import('../../src/js/system/ObjectPool.js');
  expect(Object.keys(mod)).toEqual(['ObjectPool']);
});
