// Logical 1920x1080 canvas shown with CSS object-fit: contain (design E3).
// Pure math plus one resize hook that scales the backing store by devicePixelRatio.
export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

export const fitScale = (w, h) => Math.min(w / LOGICAL_W, h / LOGICAL_H);

export const backingSize = (w, h, dpr) => {
  const k = fitScale(w, h) * dpr;
  return { width: Math.round(LOGICAL_W * k), height: Math.round(LOGICAL_H * k) };
};

// Atlas scale index (1..3) from the on-screen pixel density.
export const atlasScale = (w, h, dpr) => Math.min(3, Math.max(1, Math.ceil(fitScale(w, h) * dpr)));

// rect: the canvas element's client rect (the image is letterboxed inside it).
export function mapClientToLogical(x, y, rect) {
  const s = fitScale(rect.width, rect.height);
  const offX = (rect.width - LOGICAL_W * s) / 2;
  const offY = (rect.height - LOGICAL_H * s) / 2;
  return { x: (x - rect.left - offX) / s, y: (y - rect.top - offY) / s };
}

// Resizes the backing store once per window change and maps logical px to it.
// Returns { atlasScale } so the caller can pick the matching spritesheet.
export function applyViewport(canvas, ctx, win = window) {
  const { width: w, height: h } = canvas.getBoundingClientRect();
  const dpr = win.devicePixelRatio || 1;
  const size = backingSize(w, h, dpr);
  canvas.width = size.width;
  canvas.height = size.height;
  const k = size.width / LOGICAL_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return { atlasScale: atlasScale(w, h, dpr) };
}
