import http from 'node:http';
import { test, expect } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = 4173;

// Raw request: Playwright's request fixture normalizes `..`, so the path is sent verbatim.
function raw(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path, method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

test.describe('static server: path routing', () => {
  const refused = [
    ['dot-dot', '/../package.json'],
    ['nested dot-dot', '/src/../../package.json'],
    ['encoded dot-dot', '/%2e%2e/package.json'],
    ['encoded slash dot-dot', '/..%2fpackage.json'],
    ['absolute path', '/C:/Windows/win.ini'],
    ['absolute double slash', '//etc/passwd'],
    ['backslash', '/..' + String.fromCharCode(92) + 'package.json'],
    ['encoded backslash', '/..%5cpackage.json'],
    ['null byte', '/package.json%00.js'],
  ];
  for (const [name, path] of refused) {
    test(`refuses ${name}`, async () => {
      const res = await raw(path);
      expect([403, 404]).toContain(res.status);
      expect(res.body.toString()).not.toContain('vector-break');
    });
  }

  test('serves a legitimate file in the root (control for traversal cases)', async () => {
    const res = await raw('/package.json');
    expect(res.status).toBe(200);
    expect(res.body.toString()).toContain('vector-break');
  });

  for (const method of ['POST', 'PUT', 'DELETE']) {
    test(`${method} -> 405`, async () => {
      const res = await raw('/', method);
      expect(res.status).toBe(405);
    });
  }

  test('HEAD is allowed and carries no body', async () => {
    const res = await raw('/', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

test.describe('static server: MIME and serving', () => {
  test('/ is 200 html', async () => {
    const res = await raw('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
  });

  test('.js is text/javascript', async () => {
    const res = await raw('/src/js/main.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/javascript/);
  });

  test('.json is application/json', async () => {
    const res = await raw('/package.json');
    expect(res.headers['content-type']).toMatch(/^application\/json/);
  });

  test('.wav is audio/wav and the full body is streamed', async () => {
    const res = await raw('/assets/audio/sfx_ui_click.wav');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('audio/wav');
    expect(res.body.length).toBe(Number(res.headers['content-length']));
    expect(res.body.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });

  test('directories are not listed', async () => {
    const res = await raw('/src/js/');
    expect([403, 404]).toContain(res.status);
  });

  test('missing file is 404', async () => {
    const res = await raw('/nope.js');
    expect(res.status).toBe(404);
  });
});
