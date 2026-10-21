// Canvas drawing of the result modals from the DOM-free models in Hud.js (D3). Panels are DOM (HudDom.js).
// Pure drawing: every number and label arrives already formatted by `hudModel` / `modalModel`.
import { LOGICAL_W, LOGICAL_H } from './Viewport.js';
import { strings } from './strings.js';

const FONT = 'system-ui, sans-serif';
const CYAN = '#2DE2E6';
const MODAL = { w: 760, h: 520 };

function text(ctx, value, x, y, { size = 26, color = '#FFFFFF', align = 'left', bold = false } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

const BUTTON = { w: 220, h: 64, gap: 24 };

// Logical-canvas rectangles of the modal buttons, left to right (shared by drawing and hit testing).
export function modalButtonRects(count) {
  const left = (LOGICAL_W - (count * BUTTON.w + (count - 1) * BUTTON.gap)) / 2;
  const y = (LOGICAL_H - MODAL.h) / 2 + MODAL.h - 110;
  return Array.from({ length: count }, (_, i) => ({ x: left + i * (BUTTON.w + BUTTON.gap), y, w: BUTTON.w, h: BUTTON.h }));
}

// Action of the modal button under logical point (x, y), or null.
export function hitModalButton(modal, x, y) {
  const rects = modalButtonRects(modal.buttons.length);
  const i = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return i < 0 ? null : modal.buttons[i].action;
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
  const rects = modalButtonRects(modal.buttons.length);
  modal.buttons.forEach((b, i) => {
    const { x: bx, y: by, w: bw, h: bh } = rects[i];
    ctx.fillStyle = b.primary ? CYAN : '#1B2140';
    ctx.fillRect(bx, by, bw, bh);
    text(ctx, b.label, bx + bw / 2, by + bh / 2, { size: 24, color: b.primary ? '#0B0F24' : '#FFFFFF', align: 'center', bold: true });
  });
}
