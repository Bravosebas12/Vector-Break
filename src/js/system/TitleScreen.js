// Rules: .claude/skills/game-loop-state-manager/SKILL.md (Loading and Title states)
// Start screen: a pure model (what to show) plus a draw that needs no atlas, board or HUD.
import { strings } from './strings.js';
import { LOGICAL_W } from './Viewport.js';

const TITLE_Y = 470;
const BAR_W = 600;
const BAR_H = 12;
const BAR_Y = 540;
const LABEL_Y = 590;
const PULSE_MS = 1000;
const CENTER_X = LOGICAL_W / 2;

// snap: { state, loading: {done, total} }. Returns plain data; `bar`/`prompt`/`error` are null when hidden.
export function titleModel(snap, nowMs, loadError = false) {
  const model = { title: { text: strings.title, x: CENTER_X, y: TITLE_Y, align: 'center' }, bar: null, label: null, prompt: null, error: null };
  if (loadError) {
    model.error = strings.loadError;
  } else if (snap.state === 'Title') {
    const alpha = 0.75 + 0.25 * Math.sin((2 * Math.PI * nowMs) / PULSE_MS); // 0.5..1, 1 s period
    model.prompt = { text: strings.clickToStart, alpha };
  } else {
    const { done, total } = snap.loading;
    const ratio = total > 0 ? Math.min(1, done / total) : 0;
    model.bar = { x: CENTER_X - BAR_W / 2, y: BAR_Y, w: BAR_W, h: BAR_H, fill: BAR_W * ratio };
    model.label = strings.loading.replace('{pct}', Math.round(ratio * 100));
  }
  return model;
}

export function drawTitle(ctx, model) {
  const { title, bar, label, prompt, error } = model;
  ctx.save();
  ctx.textAlign = title.align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#E7EAF0';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.fillText(title.text, title.x, title.y);
  ctx.font = '36px system-ui, sans-serif';
  if (bar) {
    ctx.fillStyle = '#2A2E39';
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.fillStyle = '#2DE2E6';
    ctx.fillRect(bar.x, bar.y, bar.fill, bar.h);
    ctx.fillStyle = '#8A93A6';
    ctx.fillText(label, title.x, LABEL_Y);
  }
  if (prompt) {
    ctx.globalAlpha = prompt.alpha;
    ctx.fillStyle = '#E7EAF0';
    ctx.fillText(prompt.text, title.x, BAR_Y + 20);
  }
  if (error) {
    ctx.fillStyle = '#F72585';
    ctx.fillText(error, title.x, BAR_Y + 20);
  }
  ctx.restore();
}
