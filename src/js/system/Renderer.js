// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Canvas renderer. Layers: static board (offscreen, redrawn only when a block's HP or presence
// changes) -> hit flashes -> orbs -> aim preview -> balls -> launcher -> crosshair -> particles.
// Every entity with an atlas frame is drawn with it (Design/Game UI mockup); primitives remain only for
// assets not delivered yet (hit flash, particles) and as a fallback when no atlas is installed.
// Nothing here allocates per frame, apart from the aim preview, which is cached until its inputs change.
import { createCanvas } from './Atlas.js';
import { LOGICAL_W, LOGICAL_H } from './Viewport.js';
import { Raycaster } from './Raycaster.js';
import { hudModel, modalModel } from './Hud.js';
import { drawHud, drawModal } from './HudView.js';
import { titleModel, drawTitle } from './TitleScreen.js';
import { BLOCK_TYPES } from '../entities/Block.js';
import { COLORS, FONT_MONO, BOARD_STYLE, BLOCK_FRAME, BLOCK_TEXT, BURST, FX } from './Theme.js';
import { BOARD_W, BOARD_H, CELL_W, CELL_H, BALL_RADIUS, FLOOR_Y, LAUNCHER_Y, STEP, cellMinX, cellMinY } from './Layout.js';

// Render-only placement of the 1080x1000 board on the 1920x1080 canvas (centred).
export const BOARD_ORIGIN = Object.freeze({ x: (LOGICAL_W - BOARD_W) / 2, y: (LOGICAL_H - BOARD_H) / 2 });

const FLASH_S = 0.06; // design E5: white, alpha 0.6, 60 ms
const MAX_DT = 0.1;
const HUD_REFRESH_MS = 100; // the models allocate: refresh them at 10 Hz and on every state change
const TWO_PI = Math.PI * 2;
const NO_DASH = [];
const RING_DASH = [16.99, 5]; // Key Art launcher ring
const GRID_STEP = 32; // mockup decorative board grid
const LINE_INSET = 40; // launch line inset from both board sides
const BALL_SPRITE = 64; // the sprite core is r7 at 32 px, so 64 px gives r14 = BALL_RADIUS
const ORB_SPRITE = 64;
const CROSS_SPRITE = 64;
const DOT_SPRITE = 16;
const BOUNCE_SPRITE = 32;
const IMPACT_SPRITE = 48;
const GLOW_R = 60;
const HP_FONT = `700 20px ${FONT_MONO}`;
const ORB_FONT = `700 16px ${FONT_MONO}`;
const MAX_DOTS = 96;

// Crack overlay by damage taken: 30 / 60 / 90 %.
export const crackFor = (hp, maxHp) => {
  const damage = 1 - hp / maxHp;
  return damage >= 0.9 ? 'crack_90' : damage >= 0.6 ? 'crack_60' : damage >= 0.3 ? 'crack_30' : null;
};

// Aim preview dots (mockup): one every 28 px from 36 px along the polyline `pts` ([x0, y0, x1, y1, ...],
// `n` points), opacity 1 - 0.55 * s / total. Writes [x, y, alpha] triples into `out`; returns the count.
export function aimDots(pts, n, out) {
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  let count = 0;
  let acc = 0;
  let next = 36;
  for (let i = 1; i < n && count * 3 < out.length; i++) {
    const ax = pts[i * 2 - 2];
    const ay = pts[i * 2 - 1];
    const d = Math.hypot(pts[i * 2] - ax, pts[i * 2 + 1] - ay);
    while (next <= acc + d && count * 3 < out.length) {
      const t = (next - acc) / d;
      out[count * 3] = ax + (pts[i * 2] - ax) * t;
      out[count * 3 + 1] = ay + (pts[i * 2 + 1] - ay) * t;
      out[count * 3 + 2] = 1 - (0.55 * next) / total;
      count++;
      next += 28;
    }
    acc += d;
  }
  return count;
}

