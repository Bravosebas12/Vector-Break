// DOM view of the HUD (design D5): TELEMETRÍA and CONTROL panels, pause overlay and result modals, laid out on the
// 1920x1080 stage as in Design/Game UI. Built once; update() patches only values that changed.
// All data comes from hudModel (Hud.js); styling lives in styles.css (.hud-*), colors via tones.
import { MAX_PIPS, SPEEDS, MODES } from './Hud.js';
import { strings } from './strings.js';

const kbd = (k) => `<kbd>${k}</kbd>`;

const TELEMETRY = `
  <header class="panel-head"><span class="label">${strings.telemetry}</span>
    <span class="status"><i class="dot"></i><span data-k="status"></span></span></header>
  <section class="sec"><span class="label">${strings.stage}</span>
    <span class="stage-num" data-k="stage"></span><span class="sub" data-k="puzzle"></span></section>
  <section class="sec gap16">
    <div class="row"><span class="label">${strings.balls}</span>
      <span class="count"><span data-k="ballsLeft"></span><span class="total" data-k="ballsSize"></span></span></div>
    <span class="sub small tight">${strings.ballsCaption}</span>
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
  <section class="sec gap14 mode" data-k="modeSection">
    <div class="row"><span class="label">${strings.fireMode}</span>${kbd('M')}</div>
    <div class="speeds modes">${MODES.map((v) => `<button class="speed" data-act="mode-${v}">${v}<span class="mdots">${'<i class="mdot"></i>'.repeat(v)}</span></button>`).join('')}</div>
    <span class="sub small tight">${strings.fireModeCaption}</span>
  </section>
  <section class="sec gap14">
    <div class="row"><span class="label">${strings.speed}</span><span class="speed-now" data-k="speed"></span></div>
    <div class="speeds">${SPEEDS.map((v) => `<button class="speed" data-act="speed-${v}">${v}X${kbd(v)}</button>`).join('')}</div>
  </section>
  <section class="sec gap14 last"><span class="label">${strings.shortcuts}</span>
    ${strings.shortcutList.map((s) => `<div class="shortcut"><span>${s.label}</span><span>${s.keys.map(kbd).join('')}</span></div>`).join('')}
  </section>`;

const PAUSE = `<div class="pause-pill"><span>${strings.pause}</span>${kbd('P')}</div>`;

// Tutorial hints (tutorial-hints capability; Claude Design canvas, section A). The caret points to the target.
const CARET_LEFT = '<svg class="caret left" aria-hidden="true" width="12" height="20" viewBox="0 0 12 20"><path d="M12 0L1 10L12 20Z"/></svg>';
const CARET_RIGHT = '<svg class="caret right" aria-hidden="true" width="12" height="20" viewBox="0 0 12 20"><path d="M0 0L11 10L0 20Z"/></svg>';
const HINT_MOVE = `${CARET_LEFT}<div class="hint-box"><div class="hint-text"><span class="hint-kicker">${strings.tutorial}</span><span class="hint-msg">${strings.hintMove}</span></div><span class="hint-keys">${kbd('A')}${kbd('D')}</span></div>${CARET_RIGHT}`;
const HINT_MODE = `<div class="hint-box"><div class="hint-text"><span class="hint-kicker">${strings.tutorial}</span><span class="hint-msg">${strings.hintMode}</span><span class="hint-sub">${strings.hintModeKeys}</span></div><span class="hint-keys">${kbd('M')}</span></div>${CARET_RIGHT}`;
const BOARD_X = 420; // stage x of the board (Renderer BOARD_ORIGIN)
const HINT_GAP = 62; // from the launcher centre to the hint caret (canvas artboard 01)
const HINT_FLIP_X = 640; // beyond this launcher x the move hint sits on the left so it stays on the board

const STAR = '<svg class="star" width="64" height="64" viewBox="0 0 48 48"><polygon points="24,3 30.2,16.6 45,18.2 33.9,28.2 37,43 24,35.4 11,43 14.1,28.2 3,18.2 17.8,16.6"/></svg>';
const metric = (i) => `<div class="mcell"><span class="label sm" data-k="m${i}Label"></span>
  <span class="mval"><span data-k="m${i}Value"></span><span class="total" data-k="m${i}Total"></span></span><span class="msub" data-k="m${i}Sub"></span></div>`;

const VICTORY = `<div class="card">
  <div class="card-top"><span class="kicker" data-k="vKicker"></span><span class="title">${strings.puzzleSolved}</span>
    <div class="stars">${STAR.repeat(3)}</div><span class="perfect">${strings.perfectShot}</span></div>
  <div class="metrics">${[0, 1, 2].map(metric).join('')}</div>
  <span class="notice" data-k="vNotice"></span>
  <div class="actions"><button class="btn mbtn" data-act="modal-RESTART">${strings.retry}${kbd('R')}</button>
    <button class="btn mbtn primary" data-act="modal-NEXT">${strings.nextLevel}${kbd('Enter')}</button></div>
</div>`;

