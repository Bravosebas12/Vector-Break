# Design: AngleCraft v1 Core

## Technical Approach

Layered, DOM-free ES modules (`engine` math/collision, `entities` pooled data, `system` session/rules/IO seams) driven by one `GameSession.step(dt)` at fixed `STEP = 1/120 s`. `main.js` is a thin adapter: boot, DOM input to actions, rAF loop, canvas render, audio, and an optional `?test=1` hook. Everything the specs assert is reachable through pure modules (Node-side tests) or the hook (browser tests); pixels are never asserted. Binding decisions come from `state.yaml` `confirmed_decisions` (including P1-P7, A10_v1_cap, E2_v1, which supersede every earlier 200-ball value); skills win over mockups.

## Architecture Decisions

| # | Decision | Rejected | Rationale |
|---|---|---|---|
| D1 | FSM + session in `src/js/system/` (not `main.js`) | FSM inside `main.js` (skill default) | Skill allows extraction "when they grow"; DOM-free session is required for Node tests |
| D2 | Session emits events into a preallocated ring buffer (1024); adapter drains for audio/particles. Overflow: overwrite the oldest event and increment `eventOverflow` (in `snapshot()`). Game logic never reads the ring; only presentation (particles, flashes), audio and tests consume it, so a dropped event can never change game state | Callbacks/EventTarget; block or grow on full | Zero allocation, deterministic order, testable; steady worst case 50 balls x 6 substeps x 2 steps/frame ~= 600 hit events/frame < 1024; only long catch-up frames (up to 30 steps) can overflow, losing presentation only |
| D3 | HUD and modals drawn on the canvas from a pure `HudModel` | DOM overlay | One letterbox transform for everything; model is Node-testable |
| D4 | Broadphase = direct cell lookup (ball diameter 28 < cell 56, at most 4 cells) | Spatial hash | Grid is static and uniform; O(1) per ball |
| D5 | Preview ray vs rounded rectangle (slab on rect expanded by r, then corner circle) | Slab on square-expanded box | Exact Minkowski sum = same geometry as simulation (HU-01 s1) |
| D6 | Samples fetched and decoded during `Loading` with one `OfflineAudioContext(2, 1, 48000)`; the real `AudioContext({sampleRate: 48000})` is created only by the `Title` start click and starts music + SFX immediately from the decoded buffers. Because `Loading` ignores all input and `Title` is entered only after every decode settles, a gesture can never precede decode completion (resolves validator W1) | Decode on first gesture / `<audio loop>` | Skill: decode once at boot, never during gameplay, no AudioContext at load; an offline context is not a realtime context and is not gated by autoplay; R4 gapless loop |
| D7 | Board coordinates per B1: grid top = y 0 = ceiling; side walls coincide with the grid edges (x 36 and x 1044); the 36 px side margins of the 1080 board are outside the playfield (visual frame) | Walls at board edges; ceiling offset below y 0 | Matches level-loading "Board layout B1" (`y = 56r`) and physics "Edge hit" box `y 0..56`; a 36 px side corridor would let r=14 balls bypass traps |
| D8 | Single runner `@playwright/test` with 3 projects: `unit` (Node-side, no browser fixture, no browser launched), `browser` and `e2e` (both `browserName: 'chromium'`) | `node:test` + Playwright | One command, one config (R3 spike guards it); E1_opera: Chromium-only automation |
| D9 | One time base: `simTime` = sum of `STEP * speedMult` over unpaused fixed steps; it drives emission and the volley cap | Fixed-step counters per speed | One rule, identical spacing at 1X/2X/4X |
| D10 | `Loading` and `Title` are real FSM states inside the session (P7). The adapter's `AssetLoader` reports `session.setLoadProgress(done, total)`; when `done == total` the session moves `Loading -> Title`. In `Title`, `FIRE` with `pointer: true` (left mousedown) calls `audio.unlock()` + `audio.music(true)` synchronously inside `dispatch` (still inside the DOM gesture handler), then loads level 1 and enters `Aiming` | Title as a DOM overlay; unlock in a later rAF | One FSM owns flow (skill); synchronous dispatch keeps the unlock inside the user activation |
| D11 | Stress mode `?test=1&stress=1`: session config `{ sealedFloor: true, volleyCapS: Infinity }` turns the floor `y = 956` into a reflecting half-plane, so no ball ever lands and the 45 s cap cannot fire. Fixture = dense valid level; `setVolley(50)` + `fire`; measurement starts at the first frame where `active == 50` | Spawn balls at random positions; ceiling-only fixture | Exercises the real emission and collision paths; all 50 stay active for the full window (resolves W2) |