// `onEvent(type, a, b)`: extra consumer (audio) fed from the renderer's single drain of the event ring.
// `ui.loadError` is set by the boot code when a level fails to load (the start screen then shows loadError).
// `ui.pointer` ({ x, y, inBoard } in board coordinates) is set by the DOM adapter for the crosshair.
export function createRenderer({ session, ctx, particles, atlas = null, progression = null, onEvent: extra = null, ui = {} }) {
  const layer = createCanvas(BOARD_W, BOARD_H);
  const lctx = layer.getContext('2d');
  const stats = { frames: 0, layerRedraws: 0, blocksDrawn: 0, launcherGlow: 0, glowSpritesBuilt: 0 };
  const glow = buildGlow();
  let board = null;
  let lastHp = null;
  let maxHp = null;
  let flash = null;
  let lastCount = 0;
  let dirty = true;
  let lastNow = null;
  let hud = null;
  let modal = null;
  let hudAt = -Infinity;
  let hudState = null;
  const aimCache = { lx: NaN, ax: NaN, ay: NaN, version: -1, result: null, dots: 0 };
  const aimPts = new Float32Array(6);
  const dots = new Float32Array(MAX_DOTS * 3);
  const origin = { x: 0, y: LAUNCHER_Y };

  const cellOf = (b) => b.row * board.cols + b.col;

  // Soft cyan launcher glow, built once (no per-frame gradient).
  function buildGlow() {
    const canvas = createCanvas(GLOW_R * 2, GLOW_R * 2);
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(GLOW_R, GLOW_R, 0, GLOW_R, GLOW_R, GLOW_R);
    grad.addColorStop(0, FX.launcherGlow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, GLOW_R * 2, GLOW_R * 2);
    stats.glowSpritesBuilt++;
    return canvas;
  }

  // Draws atlas frame `name` centred on (cx, cy) at `size` px; false when no atlas is installed.
  function sprite(c, name, cx, cy, size) {
    if (!atlas) return false;
    const e = atlas.get(name);
    c.drawImage(e.source, e.sx, e.sy, e.sw, e.sh, cx - size / 2, cy - size / 2, size, size);
    return true;
  }

  function syncBoard() {
    if (board === session.board) return;
    board = session.board;
    const n = board.cols * board.rows;
    lastHp = new Int32Array(n);
    maxHp = new Int32Array(n);
    flash = new Float32Array(n);
    for (const b of board.blocks) maxHp[cellOf(b)] = Math.max(1, b.hp);
    dirty = true;
  }

  function detectDirty() {
    if (board.blocks.length !== lastCount) return (dirty = true);
    for (let i = 0; i < board.blocks.length; i++) {
      const b = board.blocks[i];
      if (lastHp[cellOf(b)] !== b.hp) return (dirty = true);
    }
  }

  function drawSurface() {
    lctx.clearRect(0, 0, BOARD_W, BOARD_H);
    lctx.beginPath();
    lctx.roundRect(0.5, 0.5, BOARD_W - 1, BOARD_H - 1, BOARD_STYLE.radius);
    lctx.fillStyle = BOARD_STYLE.fill;
    lctx.fill();
    lctx.strokeStyle = COLORS.border;
    lctx.lineWidth = 1;
    lctx.stroke();
    lctx.beginPath();
    for (let x = GRID_STEP; x < BOARD_W; x += GRID_STEP) {
      lctx.moveTo(x + 0.5, 1);
      lctx.lineTo(x + 0.5, BOARD_H - 1);
    }
    for (let y = GRID_STEP; y < BOARD_H; y += GRID_STEP) {
      lctx.moveTo(1, y + 0.5);
      lctx.lineTo(BOARD_W - 1, y + 0.5);
    }
    lctx.strokeStyle = BOARD_STYLE.grid;
    lctx.stroke();
    const line = lctx.createLinearGradient(LINE_INSET, 0, BOARD_W - LINE_INSET, 0);
    line.addColorStop(0, 'rgba(0,0,0,0)');
    line.addColorStop(0.15, COLORS.border);
    line.addColorStop(0.85, COLORS.border);
    line.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = line;
    lctx.fillRect(LINE_INSET, FLOOR_Y, BOARD_W - 2 * LINE_INSET, 1);
  }

  function drawBlock(b, x, y, crack) {
    if (atlas) {
      const e = atlas.get(BLOCK_FRAME[b.type]);
      lctx.drawImage(e.source, e.sx, e.sy, e.sw, e.sh, x, y, CELL_W, CELL_H);
      if (crack) {
        const c = atlas.get(crack);
        lctx.drawImage(c.source, c.sx, c.sy, c.sw, c.sh, x, y, CELL_W, CELL_H);
      }
      return;
    }
    lctx.strokeStyle = BURST[b.type];
    lctx.lineWidth = 2;
    lctx.strokeRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
  }

  function drawLayer() {
    stats.layerRedraws++;
    drawSurface();
    lastHp.fill(0);
    lctx.font = HP_FONT;
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    for (let i = 0; i < board.blocks.length; i++) {
      const b = board.blocks[i];
      const cell = cellOf(b);
      lastHp[cell] = b.hp;
      const x = cellMinX(b.col);
      const y = cellMinY(b.row);
      const steel = b.type === 'indestructible';
      drawBlock(b, x, y, steel ? null : crackFor(b.hp, maxHp[cell]));
      if (!steel) {
        lctx.fillStyle = BLOCK_TEXT[b.type];
        lctx.fillText(String(b.hp), x + CELL_W / 2, y + CELL_H / 2 + 1);
      }
    }
    stats.blocksDrawn = board.blocks.length;
    lastCount = board.blocks.length;
    dirty = false;
  }

  // Events are presentation-only: flash on hit, burst on destruction. Preallocated, no capture per frame.
  const onEvent = (type, a, b) => {
    extra?.(type, a, b);
    if (type === 'HIT') flash[a] = FLASH_S;
    else if (type === 'DESTROY') {
      const col = a % board.cols;
      const row = (a / board.cols) | 0;
      const name = BLOCK_TYPES[b];
      particles.burst(cellMinX(col) + CELL_W / 2, cellMinY(row) + CELL_H / 2, name === 'core' ? 32 : 12, BURST[name]);
    }
  };

  function refreshAim(run) {
    const c = aimCache;
    if (c.lx === run.launcherX && c.ax === run.aim.x && c.ay === run.aim.y && c.version === stats.layerRedraws) return;
    origin.x = run.launcherX;
    c.result = Raycaster.cast(origin, run.aim, board);
    c.lx = run.launcherX;
    c.ax = run.aim.x;
    c.ay = run.aim.y;
    c.version = stats.layerRedraws;
    const { contact, reflected } = c.result;
    if (contact === null) return void (c.dots = 0);
    aimPts[0] = run.launcherX;
    aimPts[1] = LAUNCHER_Y;
    aimPts[2] = contact.x;
    aimPts[3] = contact.y;
    aimPts[4] = reflected ? reflected.x1 : contact.x;
    aimPts[5] = reflected ? reflected.y1 : contact.y;
    c.dots = aimDots(aimPts, reflected ? 3 : 2, dots);
  }

  function drawAim(run) {
    refreshAim(run);
    const { contact } = aimCache.result;
    if (contact === null) return;
    for (let i = 0; i < aimCache.dots; i++) {
      ctx.globalAlpha = dots[i * 3 + 2];
      if (!sprite(ctx, 'traj_dot', dots[i * 3], dots[i * 3 + 1], DOT_SPRITE)) {
        ctx.fillStyle = FX.white;
        ctx.fillRect(dots[i * 3] - 2, dots[i * 3 + 1] - 2, 4, 4);
      }
    }
    ctx.globalAlpha = 1;
    if (contact.surface === 'block') sprite(ctx, 'traj_impact', contact.x, contact.y, IMPACT_SPRITE);
    else sprite(ctx, 'traj_bounce', contact.x, contact.y, BOUNCE_SPRITE);
  }

  function drawLauncher(x, enabled) {
    if (enabled) {
      ctx.drawImage(glow, x - GLOW_R, LAUNCHER_Y - GLOW_R);
      stats.launcherGlow++;
    }
    ctx.strokeStyle = enabled ? COLORS.cyan : COLORS.textMuted;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(RING_DASH);
    ctx.beginPath();
    ctx.arc(x, LAUNCHER_Y, 16, 0, TWO_PI);
    ctx.stroke();
    ctx.setLineDash(NO_DASH);
    ctx.fillStyle = FX.white;
    ctx.beginPath();
    ctx.arc(x, LAUNCHER_Y, 7, 0, TWO_PI);
    ctx.fill();
  }

  function drawDynamic(state, run, dt, alpha) {
    // hit flashes (no sprite delivered yet: procedural, design E5)
    ctx.fillStyle = FX.hitFlash;
    for (let i = 0; i < flash.length; i++) {
      if (flash[i] <= 0) continue;
      flash[i] -= dt;
      ctx.fillRect(cellMinX(i % board.cols) + 1, cellMinY((i / board.cols) | 0) + 1, CELL_W - 2, CELL_H - 2);
    }
    // orbs with their +V value below (A11)
    ctx.font = ORB_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < board.orbs.length; i++) {
      const o = board.orbs[i];
      if (o.captured) continue;
      if (!sprite(ctx, 'orb_splitter', o.x, o.y, ORB_SPRITE)) {
        ctx.strokeStyle = COLORS.cyan;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, TWO_PI);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.cyan;
      ctx.fillText(`+${o.value}`, o.x, o.y + ORB_SPRITE / 2 + 8);
    }
    const aiming = state === 'Aiming' && !run.paused;
    if (state === 'Aiming' && run.aim) drawAim(run);
    // balls, interpolated while the simulation is running
    const flying = (state === 'Firing' || state === 'Simulating') && !run.paused;
    const k = flying ? alpha * STEP * run.speed : 0;
    ctx.fillStyle = FX.white;
    for (let i = 0; i < session.balls.count; i++) {
      const b = session.balls.items[i];
      const x = b.x + b.dir.x * b.speed * k;
      const y = b.y + b.dir.y * b.speed * k;
      if (!sprite(ctx, 'ball', x, y, BALL_SPRITE)) {
        ctx.beginPath();
        ctx.arc(x, y, BALL_RADIUS, 0, TWO_PI);
        ctx.fill();
      }
    }
    drawLauncher(run.launcherX, aiming);
    const p = ui.pointer;
    if (aiming && p && p.inBoard) sprite(ctx, 'cursor_crosshair', p.x, p.y, CROSS_SPRITE);
    // particles
    const items = particles.pool.items;
    for (let i = 0; i < particles.pool.count; i++) {
      const q = items[i];
      ctx.globalAlpha = q.life / q.maxLife;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  }

  function refreshHud(state, nowMs) {
    if (state === hudState && nowMs - hudAt < HUD_REFRESH_MS) return;
    const snap = session.snapshot();
    hud = hudModel(snap);
    modal = modalModel(snap, { record: snap.level.index === null ? null : progression?.record(snap.level.index) ?? null });
    hudState = state;
    hudAt = nowMs;
  }

  function draw(alpha, nowMs) {
    stats.frames++;
    const dt = lastNow === null ? 0 : Math.min(Math.max((nowMs - lastNow) / 1000, 0), MAX_DT);
    lastNow = nowMs;
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H); // the CSS stage background shows through
    const state = session.fsm.state;
    if (state === 'Loading' || state === 'Title') {
      drawTitle(ctx, titleModel({ state, loading: session.loading }, nowMs, ui.loadError === true));
      return;
    }
    syncBoard();
    session.drainEvents(onEvent);
    particles.update(dt);
    detectDirty();
    if (dirty) drawLayer();
    ctx.save();
    ctx.translate(BOARD_ORIGIN.x, BOARD_ORIGIN.y);
    ctx.drawImage(layer, 0, 0);
    drawDynamic(state, session.run, dt, alpha);
    ctx.restore();
    refreshHud(state, nowMs);
    drawHud(ctx, hud);
    if (modal) drawModal(ctx, modal);
  }

  return {
    draw,
    stats,
    particles,
    setAtlas(next) {
      atlas = next;
      dirty = true;
    },
    // Webfonts arrived: canvas text in the static layer must be drawn again.
    invalidate() {
      dirty = true;
    },
  };
}
