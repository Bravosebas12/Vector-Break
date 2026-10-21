// Dev-only static file server (node:http, no dependencies). Serves the repository root on 127.0.0.1.
// Usage: node scripts/static-server.mjs --port 4173
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function parsePort(argv) {
  const i = argv.indexOf('--port');
  const port = i >= 0 ? Number(argv[i + 1]) : Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${argv[i + 1] ?? process.env.PORT}`);
  }
  return port;
}

// Returns an absolute file path inside ROOT, or null when the URL path must be refused.
export function resolveRequestPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\') ||decoded.includes(':')) return null;
  if (decoded.split('/').includes('..')) return null;
  const target = path.resolve(ROOT, '.' + decoded);
  const inside = target === ROOT || target.startsWith(ROOT + path.sep);
  return inside ? target : null;
}

function send(res, status, body = '') {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, 'Method Not Allowed');
  }
  const rawPath = (req.url ?? '/').split('?')[0].split('#')[0];
  let target = resolveRequestPath(rawPath);
  if (!target) return send(res, 403, 'Forbidden');
  if (rawPath.endsWith('/') && target === ROOT) target = path.join(ROOT, 'index.html');

  fs.realpath(target, (err, real) => {
    // A symlink must not lead outside the root either.
    if (err) return send(res, 404, 'Not Found');
    if (real !== ROOT && !real.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
    fs.stat(real, (statErr, stat) => {
      if (statErr || !stat.isFile()) return send(res, 404, 'Not Found');
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(real).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(real);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = http.createServer(handler);
  server.listen(parsePort(process.argv.slice(2)), HOST, () => {
    console.log(`static-server listening on http://${HOST}:${server.address().port} (root ${ROOT})`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
}