## Layout (board coordinates, `src/js/system/Layout.js`)

| Constant | Value |
|---|---|
| Board | 1080 x 1000; placed on the 1920x1080 canvas at a mockup-defined `BOARD_ORIGIN` (render-only offset) |
| Grid | 9 x 12 cells of 112 x 56; cell `(c, r)` = `x 36+112c .. 148+112c`, `y 56r .. 56r+56`; grid spans `x 36..1044`, `y 0..672` |
| Walls | left `x = 36`, right `x = 1044`, ceiling `y = 0` (half-planes) |
| Floor / launch line | `y = 956`; a ball lands when its centre crosses `y = 956` moving down |
| Launcher | `x = launcher.x * 1080`, `y = 956`; valid `launcher.x` in `[50/1080, 1030/1080]` (walls +- r), else validation error `LAUNCHER_OUT_OF_RANGE` |

## Data Flow

    DOM events -> Input.mapEvent -> Action -> GameSession.dispatch
    rAF(now) -> Loop(acc, clamp 0.25) -> session.step(STEP) x n -> Fsm.state.update
         -> Physics.substep (Collision, Block hp, orbs) -> EventRing
    EventRing.drain -> Audio.play | Particles.spawn ; session.snapshot -> HudModel
    Renderer.draw(alpha): bgLayer (dirty) -> blocks fx -> balls -> particles -> aim -> HUD/modal
    ?test=1: window.__ANGLECRAFT__ -> session (step/snapshot/loadLevel/fire/setSeed/aim/action/setVolley/start/audioLog)

Boot sequence (HU-09, D6, D10):

    main.js boot -> session (state Loading) -> AssetLoader in parallel:
       atlas images | level1..6.json (fetch + validateLevel) | SFX samples + music (fetch + OfflineAudioContext.decodeAudioData)
       each settle (ok or fail) -> session.setLoadProgress(done, total)
    done == total -> Loading -> Title (prompt shown)
    left click -> Title.handleInput(FIRE pointer) -> audio.unlock() (new AudioContext + resume) -> music(true)
       -> loadLevel(0) -> Aiming

Failed audio asset -> marked failed in the sample table (synth fallback at play time), still counts as settled. Failed atlas image -> procedural placeholders (rendering "Assets missing"). A level file failing fetch or `validateLevel` is fatal: the session stays in `Loading` and shows `strings.loadError`; no Title.

FSM (skill table, `strict` throws on illegal transition; `paused` is a session flag, not a state):

    Loading --all assets settled--> Title --left click--> (unlock audio, load L1) Aiming
    Aiming --FIRE--> Firing --emitted==volley--> Simulating --active==0--> Resolving
    Resolving -> Victory (cores==0) | GameOver (shotsLeft==0) | Aiming   [checked in this order]
    Any gameplay state --RESTART--> reload -> Aiming ; Aiming|Firing|Simulating --PAUSE--> paused toggle
    Victory --NEXT (next level unlocked)--> loadLevel(index+1) -> Aiming
    No transition returns to Loading or Title; Loading -> Aiming is illegal (throws)

Input and pause rules:
- `Loading`: every action is ignored (no unlock, no load, no restart). `Title`: only `FIRE` with `pointer: true` acts; keys (incl. `Space`, `R`, `P`) and `AIM` are ignored. A click during `Loading` is dropped, never queued.
- Canvas `contextmenu` -> `preventDefault()`; `mousedown` with `button !== 0` maps to no action; `Esc` maps to no action. Right-click and `Esc` are inert in every state.
- While `paused`, only `PAUSE` (resume) and `RESTART` act; `FIRE`, `AIM`, `SET_SPEED`, `NEXT` are ignored. `RESTART` clears `paused`.
- `PAUSE` is ignored in `Resolving`, `Victory`, `GameOver`.
- `visibilitychange` to hidden dispatches `PAUSE` only when state is `Aiming|Firing|Simulating` and not already paused; becoming visible never auto-resumes. Loading continues while hidden.
- `NEXT` is valid only in `Victory` and only if `Progression.canAccess(index+1)` (record exists for `index`) and `index+1 < 6`; otherwise ignored, state unchanged.

