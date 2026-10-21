// Mockup color tokens for canvas drawing (Design/Game UI). Mirrors the --c-* custom properties in
// styles.css one to one (checked by tests/unit/theme.spec.js); no other module hardcodes a color.
export const COLORS = Object.freeze({
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
});

export const FONT_UI = '"IBM Plex Sans", system-ui, sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
