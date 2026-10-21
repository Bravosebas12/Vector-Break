// Spritesheet atlas (assets/sprites/spritesheet@{1,2,3}x). Bricks are 128x64 in the sheet and are
// scaled once at load to the 112x56 cell size (x atlas scale) until the sheet is re-exported.
const BRICK_W = 112;
const BRICK_H = 56;
const PRESCALED = /^(brick_|crack_)/;
const PLACEHOLDER_COLOR = '#F72585';

// Detached canvas: OffscreenCanvas when supported, otherwise an unattached DOM canvas.
export function createCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function placeholder(w, h) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PLACEHOLDER_COLOR;
  ctx.fillRect(0, 0, w, h);
  return { source: canvas, sx: 0, sy: 0, sw: w, sh: h };
}

const defaultIo = {
  fetchJson: async (url) => (await fetch(url)).json(),
  loadImage: (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image failed: ${url}`));
      img.src = url;
    }),
};

// Never rejects: a failed sheet or json produces placeholders (rendering "Assets missing").
export async function loadAtlas(scale, io = {}, base = '/assets/sprites') {
  const { fetchJson, loadImage } = { ...defaultIo, ...io };
  const stem = `${base}/spritesheet@${scale}x`;
  const [meta, image] = await Promise.all([
    fetchJson(`${stem}.json`).catch(() => null),
    loadImage(`${stem}.png`).catch(() => null),
  ]);
  const frames = meta ? meta.frames : {};
  const cellW = BRICK_W * scale;
  const cellH = BRICK_H * scale;
  const cache = new Map();
  let prescaleCount = 0;

  const build = (name) => {
    const f = frames[name];
    if (!f) return placeholder(cellW, cellH);
    if (!image) return placeholder(PRESCALED.test(name) ? cellW : f.w, PRESCALED.test(name) ? cellH : f.h);
    if (!PRESCALED.test(name)) return { source: image, sx: f.x, sy: f.y, sw: f.w, sh: f.h };
    const canvas = createCanvas(cellW, cellH);
    canvas.getContext('2d').drawImage(image, f.x, f.y, f.w, f.h, 0, 0, cellW, cellH);
    prescaleCount++;
    return { source: canvas, sx: 0, sy: 0, sw: cellW, sh: cellH };
  };

  const atlas = {
    scale,
    placeholder: image === null || meta === null,
    get prescaleCount() {
      return prescaleCount;
    },
    get(name) {
      let entry = cache.get(name);
      if (!entry) cache.set(name, (entry = build(name)));
      return entry;
    },
  };
  // Pre-scale every brick-sized frame now so rendering never scales per frame.
  for (const name of Object.keys(frames)) if (PRESCALED.test(name)) atlas.get(name);
  return atlas;
}
