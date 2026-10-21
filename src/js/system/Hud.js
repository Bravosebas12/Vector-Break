// DOM-free HUD projection (D3): pure functions from session snapshot to view models (HudDom renders them).
// Colors are tones ('strong' | 'cyan' | 'amber' | 'magenta'); the view maps them to Theme tokens.
import { strings } from './strings.js';

export const MAX_PIPS = 12;
export const SPEEDS = Object.freeze([1, 2, 4]);
const PLAYING = ['Aiming', 'Firing', 'Simulating', 'Resolving'];
const RUNNING = ['Firing', 'Simulating'];

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

// Result modal for Victory/GameOver; `record` is the best stored record (Progression, 7b) or null.
export function modalModel(snap, { levelCount = 6, record = null } = {}) {
  const won = snap.state === 'Victory';
  if (!won && snap.state !== 'GameOver') return null;
  const { stars, score } = snap.result;
  if (!won) {
    const buttons = [{ label: strings.restartPuzzle, action: 'RESTART', primary: true }];
    return { kind: 'defeat', title: strings.failed, points: score, buttons, primaryAction: 'RESTART' };
  }
  const hasNext = snap.level.index + 1 < levelCount;
  const buttons = [
    { label: strings.retry, action: 'RESTART', primary: !hasNext },
    { label: strings.restart, action: 'RESTART', primary: false },
  ];
  if (hasNext) buttons.push({ label: strings.nextLevel, action: 'NEXT', primary: true });
  return {
    kind: 'victory',
    title: strings.solved,
    points: score,
    stars,
    perfect: stars === 3,
    perfectLabel: stars === 3 ? strings.perfectShot : null,
    record,
    notice: hasNext ? null : strings.lastLevel,
    buttons,
    primaryAction: hasNext ? 'NEXT' : 'RESTART',
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
        active: pad2(volley.active),
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
      speed: {
        label: strings.speed,
        current: `×${snap.speed}`,
        options: SPEEDS.map((v) => ({ label: `${v}X`, key: String(v), v, active: snap.speed === v, enabled: speedOn })),
      },
      shortcuts: strings.shortcutList,
    },
    pause: { visible: paused, label: strings.pause, key: 'P' },
  };
}