## Key Algorithms

- **Circle vs AABB**: skill closest-point test; deep penetration pushes along min-overlap axis; corner normal `(c - corner)/|.|`; several overlaps in a substep resolve deepest only. Reflect only if `D.N < 0`; renormalize; re-clamp `|dir.y| >= 0.05` after every reflection (sign kept, downward if 0). Walls and ceiling are half-planes at x 36, x 1044, y 0. No ball-vs-ball test exists (P5): balls pass through each other, so per-ball cost is O(1) and independent of the ball count.
- **Substepping**: `maxStep = r*0.5 = 7`; `steps = min(64, ceil(speed*mult*STEP/maxStep))` global per fixed step (1200 px/s at 4X = 6). `subDt = STEP*mult/steps`.
- **Emission (single rule)**: `EMIT_INTERVAL = 1/12 s` of `simTime`. An emission timer accumulates `subDt` per substep; while `timer >= EMIT_INTERVAL` and `emitted < volleySize`, emit one ball and subtract the interval (remainder kept). First ball emits on `FIRE`. Spacing = 100 px at every speed.
- **Volley cap (P3)**: `volleySimTime` (reset on `FIRE`, `simTime` base, excludes pause) reaching 45 s releases every active ball, sets `emitted = volleySize`, `active = 0`, keeps all damage, emits `VOLLEY_CAPPED`, and moves to `Resolving` (via `Simulating` if still `Firing`). Capped balls are not landings: if no ball truly landed this volley, next launcher x keeps its previous value.
- **Orbs**: overlap ball-circle vs orb radius 24 marks capture; orb removed after the substep, `pendingBonus += value` once (A10).
- **Resolving order**: `volleySize = min(MAX_VOLLEY, volleySize + pendingBonus)` with `MAX_VOLLEY = 50` in `Layout.js` (v1; 200 deferred to the levels 8-10 spec); `pendingBonus = 0`; combo reset; launcher x = first true landing x (clamped to `[50, 1030]`) or unchanged; then Victory, GameOver, Aiming. Orbs captured in a volley ending in Victory/GameOver are applied and discarded on reload (volley-economy OI-3: no observable effect).
- **Aim preview**: `Raycaster.cast(origin, dir, world, maxBounces=1)` against side walls, ceiling and all non-orb blocks; second segment fixed 180 px; never a second bounce.
- **Loop trap (`TrapAnalysis`)**: 4-connected graph over grid cells plus a virtual `LAUNCH` node adjacent to every passable row-11 cell. Passable = empty, `standard`, `multiplier` (P4: standard is never a trap wall). Blockers = `indestructible`, `reinforced`, `core`, side walls, ceiling. `isTrapEntry(core, E)` holds when: `E` is 1 passable cell or 2 4-adjacent passable cells; every cell of `E` is connected to `LAUNCH`; removing `E` disconnects from `LAUNCH` **all** passable cells of the pocket containing the core (the components holding the core's passable neighbours not in `E`); that pocket has 1..12 cells. Validation: no passable neighbour connected to `LAUNCH` -> `TRAP_CLOSED`; no `E` satisfies `isTrapEntry` -> `TRAP_ENTRY_TOO_WIDE` (covers "no adjacent trap"). Existence only; no search order is relied on. Brute force (<= 6k candidate sets x BFS 108) is < 50 ms.
- **Reachability**: sweep 3600 angles in `[asin 0.05, pi - asin 0.05]` from the launcher; trace up to 1 reflection, each hit recording `surface` (`wall-left|wall-right|ceiling|block`) and `blockType`. A path reaches a target if the ball centre enters a target cell, or hits the core, before any obstacle. Unlike the 180 px aim preview, the post-bounce segment is unbounded: it is traced until the next surface (wall, ceiling, block, or the floor `y = 956`). Result: `[{angle, bounces, surfaces[]}]`. Geometry `static` (blockers only) in `validateLevel` with target = any valid entry/pocket; `preview` (all non-orb blocks) in content tests with target = the authored entry. L2 "no direct line": every segment launcher -> 5x5 sample points of entry `(6,2)` intersects an expanded `indestructible`.

## Resolved Design Defaults

| Item | Default | Rationale |
|---|---|---|
| A4 | TURNOS white; amber at <= 3 left; magenta at <= 1 (absolute) | Mockup values; SFX on entering each |
| A7 | TIEMPO = `playTime` (unpaused fixed steps x STEP, unscaled), `mm:ss`; not stored in record | Deterministic; A5 fixes record fields |
| A8 | No early win; Victory only in Resolving | HU-03 s1 + FSM table |
| A9 | Victory checked before GameOver | Skill table order |
| A12 | One global combo counter, 250 ms of `playTime`, resets on gap/Resolving | Matches perceived timing at 4X |
| B2 | Pre-scale 128x64 frames to 112x56 once into an offscreen sprite cache | No scaling in `drawImage` (R7) |
| B3 | r = 14 (28 px sprite), 1200 px/s; emission per D9/Key Algorithms | 2 substeps at 1X, 6 at 4X |
| B4 | Floor = launch line y 956; aim upward only (cursor below launcher clamps to `|dir.y| = 0.05`) | Matches B1 |
| B5 | Next launcher x = first true landing x clamped to `[50, 1030]` | Skill turn-end rule |
| B6 | Tie: lowest emission index in the same substep | Pool index order is deterministic |
| Pools | Ball pool = 50 preallocated at level load (= `MAX_VOLLEY`); particle pool 512 at boot; `acquire()` returns null when empty | Physics spec: growth only at load |
| Load | `loadLevel` validates and builds a new board/state off to the side, then swaps; on failure throws and previous state is untouched | Level-loading "No partial state" |
| C4 | `R` restart; `Enter` = modal primary button | Mirrors buttons; no new semantics |
| C5 | Aim anywhere on canvas; Space uses last aim; no aim yet = straight up | Keyboard-only fire works |
| C6 | LANZAR and VELOCIDAD buttons clickable, same rules as keys | Mockup affordance |
| D2 | `anglecraft.v1.records` = `{ "level-01": {stars, score, shots} }`; `anglecraft.v1.audio`; try/catch + memory fallback | Field names per progression spec; unlock derived from records |
| D4 | Restart never touches records; replace if better (stars desc, score desc, shots asc) | Progression OI-2 |
| D5 | Text badge "TIRO PERFECTO" (cyan glow) on 3-star modal | No asset exists |
| P1 | Score = damage + 100 x unused shots | Confirmed |
| E3 | Fit scale `s = min(W/1920, H/1080)`; backing store `1920*s*dpr`; `setTransform`; atlas `clamp(ceil(s*dpr),1,3)`; pure `mapClientToLogical(x, y, rect)` then minus `BOARD_ORIGIN` | Keeps `object-fit: contain` |
| E5 | Particles: 12 squares (32 for core), 400 ms, type color, drop-on-full; flash white a=0.6, 60 ms (steel muted); launcher cyan ring, grey when disabled; HP tint 4 steps, cracks at 30/60/90% damage | Design 2.3-2.6 |
| E8 | 1 damage per hit; balance via `shots`/HP only | Skill gate |
| E9 | UI copy in neutral Spanish, centralized in `strings.js` (P2); start screen: `title` "AngleCraft", `loading` "Cargando... {pct}%", `clickToStart` "Haz clic para comenzar", `loadError` "No se pudieron cargar los niveles" | Confirmed |
| HU-09 render | `Loading`/`Title` draw only a dark background, the title centred at logical `(960, 470)` (`textAlign: center`), and below it either a 600x12 progress bar + `loading` text or a pulsing `clickToStart` (opacity 0.5-1, 1 s period); no board, HUD or launcher | No asset dependency, so it renders before the atlas loads |
| E10 | No bundled/remote fonts; CSS stack with system fallback; await `document.fonts.ready` | No runtime deps |

## Resolved Spec Open Items

| Open item | Default | Rationale |
|---|---|---|
| game-state OI-1/OI-2 | `P` ignored in Resolving/Victory/GameOver; while paused only `P`/`R` act | Pause preserves state exactly |
| game-state OI-3 | 1/12 s of `simTime` | D9 |
| game-state OI-4 | Resolved by HU-09: `Loading` ignores all actions (incl. `R`), `Title` accepts only the start click; restart never refetches or decodes (levels parsed during `Loading`), so the 500 ms budget only applies in gameplay states | Loading is boot-only |
| level-loading OI-1 | Trap walls = `indestructible` + `reinforced` (P4) | Confirmed |
| level-loading OI-2 | `launcher.x` in `[50/1080, 1030/1080]` | Launcher must sit between walls +- r |
| physics OI-1/OI-2 | r 14, 1200 px/s, 1 HP per hit | B3, E8 |
| physics OI-3 | No ball-vs-ball collision | Confirmed P5; keeps 50 balls at 4X O(n) |
| aiming OI-1/OI-3 | 180 px; upward only | B4 |
| rendering OI-1/OI-2 | E5 | Design 2.3-2.6 |
| rendering OI-3 | Superseded by the HU-09 start screen (see "HU-09 render" above); progress covers sprites, levels, SFX and music; failures -> synth fallback | P7 |
| hud OI-1 | TIEMPO shown (A7), record line shows best stars/score | Mockup |
| hud OI-2 | FALLIDO modal: PUNTOS and one primary button "Reiniciar puzzle [R]" (mockup); click, `R` and `Enter` restart | Mockup; spec only requires retry |
| hud OI-3 | Spanish copy in `strings.js`; last-level notice "Último nivel completado" | P2 |
| progression OI-1..OI-4 | P1; D4; unlock derived from persisted records; NEXT gated as in Data Flow | Records are written on every win |
| volley-economy OI-1..OI-3 | E8; D9 + floor y 956; Resolving order | Above |
| audio OI-1 | Synth recipes below | Design 2.7 prompt |
| audio OI-2 | No volume/mute UI or keys in v1; `setVolume` API only, persisted value restored at unlock | ATAJOS limited to v1 controls |
| level-content OI-1/OI-2 | Deferred to slice 9 with constraints: L4-L6 `shots` 10-15, `startBalls` 3-10, core HP 100-500 with `T4 <= T5 <= T6`, >= 2 mechanics, `validateLevel` + reachability pass, seeded solution in `solutions.json` reaches Victory | Content tuning, not architecture |

Synth recipes for the design 2.7 screen sounds (`aim_cancel` is not wired, C3); all through `sfxBus`, exponential decay to -60 dB:

| Sound | Recipe |
|---|---|
| `sfx_ui_pause_in` / `_out` | Sine sweep 880->440 Hz / 440->880 Hz, 150 ms |
| `sfx_speed_x1` / `x2` / `x4` | Square ticks of 12 ms; 1/2/4 pulses within 80 ms at 1300/1450/1600 Hz |
| `sfx_turns_warning` | Triangle 660 then 880 Hz, 2 x 110 ms |
| `sfx_turns_critical` | Lowpassed (2 kHz) sawtooth 622 then 466 Hz, 2 x 140 ms |
| `sfx_victory` | Sine arpeggio 523/659/784 Hz at 120 ms each, then the three as a chord decaying over 1.1 s |
| `sfx_star_1` / `_2` / `_3` | Sine chime 1047/1175/1319 Hz, 300 ms; star 3 adds a +7 cent detuned partial (shimmer) |
| `sfx_defeat` | Triangle 440/349/294 Hz at 300 ms each, lowpass sweeping 2000->300 Hz, 1.2 s total |

## File Changes (by slice)

| Slice | Files |
|---|---|
| 1 | Create `package.json` (`"type":"module"`, devDep `@playwright/test@1.63.0`), `playwright.config.js`, `scripts/static-server.mjs`, `tests/spikes/{clock,esm,server}.spec.js`, `tests/blank.html` (browser-test host page), `tests/e2e/smoke.spec.js` |
| 2 | Modify `src/js/engine/{Vector2D,Collision,Physics}.js`, `src/js/system/ObjectPool.js`, `src/js/entities/Ball.js`; create `src/js/system/Rng.js`, `src/js/system/Layout.js`; `tests/unit/{vector,collision,physics,pool}.spec.js` |
| 3 | Modify `src/js/entities/{Block,Multiplier}.js`; create `src/js/system/{LevelValidator,TrapAnalysis,Board,LevelCatalog}.js`; `tests/unit/{level-validator,trap}.spec.js` |
| 4 | Modify `src/js/system/Raycaster.js`; `tests/unit/raycaster.spec.js`, `reachability.spec.js` |
| 5a/5b | Create `src/js/system/{Fsm,GameSession,Input,EventRing,TestHook}.js`; `main.js` boot; `tests/unit/{fsm,session,input,volley,volley-cap,orbs}.spec.js` (`fsm` covers `Loading`/`Title` rows and input gating; until slice 8b, boot reports only level files to `setLoadProgress`) |
| 6 | Create `src/js/system/{Loop,Renderer,Atlas,Viewport,Particles}.js`, `src/js/entities/Particle.js`; `tests/browser/{atlas,viewport}.spec.js`, `tests/e2e/{loop-clock,stress}.spec.js`, `tests/fixtures/stress-level.json` |
| 7 | Create `src/js/system/{Hud,Progression,strings}.js`; `tests/unit/{hud-model,progression}.spec.js`, `tests/browser/storage.spec.js` |
| 8a | Modify `src/js/system/WebAudio.js`; create `src/js/system/AudioSinks.js` (Null/Recording); `tests/unit/audio-seam.spec.js`, `tests/browser/webaudio.spec.js` |
| 8b | Create `src/js/system/{AssetLoader,TitleScreen}.js` (loader with per-asset settle + progress; pure title/progress draw model); wire boot in `main.js`; `tests/unit/{asset-loader,title-screen}.spec.js`, `tests/e2e/start-screen.spec.js` |
| 9 | Create `src/levels/level{4,5,6}.json`, `tests/fixtures/solutions.json`, `tests/unit/level-content.spec.js`, `tests/e2e/playthrough.spec.js` |

`index.html` and `styles.css`: no structural change; the start screen is drawn on the canvas (slice 8b).

## Interfaces / Contracts

```js
// GameSession (DOM-free)
createSession({ rng, audio, storage, strict, sealedFloor = false, volleyCapS = 45 }) -> {
  setLevels(levels), setLoadProgress(done, total) /* Loading -> Title when done == total */,
  loadLevel(indexOrJson) /* atomic; throws, old state kept */, dispatch(action), step(dt), snapshot(), drainEvents(fn) }
// Action: {type:'AIM',x,y}|{type:'FIRE',pointer?:true}|{type:'SET_SPEED',v}|{type:'RESTART'}|{type:'PAUSE'}|{type:'NEXT'}
// AssetLoader.load({ atlas, levels, samples, music }, onSettle(done, total)) -> Promise<{atlas, levels, buffers, failed[]}>
//   never rejects for audio/sprite failures; rejects only when a level fails fetch or validateLevel
// snapshot(): {state /* 'Loading'|'Title'|'Aiming'|... */, paused, loading:{done,total}, eventOverflow, speed, level:{index,id}, shots:{used,left,max}, volley:{size,emitted,active},
//   pendingBonus, launcherX, cores, blocks:[{col,row,type,hp}], balls:[{x,y}], score, damage,
//   simTime, volleySimTime, playTime, result:{stars,record:{stars,score,shots}}|null}
// TrapAnalysis: isTrapEntry(board, coreCell, entryCells) -> boolean ; findTraps(board) -> errors[]
// Reachability: sweep(board, launcher, target, geometry) -> [{angle, bounces, surfaces:[{surface, blockType}]}]
// Audio seam: { unlock(), play(type, opts), music(on), setVolume(v), state, loading:{done,total} }
// Hook (?test=1; &loop=1 lets rAF step the session; &audio=1 enables real sample loading, else Recording sink
//   and audio assets settle immediately; &stress=1 sets sealedFloor + volleyCapS Infinity, D11): window.__ANGLECRAFT__ =
//   { step(n), snapshot(), loadLevel(x), fire(angleRad), aim(x,y), action(a), setSeed(s), setVolley(n /* <= 50 */),
//     start() /* same path as the Title left click */, audioLog() }
// Hook methods other than snapshot() throw NOT_READY in Loading; tests wait for state 'Title'.
// loadLevel(x) from Title is a legal Title -> Aiming transition (tests may skip start()).
```

Static server: `node scripts/static-server.mjs --port 4173`, binds 127.0.0.1, root = repo, `path.resolve` + prefix check, MIME map (`.js` `text/javascript`, `.wav` `audio/wav`, ...), streams files, 403 on escape, 404 otherwise.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (Node, project `unit`, no browser) | engine, no ball-vs-ball interaction (crossing balls keep direction/speed), pools (50 preallocated, null on exhaustion), event ring overflow (oldest overwritten, `eventOverflow` counted, state unaffected), `Loading`/`Title` gating and transitions, AssetLoader progress and failed-audio settle, raycaster, trap/reachability, validator incl. launcher range, atomic `loadLevel`, FSM rows incl. "last ball lands while Firing", pause gating (FIRE/speed ignored while paused), NEXT gating, emission spacing equal at 1X/2X/4X, volley cap (45 s, damage kept, launcher x unchanged when none landed), `pendingBonus` reset after Resolving, progression, HudModel, viewport math, audio seam | Import `src/js/**` directly; no `page` fixture; in-memory storage |
| Browser (`browser`, Chromium) | Atlas pre-scale, OffscreenCanvas fallback, localStorage, WebAudio chain/fallback, OfflineAudioContext boot decode with no realtime context before gesture | `page.goto('/tests/blank.html')` + `page.evaluate(() => import(...))` |
| E2E (`e2e`, Chromium) | Smoke boot, hook API, context menu and `Esc` inert, start screen (clicks/keys during `Loading` ignored, `Title` after settle, key on `Title` ignored, start click -> `Aiming` L1 with `audioLog` unlock + music; 404 on one sample still reaches `Title`, via `page.route`), page.clock real-loop, stress, L1-L6 seeded playthrough with `solutions.json` | `?test=1`; assertions on `snapshot()` and `audioLog()` |
| Stress (`e2e`) | `?test=1&loop=1&stress=1` (D11), `stress-level.json`, `setVolley(50)`, 4X, fire; wait until `active == 50`, then 600 rAF frames; average per-frame CPU time (update + render, measured with `performance.now()` inside the frame) <= 16.7 ms; `active == 50` at the end; ball pool `created` count unchanged | Measures work, not rAF cadence (headless rAF is not vsync) |
| Content | L1: some path has `bounces == 1` and `surfaces[0].surface` in `wall-left|wall-right` reaching `(3,2)`; `isTrapEntry` true for L1 `(4,1)`/`[(3,2)]`, L2 `(7,1)`/`[(6,2)]`, L3 `(4,4)`/`[(4,6)]`; L3 asserts only its authored constraints (P6, no external layout reference) | Authored cells asserted by name |

## Slice 1 Spikes (run before any feature task)

| Spike | Pass | Fail fallback |
|---|---|---|
| S1 clock (R1) | `clock.install()` before `goto`; `runFor(1000)` yields 58-63 rAF calls, `performance.now()` delta 1000 +- 1 ms, rAF timestamps monotonic | Drop real-loop e2e; hook-only stepping |
| S2 ESM (R3) | Node-side spec imports `src/js/engine/Vector2D.js` and passes, no transform error | Run pure tests via `page.evaluate` import |
| S3 server (R2) | webServer starts on Windows; `/` 200 html; `.js` `text/javascript`; `.wav` `audio/wav`; `/..%2fpackage.json` 403/404; two consecutive runs pass (no orphan port) | `reuseExistingServer: false` + port from env |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no file classification or execution | — | — |
| Git repository selection | N/A: no VCS automation | — | — |
| Commit state | N/A | — | — |
| Push state | N/A | — | — |
| PR commands | N/A | — | — |
| Static server path routing (added) | Applicable: HTTP path to file mapping, spawned by `webServer` | Decode, resolve, require root prefix; 127.0.0.1 only; no directory listing; GET/HEAD only | `..`, encoded `%2e%2e`, absolute path, backslash on Windows -> 403/404; non-GET -> 405 |

## Migration / Rollout

No migration required. Each slice is an isolated chained PR; records reset by clearing `anglecraft.v1.*` keys.

## Needs Product Decision

None (ball-vs-ball resolved by P5; level 3 layout resolved by P6).

## Open Questions

- [ ] If L1 fails `preview`-geometry reachability, slice 9 retunes standard-block positions (content, not code).
- [ ] OfflineAudioContext decode of the 45 MB WAV (~62 MB decoded) duration on mid-range PCs is unmeasured; the blocking `Loading` screen with progress covers it.
