// Rules: .claude/skills/canvas-renderer-opt/SKILL.md
// Canvas renderer. Layers: static board (offscreen, redrawn only when a block's HP or presence
// changes) -> hit flashes -> orbs -> aim preview -> balls -> launcher -> particles.
// All drawing is placeholder/procedural; atlas cracks are used only when a real sheet is loaded.
// Nothing here allocates per frame, apart from the aim preview, which is cached until its inputs change.
import { createCanvas } from './Atlas.js';
import { LOGICAL_W, LOGICAL_H } from './Viewport.js';
import { Raycaster } from './Raycaster.js';
import { hudModel, modalModel } from './Hud.js';
import { drawHud, drawModal } from './HudView.js';
import { titleModel, drawTitle } from './TitleScreen.js';
import { BLOCK_TYPES } from '../entities/Block.js';
import {
  BOARD_W,
  BOARD_H,
  CELL_W,
  CELL_H,
  GRID_X,
  GRID_W,
  GRID_H,
  BALL_RADIUS,
  FLOOR_Y,
  LAUNCHER_Y,
  STEP,
  cellMinX,
  cellMinY,
} from './Layout.js';

// Render-only placement of the 1080x1000 board on the 1920x1080 canvas (centred).
export const BOARD_ORIGIN = Object.freeze({ x: (LOGICAL_W - BOARD_W) / 2, y: (LOGICAL_H - BOARD_H) / 2 });

const FLASH_S = 0.06; // design E5: white, alpha 0.6, 60 ms
const MAX_DT = 0.1;
const HUD_REFRESH_MS = 100; // the models allocate: refresh them at 10 Hz and on every state change
const TWO_PI = Math.PI * 2;
const DASH = [10, 10];
const NO_DASH = [];
// Four HP steps per type (full -> nearly dead); indestructible and multiplier never change.
const TINTS = {
  standard: ['#2DE2E6', '#22B3C4', '#1A8499', '#14566E'],
  reinforced: ['#8E6BFF', '#7152D6', '#5538A8', '#3B277A'],
  core: ['#FF3D7F', '#D12E68', '#A32250', '#751738'],
  indestructible: ['#5C6378', '#5C6378', '#5C6378', '#5C6378'],
};
const BURST_COLOR = { standard: '#2DE2E6', reinforced: '#8E6BFF', core: '#FF3D7F', indestructible: '#5C6378' };

// 0 = healthy ... 3 = nearly destroyed.
export const hpStep = (hp, maxHp) => {
  const ratio = hp / maxHp;
  return ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3;
};

// Crack overlay by damage taken: 30 / 60 / 90 %.
export const crackFor = (hp, maxHp) => {
  const damage = 1 - hp / maxHp;
  return damage >= 0.9 ? 'crack_90' : damage >= 0.6 ? 'crack_60' : damage >= 0.3 ? 'crack_30' : null;
};

