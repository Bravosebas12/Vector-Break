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

// Board (mockup screen 01): panel fill, 32 px decorative grid, launch line.
export const BOARD_STYLE = Object.freeze({
  fill: 'rgba(10,13,18,.78)',
  grid: 'rgba(255,255,255,.025)',
  radius: 6,
});

// Per block type: atlas frame, HP number color (mockup NUM) and destruction burst color.
export const BLOCK_FRAME = Object.freeze({ standard: 'brick_low', reinforced: 'brick_mid', core: 'brick_high', indestructible: 'brick_steel' });
export const BLOCK_TEXT = Object.freeze({ standard: '#E9FFFB', reinforced: '#FFE1B3', core: '#FFE0F0' });
export const BURST = Object.freeze({ standard: COLORS.cyan, reinforced: COLORS.amber, core: COLORS.magenta, indestructible: COLORS.steel });

// Translucent overlays used on the board.
export const FX = Object.freeze({
  hitFlash: 'rgba(255,255,255,0.6)', // design E5: white, alpha 0.6, 60 ms
  launcherGlow: 'rgba(0,245,212,.35)',
  white: '#FFFFFF',
});
