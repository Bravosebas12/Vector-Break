import { defineConfig } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: BASE_URL },
  webServer: {
    command: `node scripts/static-server.mjs --port ${PORT}`,
    url: `${BASE_URL}/`,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    // Node-side tests: no browser fixture is used, so no browser is launched.
    {
      name: 'unit',
      testMatch: ['unit/**/*.spec.js', 'spikes/server.spec.js', 'spikes/esm.spec.js'],
    },
    {
      name: 'browser',
      testMatch: ['browser/**/*.spec.js', 'spikes/clock.spec.js'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'e2e',
      testMatch: ['e2e/**/*.spec.js'],
      use: { browserName: 'chromium' },
    },
    // Screenshot baselines (test-harness "Visual snapshot tests"): fixed 1920x1080, DPR 1, no animations.
    {
      name: 'visual',
      testMatch: ['visual/**/*.spec.js'],
      use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
      expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.002 } },
    },
  ],
});