// `onEvent(type, a, b)`: extra consumer (audio) fed from the renderer's single drain of the event ring.
// `ui.loadError` is set by the boot code when a level fails to load (the start screen then shows loadError).
export function createRenderer({ session, ctx, particles, atlas = null, progression = null, onEvent: extra = null, ui = {} }) {
  const layer = createCanvas(BOARD_W, BOARD_H);
  const lctx = layer.getContext('2d');
  const stats = { frames: 0, layerRedraws: 0, blocksDrawn: 0 };
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
  const aimCache = { lx: NaN, ax: NaN, ay: NaN, version: -1, result: null };
  const origin = { x: 0, y: LAUNCHER_Y };

  const cellOf = (b) => b.row * board.cols + b.col;

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

  function drawCracks(b, x, y, name, step) {
    if (atlas && !atlas.placeholder) {
      const e = atlas.get(name);
      lctx.drawImage(e.source, e.sx, e.sy, e.sw, e.sh, x, y, CELL_W, CELL_H);
      return;
    }
    lctx.strokeStyle = 'rgba(0,0,0,0.55)';
    lctx.lineWidth = 2;
    lctx.beginPath();
    for (let k = 0; k <= step; k++) {
      const sx = x + 20 + k * 30;
      lctx.moveTo(sx, y + 4);
      lctx.lineTo(sx + 8, y + 22);
      lctx.lineTo(sx - 6, y + CELL_H - 4);
    }
    lctx.stroke();
  }

  function drawLayer() {
    stats.layerRedraws++;
    lctx.fillStyle = '#0B0F24';
    lctx.fillRect(0, 0, BOARD_W, BOARD_H);
    lctx.strokeStyle = 'rgba(255,255,255,0.06)';
    lctx.lineWidth = 1;
    lctx.beginPath();
    for (let c = 0; c <= board.cols; c++) {
      lctx.moveTo(GRID_X + c * CELL_W, 0);
      lctx.lineTo(GRID_X + c * CELL_W, GRID_H);
    }
    for (let r = 0; r <= board.rows; r++) {
      lctx.moveTo(GRID_X, r * CELL_H);
      lctx.lineTo(GRID_X + GRID_W, r * CELL_H);
    }
    lctx.moveTo(GRID_X, FLOOR_Y);
    lctx.lineTo(GRID_X + GRID_W, FLOOR_Y);
    lctx.stroke();
    lastHp.fill(0);
    lctx.font = 'bold 22px system-ui, sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    for (let i = 0; i < board.blocks.length; i++) {
      const b = board.blocks[i];
      const cell = cellOf(b);
      lastHp[cell] = b.hp;
      const x = cellMinX(b.col);
      const y = cellMinY(b.row);
      const step = b.type === 'indestructible' ? 0 : hpStep(b.hp, maxHp[cell]);
      lctx.fillStyle = TINTS[b.type][step];
      lctx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
      const crack = b.type === 'indestructible' ? null : crackFor(b.hp, maxHp[cell]);
      if (crack) drawCracks(b, x, y, crack, step);
      if (b.type !== 'indestructible') {
        lctx.fillStyle = '#FFFFFF';
        lctx.fillText(String(b.hp), x + CELL_W / 2, y + CELL_H / 2);
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
      particles.burst(cellMinX(col) + CELL_W / 2, cellMinY(row) + CELL_H / 2, name === 'core' ? 32 : 12, BURST_COLOR[name]);
    }
  };

  function drawAim(run) {
    const c = aimCache;
    if (c.lx !== run.launcherX || c.ax !== run.aim.x || c.ay !== run.aim.y || c.version !== stats.layerRedraws) {
      origin.x = run.launcherX;
      c.result = Raycaster.cast(origin, run.aim, board);
      c.lx = run.launcherX;
      c.ax = run.aim.x;
      c.ay = run.aim.y;
      c.version = stats.layerRedraws;
    }
    const { contact, reflected } = c.result;
    if (contact === null) return;
    ctx.strokeStyle = 'rgba(45,226,230,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash(DASH);
    ctx.beginPath();
    ctx.moveTo(run.launcherX, LAUNCHER_Y);
    ctx.lineTo(contact.x, contact.y);
    if (reflected) ctx.lineTo(reflected.x1, reflected.y1);
    ctx.stroke();
    ctx.setLineDash(NO_DASH);
  }

  function drawDynamic(state, run, dt, alpha) {
    // hit flashes
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < flash.length; i++) {
      if (flash[i] <= 0) continue;
      flash[i] -= dt;
      ctx.fillRect(cellMinX(i % board.cols) + 1, cellMinY((i / board.cols) | 0) + 1, CELL_W - 2, CELL_H - 2);
    }
    // orbs
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < board.orbs.length; i++) {
      const o = board.orbs[i];
      if (o.captured) continue;
      ctx.fillStyle = '#FFC857';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = '#0B0F24';
      ctx.fillText(`+${o.value}`, o.x, o.y);
    }
    if (state === 'Aiming' && run.aim) drawAim(run);
    // balls, interpolated while the simulation is running
    const flying = (state === 'Firing' || state === 'Simulating') && !run.paused;
    const k = flying ? alpha * STEP * run.speed : 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < session.balls.count; i++) {
      const b = session.balls.items[i];
      const x = b.x + b.dir.x * b.speed * k;
      ctx.moveTo(x + BALL_RADIUS, b.y + b.dir.y * b.speed * k);
      ctx.arc(x, b.y + b.dir.y * b.speed * k, BALL_RADIUS, 0, TWO_PI);
    }
    ctx.fill();
    // launcher: cyan ring, grey when it cannot fire
    ctx.strokeStyle = state === 'Aiming' ? '#2DE2E6' : '#6B7280';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(run.launcherX, LAUNCHER_Y, 18, 0, TWO_PI);
    ctx.stroke();
    // particles
    const items = particles.pool.items;
    for (let i = 0; i < particles.pool.count; i++) {
      const p = items[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
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
    ctx.fillStyle = '#05060F';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
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
  };
}