const DEFEAT = `<div class="card">
  <span class="kicker">${strings.noShots}</span><span class="title">${strings.puzzleFailed}</span>
  <span class="message" data-k="dMessage"></span>
  <button class="btn light" data-act="modal-RESTART-defeat">${strings.restartPuzzle}${kbd('R')}</button>
</div>`;

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
  const victory = el('div', 'result victory', VICTORY);
  const defeat = el('div', 'result defeat', DEFEAT);
  const hintMove = el('div', 'hint', HINT_MOVE, { 'data-hint': 'move' });
  const hintMode = el('div', 'hint flip', HINT_MODE, { 'data-hint': 'mode' });
  root.append(left, right, pause, victory, defeat, hintMove, hintMode);

  const k = {};
  for (const node of root.querySelectorAll('[data-k]')) k[node.dataset.k] = node;
  const status = left.querySelector('.status');
  const pipsBox = left.querySelector('.pips');
  const pips = [...pipsBox.children];
  const buttons = {};
  for (const b of root.querySelectorAll('[data-act]')) buttons[b.dataset.act] = b;
  const ACTIONS = { launch: { type: 'FIRE' }, pause: { type: 'PAUSE' }, restart: { type: 'RESTART' } };
  for (const v of SPEEDS) ACTIONS[`speed-${v}`] = { type: 'SET_SPEED', v };
  for (const v of MODES) ACTIONS[`mode-${v}`] = { type: 'SET_MODE', v };
  ACTIONS['modal-RESTART'] = ACTIONS['modal-RESTART-defeat'] = { type: 'PRESS', target: 'RESTART' };
  ACTIONS['modal-NEXT'] = { type: 'PRESS', target: 'NEXT' };
  const stars = [...victory.querySelectorAll('.star')];
  const perfect = victory.querySelector('.perfect');
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

  function updateModal(m) {
    flag(victory, 'victory', m?.kind === 'victory', (v) => victory.classList.toggle('show', v));
    flag(defeat, 'defeat', m?.kind === 'defeat', (v) => defeat.classList.toggle('show', v));
    if (m?.kind === 'defeat') return void text('dMessage', m.message);
    if (m?.kind !== 'victory') return;
    text('vKicker', m.kicker);
    stars.forEach((star, i) => flag(star, `star${i}`, i < m.stars, (v) => star.classList.toggle('on', v)));
    flag(perfect, 'perfect', m.perfect, (v) => perfect.classList.toggle('show', v));
    m.metrics.forEach((x, i) => {
      text(`m${i}Label`, x.label);
      text(`m${i}Value`, x.value);
      text(`m${i}Total`, x.total);
      text(`m${i}Sub`, x.sub);
    });
    text('vNotice', m.notice ?? '');
    const hasNext = m.buttons.some((b) => b.action === 'NEXT');
    flag(buttons['modal-NEXT'], 'hasNext', hasNext, (v) => (buttons['modal-NEXT'].hidden = !v));
    flag(buttons['modal-RESTART'], 'retryPrimary', !hasNext, (v) => buttons['modal-RESTART'].classList.toggle('primary', v));
  }

  // hud: hudModel or null (title/loading: everything hidden); modal: modalModel or null.
  function update(hud, modal = null) {
    flag(root, 'visible', hud !== null, (v) => (root.hidden = !v));
    if (hud === null) return;
    updateModal(modal);
    const t = hud.telemetry;
    const c = hud.control;
    text('status', t.status.label);
    cls(status, 'statusTone', `status tone-${t.status.tone}`);
    text('stage', t.stage);
    text('puzzle', t.puzzle);
    text('ballsLeft', t.balls.left);
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
    const m = c.mode;
    for (const o of m.options) {
      const b = buttons[`mode-${o.v}`];
      flag(b, `modeOn${o.v}`, m.enabled, (v) => (b.disabled = !v));
      flag(b, `modeActive${o.v}`, o.active, (v) => b.classList.toggle('on', v));
      flag(b, `modeLimited${o.v}`, o.active && m.limited, (v) => b.classList.toggle('limited', v));
    }
    flag(pause, 'paused', hud.pause.visible, (v) => pause.classList.toggle('show', v));
  }

  // hint: Tutorial.view() result ({ kind, x }) or null. Patches only what changed.
  function updateHint(hint) {
    const kind = hint?.kind ?? null;
    flag(hintMove, 'hintMove', kind === 'move', (v) => hintMove.classList.toggle('show', v));
    flag(hintMode, 'hintMode', kind === 'mode', (v) => hintMode.classList.toggle('show', v));
    flag(k.modeSection, 'modeHighlight', kind === 'mode', (v) => k.modeSection.classList.toggle('highlight', v));
    if (kind !== 'move') return;
    const flip = hint.x > HINT_FLIP_X;
    flag(hintMove, 'hintFlip', flip, (v) => hintMove.classList.toggle('flip', v));
    const pos = flip ? `${1920 - (BOARD_X + hint.x - HINT_GAP)}px` : `${BOARD_X + hint.x + HINT_GAP}px`;
    if (changed('hintPos', pos)) {
      hintMove.style.left = flip ? '' : pos;
      hintMove.style.right = flip ? pos : '';
    }
  }

  return { update, updateHint };
}
