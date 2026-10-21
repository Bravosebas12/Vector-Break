# Research: anglecraft-v1-core

Collected 2026-10-20 (sdd-research, web sources). Status: partial (gaps listed). No finding contradicts the planned approach.

| # | Finding | Confidence | Sources |
|---|---------|------------|---------|
| R1 | `page.clock.install()` fakes `requestAnimationFrame`, `cancelAnimationFrame`, `performance`, timers and Date (since Playwright 1.45). Step frames with `runFor(ms)`; `fastForward` fires due timers at most once (not for frame stepping). Install before navigation; clock is BrowserContext-wide. Built on @sinonjs/fake-timers (rAF every 16 ticks). | High (rAF), medium (`performance.now` implicit) | playwright.dev/docs/clock, /docs/api/class-clock, github.com/sinonjs/fake-timers |
| R1v | Pin `@playwright/test` **1.63.0** (2026-09-04; 1.64.x is < 2 weeks old). Node 22/24/26 supported. | High | playwright.dev/docs/release-notes, /docs/intro |
| R2 | `webServer`: `command`, `url` (polled until 2xx/3xx), `reuseExistingServer`, `timeout` (60 s), `cwd`, `env`, `stdout`/`stderr`. On Windows `gracefulShutdown` is ignored (process killed). | High | playwright.dev/docs/test-webserver |
| R3 | Node-side ESM tests with `"type":"module"`: no authoritative source; expected to work with explicit `.js` extensions. | Low | — (spike needed) |
| R4 | Decoded music = 161.684 s x 48 kHz x 2 ch x 4 B ≈ **62.1 MB** float32 (file 45 MB). `AudioBufferSourceNode` `loopStart`/`loopEnd` are sample-accurate; `<audio loop>` reported gappy (community sources). Keep decoded-buffer looping. | High (math, loop API), low (`<audio>` gaps) | MDN decodeAudioData, AudioBufferSourceNode.loop; W3C Web Audio; web.dev MSE |
| R5 | AudioContext created before a user gesture starts `suspended`; resume after gesture (Chrome 71+, Firefox blocks until sticky activation). Edge/Opera assumed to follow Chrome. | High (Chrome/Firefox), medium (Edge/Opera) | developer.chrome.com/blog/web-audio-autoplay, MDN Autoplay guide |
| R6 | OffscreenCanvas (Baseline 2023, `getContext` may return null → feature-detect), structuredClone (2022), decodeAudioData (2021). Playwright supports Chromium, Firefox, WebKit, `chrome`/`msedge` channels; **Opera not supported**. | High | MDN, playwright.dev/docs/browsers |
| R7 | Canvas perf: integer `drawImage` coords, pre-scaled sprites (no scaling in drawImage), offscreen pre-render, `alpha:false`, batch by state, layered canvases. No quantified 200-sprite benchmark. | High (guidance) | MDN Optimizing canvas |

## Gaps
- R3 ESM in Playwright Node-side: spike.
- R1: `performance.now` and rAF timestamp under fake clock; 16 vs 16.67 ms cadence.
- R4/R5: headless Chromium AudioContext state; Edge/Opera specifics.
- R6: per-version tables not read.

## Design Implications
- Spike 1: `page.clock` + rAF loop + `performance.now` with `runFor` on 1.63.0 / Node 24.
- Spike 2: custom `node:http` server + `webServer` on Windows.
- Audio tests assert state and calls, not timing (audio clock not faked).
- Opera cannot be automated; Chromium is the proxy.
- 45 MB WAV must be served with streaming and `Content-Type: audio/wav`; decoding needs a loading state.
