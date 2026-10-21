// Dev-only: renders the Key Art bundle (Design/Logo/key-art-standalone.html, exported from Claude Design)
// in headless Chromium and saves its canvas, without the DOM title overlay, as the title-screen image.
// Usage: node scripts/export-key-art.mjs [input.html] [output.webp]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const input = path.resolve(process.argv[2] ?? 'Design/Logo/key-art-standalone.html');
const output = path.resolve(process.argv[3] ?? 'assets/art/key-art.webp');
const MAX_BYTES = 600 * 1024;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(input).href);
// The bundle unpacks, loads its fonts, then draws asynchronously: wait for a painted 3840x2160 canvas.
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  if (!c || c.width !== 3840 || !document.fonts.check('800 66px "JetBrains Mono"')) return false;
  const px = c.getContext('2d').getImageData(1920, 900, 1, 1).data; // inside the magenta core block
  return px[0] > 60;
}, null, { timeout: 30_000 });
await page.waitForTimeout(500); // let the last async draw pass settle

let bytes = null;
for (const quality of [0.9, 0.82, 0.75, 0.68, 0.6]) {
  const url = await page.evaluate((q) => document.querySelector('canvas').toDataURL('image/webp', q), quality);
  bytes = Buffer.from(url.split(',')[1], 'base64');
  console.log(`quality ${quality}: ${(bytes.length / 1024).toFixed(0)} KB`);
  if (bytes.length <= MAX_BYTES) break;
}
await browser.close();
if (bytes.length > MAX_BYTES) throw new Error(`key art is ${bytes.length} bytes, over ${MAX_BYTES}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, bytes);
console.log(`wrote ${path.relative(process.cwd(), output)}`);
