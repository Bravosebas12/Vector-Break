// Rules: .claude/skills/game-loop-state-manager/SKILL.md (Loading and Title states)
// Start screen: a pure model (what to show) plus a draw that needs no atlas, board or HUD.
// Visuals: Key Art (assets/art/key-art.webp) full stage, a dark band, the two-color wordmark of the
// Key Art centered at x 960 (HU-09 keeps the title centered), the tagline, then progress or the prompt.
import { strings } from './strings.js';
import { LOGICAL_W, LOGICAL_H } from './Viewport.js';
import { COLORS, FONT_UI, FONT_MONO, TITLE_STYLE } from './Theme.js';

const CENTER_X = LOGICAL_W / 2;
const TITLE_Y = 800;
const TAGLINE_Y = 870;
const BAR_W = 480;
const BAR_H = 2;
const BAR_Y = 930;
const LABEL_Y = 960;
const PROMPT_Y = 940;
const BAND_Y = 560; // the band fades in from here to the bottom edge
const RULE_W = 28; // Key Art kicker rule before the prompt
const PULSE_MS = 1000;
const WORDMARK_FONT = `800 104px ${FONT_MONO}`;
const TAGLINE_FONT = `400 22px ${FONT_UI}`;
const LABEL_FONT = `500 16px ${FONT_MONO}`;
const PROMPT_FONT = `600 18px ${FONT_MONO}`;

// snap: { state, loading: {done, total} }. Returns plain data; `bar`/`prompt`/`error` are null when hidden.
export function titleModel(snap, nowMs, loadError = false) {
  const model = {
    title: { text: strings.title, first: strings.titleFirst, second: strings.titleSecond, x: CENTER_X, y: TITLE_Y },
    tagline: { text: strings.tagline, x: CENTER_X, y: TAGLINE_Y },
    bar: null,
    label: null,
    prompt: null,
    error: null,
  };
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

// `art`: the decoded Key Art image, or null while loading / when it failed (the CSS stage shows through).
export function drawTitle(ctx, model, art = null) {
  const { title, tagline, bar, label, prompt, error } = model;
  ctx.save();
  if (art) ctx.drawImage(art, 0, 0, LOGICAL_W, LOGICAL_H);
  const band = ctx.createLinearGradient(0, BAND_Y, 0, LOGICAL_H);
  for (const [at, color] of TITLE_STYLE.band) band.addColorStop(at, color);
  ctx.fillStyle = band;
  ctx.fillRect(0, BAND_Y, LOGICAL_W, LOGICAL_H - BAND_Y);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = WORDMARK_FONT;
  const w1 = ctx.measureText(title.first).width;
  const left = title.x - (w1 + ctx.measureText(title.second).width) / 2;
  ctx.fillStyle = COLORS.textStrong;
  ctx.fillText(title.first, left, title.y);
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText(title.second, left + w1, title.y);

  ctx.textAlign = 'center';
  ctx.font = TAGLINE_FONT;
  ctx.fillStyle = TITLE_STYLE.tagline;
  ctx.fillText(tagline.text, tagline.x, tagline.y);
  if (bar) {
    ctx.fillStyle = COLORS.border;
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(bar.x, bar.y, bar.fill, bar.h);
    ctx.font = LABEL_FONT;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(label, title.x, LABEL_Y);
  }
  if (prompt) {
    ctx.globalAlpha = prompt.alpha;
    ctx.font = PROMPT_FONT;
    ctx.letterSpacing = '0.2em';
    const half = ctx.measureText(prompt.text).width / 2;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(title.x - half - RULE_W - 16, PROMPT_Y, RULE_W, 1);
    ctx.fillText(prompt.text, title.x, PROMPT_Y);
    ctx.letterSpacing = '0px';
  }
  if (error) {
    ctx.font = LABEL_FONT;
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(error, title.x, PROMPT_Y);
  }
  ctx.restore();
}
