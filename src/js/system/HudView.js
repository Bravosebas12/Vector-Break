// Canvas drawing of the HUD panels and result modals from the DOM-free models in Hud.js (D3).
// Pure drawing: every number and label arrives already formatted by `hudModel` / `modalModel`.
import { LOGICAL_W, LOGICAL_H } from './Viewport.js';
import { MAX_PIPS } from './Hud.js';
import { strings } from './strings.js';

const FONT = 'system-ui, sans-serif';
const PANEL = { y: 40, w: 360, h: 1000 };
export const LEFT_X = 40;
export const RIGHT_X = LOGICAL_W - 40 - PANEL.w;
const CYAN = '#2DE2E6';
const MODAL = { w: 760, h: 520 };

function text(ctx, value, x, y, { size = 26, color = '#FFFFFF', align = 'left', bold = false } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, title) {
  ctx.fillStyle = 'rgba(11,15,36,0.9)';
  ctx.fillRect(x, PANEL.y, PANEL.w, PANEL.h);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, PANEL.y, PANEL.w, PANEL.h);
  text(ctx, title, x + 24, PANEL.y + 44, { size: 30, color: CYAN, bold: true });
}

function row(ctx, x, y, label, value, color) {
  text(ctx, label, x + 24, y, { size: 22, color: '#8892B0' });
  text(ctx, value, x + PANEL.w - 24, y, { size: 30, color, align: 'right', bold: true });
}

function drawBalls(ctx, x, y, balls) {
  text(ctx, strings.balls, x + 24, y, { size: 22, color: '#8892B0' });
  if (balls.mode === 'number') return text(ctx, String(balls.count), x + PANEL.w - 24, y, { size: 30, align: 'right', bold: true });
  for (let i = 0; i < Math.min(balls.count, MAX_PIPS); i++) {
    ctx.fillStyle = i < balls.count - balls.active ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x + 160 + i * 14, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHud(ctx, hud) {
  const t = hud.telemetry;
  panel(ctx, LEFT_X, t.title);
  row(ctx, LEFT_X, 160, t.stageLabel, t.stage, '#FFFFFF');
  row(ctx, LEFT_X, 230, strings.puzzle, t.puzzle, '#FFFFFF');
  drawBalls(ctx, LEFT_X, 300, t.balls);
  row(ctx, LEFT_X, 370, strings.turns, `${t.turns.left}/${t.turns.max}`, t.turns.color);
  row(ctx, LEFT_X, 440, strings.points, String(t.points), '#FFFFFF');
  row(ctx, LEFT_X, 510, strings.time, t.time, '#FFFFFF');

  const c = hud.control;
  panel(ctx, RIGHT_X, c.title);
  text(ctx, `${c.launch.label} [${c.launch.key}]`, RIGHT_X + 24, 160, { color: c.launch.enabled ? CYAN : '#6B7280', bold: true });
  row(ctx, RIGHT_X, 230, c.speed.label, c.speed.current, CYAN);
  text(ctx, strings.shortcuts, RIGHT_X + 24, 330, { size: 24, color: CYAN, bold: true });
  c.shortcuts.forEach((s, i) => {
    text(ctx, s.keys, RIGHT_X + 24, 380 + i * 44, { size: 22, color: '#8892B0' });
    text(ctx, s.action, RIGHT_X + PANEL.w - 24, 380 + i * 44, { size: 22, align: 'right' });
  });
  if (hud.pause.visible) {
    ctx.fillStyle = 'rgba(5,6,15,0.6)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    text(ctx, hud.pause.label, LOGICAL_W / 2, LOGICAL_H / 2, { size: 96, align: 'center', bold: true });
  }
}

export function drawModal(ctx, modal) {
  const x = (LOGICAL_W - MODAL.w) / 2;
  const y = (LOGICAL_H - MODAL.h) / 2;
  const cx = LOGICAL_W / 2;
  ctx.fillStyle = 'rgba(5,6,15,0.75)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.fillStyle = '#0B0F24';
  ctx.fillRect(x, y, MODAL.w, MODAL.h);
  ctx.strokeStyle = modal.kind === 'victory' ? CYAN : '#F72585';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, MODAL.w, MODAL.h);
  text(ctx, modal.title, cx, y + 70, { size: 64, align: 'center', bold: true });
  let line = y + 140;
  if (modal.kind === 'victory') {
    text(ctx, '★'.repeat(modal.stars) + '☆'.repeat(3 - modal.stars), cx, line, { size: 64, color: '#FFC857', align: 'center' });
    line += 60;
    if (modal.perfectLabel) text(ctx, modal.perfectLabel, cx, line, { size: 28, color: '#FFC857', align: 'center', bold: true });
    line += 50;
  }
  text(ctx, `${strings.points} ${modal.points}`, cx, line, { size: 36, align: 'center' });
  line += 50;
  if (modal.record) {
    text(ctx, `${strings.record} ${modal.record.stars}★ ${modal.record.score}`, cx, line, { size: 26, color: '#8892B0', align: 'center' });
    line += 40;
  }
  if (modal.notice) text(ctx, modal.notice, cx, line, { size: 26, color: CYAN, align: 'center' });
  const bw = 220;
  const gap = 24;
  const left = cx - (modal.buttons.length * bw + (modal.buttons.length - 1) * gap) / 2;
  modal.buttons.forEach((b, i) => {
    const bx = left + i * (bw + gap);
    const by = y + MODAL.h - 110;
    ctx.fillStyle = b.primary ? CYAN : '#1B2140';
    ctx.fillRect(bx, by, bw, 64);
    text(ctx, b.label, bx + bw / 2, by + 32, { size: 24, color: b.primary ? '#0B0F24' : '#FFFFFF', align: 'center', bold: true });
  });
}
