// DOM view of the HUD (design D5): TELEMETRÍA and CONTROL panels and the pause overlay, laid out on the
// 1920x1080 stage as in Design/Game UI. Built once; update() patches only values that changed.
// All data comes from hudModel (Hud.js); styling lives in styles.css (.hud-*), colors via tones.
import { MAX_PIPS, SPEEDS } from './Hud.js';
import { strings } from './strings.js';

const kbd = (k) => `<kbd>${k}</kbd>`;

const TELEMETRY = `
  <header class="panel-head"><span class="label">${strings.telemetry}</span>
    <span class="status"><i class="dot"></i><span data-k="status"></span></span></header>
  <section class="sec"><span class="label">${strings.stage}</span>
    <span class="stage-num" data-k="stage"></span><span class="sub" data-k="puzzle"></span></section>
  <section class="sec gap16">
    <div class="row"><span class="label">${strings.balls}</span>
      <span class="count"><span data-k="ballsActive"></span><span class="total" data-k="ballsSize"></span></span></div>
    <div class="pips">${'<span class="pip"></span>'.repeat(MAX_PIPS)}</div>
    <div class="legend"><span><i class="lg fly"></i>${strings.inFlight}</span><span><i class="lg avail"></i>${strings.available}</span><span><i class="lg used"></i>${strings.used}</span></div>
  </section>
  <section class="sec gap16">
    <div class="row"><span class="label">${strings.turns}</span>
      <span class="count" data-k="turnsBox"><span data-k="turnsLeft"></span><span class="total" data-k="turnsMax"></span></span></div>
    <div class="segs" data-k="segs"></div><span class="sub small" data-k="turnsCaption"></span>
  </section>
  <section class="sec grid2 last">
    <div class="metric"><span class="label sm">${strings.points}</span><span class="value" data-k="points"></span></div>
    <div class="metric"><span class="label sm">${strings.time}</span><span class="value" data-k="time"></span></div>
  </section>`;

const CONTROL = `
  <header class="panel-head"><span class="label">${strings.control}</span></header>
  <section class="sec gap12">
    <button class="btn primary launch" data-act="launch">${strings.launch}${kbd('Space')}</button>
    <div class="grid2 gap12">
      <button class="btn" data-act="pause"><span data-k="pauseLabel"></span>${kbd('P')}</button>
      <button class="btn" data-act="restart">${strings.restart}${kbd('R')}</button>
    </div>
  </section>
  <section class="sec gap14">
    <div class="row"><span class="label">${strings.speed}</span><span class="speed-now" data-k="speed"></span></div>
    <div class="speeds">${SPEEDS.map((v) => `<button class="speed" data-act="speed-${v}">${v}X${kbd(v)}</button>`).join('')}</div>
  </section>
  <section class="sec gap14 last"><span class="label">${strings.shortcuts}</span>
    ${strings.shortcutList.map((s) => `<div class="shortcut"><span>${s.label}</span><span>${s.keys.map(kbd).join('')}</span></div>`).join('')}
  </section>`;

const PAUSE = `<div class="pause-pill"><span>${strings.pause}</span>${kbd('P')}</div>`;

function el(tag, className, html, attrs = {}) {
  const node = document.createElement(tag);
  node.className = className;
  node.innerHTML = html;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// dispatch(action) receives the same actions the keyboard produces; the session gates them by state.
export function createHudDom(root, { dispatch }) {
  const left = el('aside', 'hud-panel left', TELEMETRY, { 'data-hud': 'telemetry' });
  const right = el('aside', 'hud-panel right', CONTROL, { 'data-hud': 'control' });
  const pause = el('div', 'pause-overlay', PAUSE);
  root.append(left, right, pause);

  const k = {};
  for (const node of root.querySelectorAll('[data-k]')) k[node.dataset.k] = node;
  const status = left.querySelector('.status');
  const pipsBox = left.querySelector('.pips');
  const pips = [...pipsBox.children];
  const buttons = {};
  for (const b of root.querySelectorAll('[data-act]')) buttons[b.dataset.act] = b;
  const ACTIONS = { launch: { type: 'FIRE' }, pause: { type: 'PAUSE' }, restart: { type: 'RESTART' } };
  for (const v of SPEEDS) ACTIONS[`speed-${v}`] = { type: 'SET_SPEED', v };
  for (const [act, b] of Object.entries(buttons)) {
    b.tabIndex = -1; // never keyboard-focused: Space stays the FIRE key, not a button press
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => dispatch({ ...ACTIONS[act] }));
  }

  root.hidden = true; // until the first in-level update (no empty panels before the first frame)
  const last = new Map([['visible', false]]);
  const changed = (key, value) => {
    if (last.get(key) === value) return false;
    last.set(key, value);
    return true;
  };
  const text = (key, value) => changed(key, value) && (k[key].textContent = value);
  const cls = (node, key, value) => changed(key, value) && (node.className = value);
  const flag = (node, key, value, set) => changed(key, value) && set(value);

  function segments(total) {
    if (!changed('segTotal', total)) return;
    k.segs.style.gridTemplateColumns = `repeat(${total}, 1fr)`;
    k.segs.replaceChildren(...Array.from({ length: total }, () => el('span', 'seg', '')));
  }

  function update(hud) {
    flag(root, 'visible', hud !== null, (v) => (root.hidden = !v));
    if (hud === null) return;
    const t = hud.telemetry;
    const c = hud.control;
    text('status', t.status.label);
    cls(status, 'statusTone', `status tone-${t.status.tone}`);
    text('stage', t.stage);
    text('puzzle', t.puzzle);
    text('ballsActive', t.balls.active);
    text('ballsSize', ` / ${t.balls.size}`);
    flag(pipsBox, 'pipsOn', t.balls.mode === 'pips', (v) => pipsBox.classList.toggle('off', !v));
    const { flying, used, available } = t.balls.pips;
    for (let i = 0; i < MAX_PIPS; i++) {
      const s = i < flying ? 'fly' : i < flying + used ? 'used' : i < flying + used + available ? 'avail' : 'none';
      if (pips[i].dataset.s !== s) pips[i].dataset.s = s;
    }
    text('turnsLeft', t.turns.left);
    text('turnsMax', ` / ${t.turns.max}`);
    text('turnsCaption', t.turns.caption);
    cls(k.turnsBox, 'turnsTone', `count tone-${t.turns.tone}`);
    cls(k.segs, 'segsTone', `segs tone-${t.turns.tone}`);
    segments(t.turns.segments.total);
    for (let i = 0; i < k.segs.children.length; i++) k.segs.children[i].classList.toggle('on', i < t.turns.segments.filled);
    text('points', t.points);
    text('time', t.time);

    flag(buttons.launch, 'launchOn', c.launch.enabled, (v) => (buttons.launch.disabled = !v));
    text('pauseLabel', c.pause.label);
    flag(buttons.pause, 'pauseOn', c.pause.enabled, (v) => (buttons.pause.disabled = !v));
    flag(buttons.pause, 'pauseActive', c.pause.active, (v) => buttons.pause.classList.toggle('active', v));
    flag(buttons.restart, 'restartOn', c.restart.enabled, (v) => (buttons.restart.disabled = !v));
    text('speed', c.speed.current);
    for (const o of c.speed.options) {
      const b = buttons[`speed-${o.v}`];
      flag(b, `speedOn${o.v}`, o.enabled, (v) => (b.disabled = !v));
      flag(b, `speedActive${o.v}`, o.active, (v) => b.classList.toggle('on', v));
    }
    flag(pause, 'paused', hud.pause.visible, (v) => pause.classList.toggle('show', v));
  }

  return { update };
}
