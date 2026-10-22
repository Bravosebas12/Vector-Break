// DOM-free HUD projection (D3): pure functions from session snapshot to view models (HudDom renders them).
// Colors are tones ('strong' | 'cyan' | 'amber' | 'magenta'); the view maps them to Theme tokens.
import { strings } from './strings.js';

export const MAX_PIPS = 12;
export const SPEEDS = Object.freeze([1, 2, 4]);
export const MODES = Object.freeze([1, 2, 3]);
const PLAYING = ['Aiming', 'Firing', 'Simulating', 'Resolving'];
const RUNNING = ['Firing', 'Simulating'];
const SKIPPABLE = ['Aiming', 'Firing', 'Simulating', 'Resolving', 'GameOver']; // HU-12: Input.allows, not Victory

const pad2 = (n) => String(n).padStart(2, '0');

export function turnsTone(left) {
  if (left <= 1) return 'magenta';
  if (left <= 3) return 'amber';
  return 'strong';
}

// mm:ss.d (tenths truncated).
export function formatTime(seconds) {
  const tenths = Math.floor(seconds * 10);
  const total = Math.floor(tenths / 10);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}.${tenths % 10}`;
}

// 12480 -> "12 480"
export const formatPoints = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function status(snap) {
  if (snap.state === 'Victory') return { label: strings.solved, tone: 'cyan' };
  if (snap.state === 'GameOver') return { label: strings.failed, tone: 'magenta' };
  if (snap.paused) return { label: strings.pause, tone: 'amber' };
  return { label: strings.playing, tone: 'cyan' };
}

const plural = (n, one, many) => (n === 1 ? one : many.replace('{n}', n));

// Result modal for Victory/GameOver (mockup screens 02-03); `record` is the best stored record or null.
export function modalModel(snap, { levelCount = 6, record = null } = {}) {
  const won = snap.state === 'Victory';
  if (!won && snap.state !== 'GameOver') return null;
  const { stars, score, shots } = snap.result;
  const max = snap.shots.max;
  if (!won) {
    const cores = snap.blocks.filter((b) => b.type === 'core' && b.hp > 0);
    const hp = cores.reduce((sum, b) => sum + b.hp, 0);
    const message = `${plural(max, strings.noShotsOne, strings.noShotsMany)} ${plural(cores.length, strings.coresOne, strings.coresMany).replace('{hp}', hp)}`;
    const buttons = [
      { label: strings.restartPuzzle, key: 'R', action: 'RESTART', primary: true },
      { label: strings.skipLevel, key: 'N', action: 'SKIP', primary: false, enabled: snap.level.index + 1 < levelCount },
    ];
    return { kind: 'defeat', kicker: strings.noShots, title: strings.puzzleFailed, message, buttons, primaryAction: 'RESTART' };
  }
  const hasNext = snap.level.index + 1 < levelCount;
  const buttons = [{ label: strings.retry, key: 'R', action: 'RESTART', primary: !hasNext }];
  if (hasNext) buttons.push({ label: strings.nextLevel, key: 'Enter', action: 'NEXT', primary: true });
  const recordSub = snap.newRecord ? strings.newRecord : record ? strings.recordPoints.replace('{pts}', formatPoints(record.score)) : '';
  return {
    kind: 'victory',
    kicker: `${strings.stage} ${pad2(snap.level.index + 1)} · ${strings.solved}`,
    title: strings.puzzleSolved,
    stars,
    perfect: stars === 3,
    perfectLabel: stars === 3 ? strings.perfectShot : null,
    metrics: [
      { label: strings.points, value: formatPoints(score), total: '', sub: recordSub },
      { label: strings.time, value: formatTime(snap.playTime), total: '', sub: '' },
      { label: strings.turns, value: pad2(shots), total: ` / ${pad2(max)}`, sub: strings.margin.replace('{n}', max - shots) },
    ],
    notice: hasNext ? null : strings.lastLevel,
    buttons,
    primaryAction: hasNext ? 'NEXT' : 'RESTART',
  };
}

// MODO DE DISPARO selector (HU-11). The test-only 'turn' mode shows no option active.
function modeModel(snap) {
  const current = MODES.includes(snap.fireMode) ? snap.fireMode : null;
  const left = snap.volley.size - snap.volley.emitted;
  return {
    label: strings.fireMode,
    key: 'M',
    caption: strings.fireModeCaption,
    current,
    enabled: snap.state === 'Aiming' && !snap.paused,
    limited: current !== null && left < current,
    options: MODES.map((v) => ({ v, label: String(v), dots: v, active: v === current })),
  };
}

export function hudModel(snap, { levelCount = 6 } = {}) {
  const { shots, volley, paused } = snap;
  const stage = pad2(snap.level.index + 1);
  const playing = PLAYING.includes(snap.state);
  const speedOn = RUNNING.includes(snap.state) && !paused;
  return {
    telemetry: {
      title: strings.telemetry,
      status: status(snap),
      stageLabel: strings.stage,
      stage,
      puzzle: `${strings.puzzle} ${stage} / ${pad2(levelCount)}`,
      balls: {
        mode: volley.size <= MAX_PIPS ? 'pips' : 'number',
        left: pad2(volley.size - volley.emitted), // balls of the turn not fired yet (HU-11)
        size: pad2(volley.size),
        pips: { flying: volley.active, used: volley.emitted - volley.active, available: volley.size - volley.emitted },
      },
      turns: {
        left: pad2(shots.left),
        max: pad2(shots.max),
        tone: turnsTone(shots.left),
        segments: { filled: shots.left, total: shots.max },
        caption: strings.turnsCaption.replace('{n}', shots.max),
      },
      points: formatPoints(snap.score),
      time: formatTime(snap.playTime),
    },
    control: {
      title: strings.control,
      launch: { label: strings.launch, key: 'Space', enabled: snap.state === 'Aiming' && !paused },
      pause: { label: paused ? strings.resume : strings.pauseButton, key: 'P', active: paused, enabled: playing },
      restart: { label: strings.restart, key: 'R', enabled: true },
      // HU-12: next level without classifying; none after the last level, and Victory offers Siguiente nivel.
      skip: { label: strings.skipLevel, key: 'N', enabled: SKIPPABLE.includes(snap.state) && snap.level.index + 1 < levelCount },
      speed: {
        label: strings.speed,
        current: `×${snap.speed}`,
        options: SPEEDS.map((v) => ({ label: `${v}X`, key: String(v), v, active: snap.speed === v, enabled: speedOn })),
      },
      mode: modeModel(snap),
      shortcuts: strings.shortcutList,
    },
    pause: { visible: paused, label: strings.pause, key: 'P' },
  };
}
