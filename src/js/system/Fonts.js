// Self-hosted UI fonts (@font-face in styles.css). Canvas text does not re-render when a webfont
// arrives, so boot waits for the faces the canvas uses before the board is first drawn.
const FACES = ['400 16px "IBM Plex Sans"', '600 16px "IBM Plex Sans"', '700 20px "JetBrains Mono"', '800 20px "JetBrains Mono"'];

// Resolves when every face is usable; rejects when one is missing (the loader treats that as settled).
export async function loadFonts(fonts = document.fonts) {
  const loaded = await Promise.all(FACES.map((face) => fonts.load(face)));
  if (loaded.some((list) => list.length === 0)) throw new Error('font face unavailable');
  return true;
}
