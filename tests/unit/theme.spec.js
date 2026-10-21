// Color tokens: openspec visual-theme spec "Single source of color tokens".
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { COLORS } from '../../src/js/system/Theme.js';

const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const cssTokens = () => Object.fromEntries([...css.matchAll(/--c-([a-z-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));

const MOCKUP = {
  body: '#080A0E',
  stage: '#0E1117',
  grid: '#141923',
  border: '#2A2E39',
  text: '#E7EAF0',
  textStrong: '#F4F7FB',
  textMuted: '#8A93A6',
  textDim: '#5D6578',
  cyan: '#00F5D4',
  amber: '#FF9E00',
  magenta: '#F72585',
  violet: '#7209B7',
  steel: '#2B2D42',
};

test('Theme.js holds the mockup tokens and is frozen', () => {
  expect(COLORS).toMatchObject(MOCKUP);
  expect(Object.isFrozen(COLORS)).toBe(true);
});

test('every Theme.js token has the same value as its --c-* custom property in styles.css', () => {
  const tokens = cssTokens();
  for (const [name, value] of Object.entries(COLORS)) expect(tokens[kebab(name)], name).toBe(value);
  expect(Object.keys(tokens).sort()).toEqual(Object.keys(COLORS).map(kebab).sort());
});
