// DOM-free HUD projection (D3): pure functions from session snapshot to draw-ready models.
import { strings } from './strings.js';

export const MAX_PIPS = 12;
export const SPEEDS = Object.freeze([1, 2, 4]);
export const TURN_COLORS = Object.freeze({ white: '#FFFFFF', amber: '#FFC857', magenta: '#F72585' });

const pad2 = (n) => String(n).padStart(2, '0');

export function turnsColor(left) {
  if (left <= 1) return TURN_COLORS.magenta;
  if (left <= 3) return TURN_COLORS.amber;
  return TURN_COLORS.white;
}

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
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
  const { shots, volley } = snap;
  const stage = pad2(snap.level.index + 1);
  return {
    telemetry: {
      title: strings.telemetry,
      stageLabel: strings.stage,
      stage,
      puzzle: `${stage}/${pad2(levelCount)}`,
      balls: {
        mode: volley.size <= MAX_PIPS ? 'pips' : 'number',
        count: volley.size,
        active: volley.active,
      },
      turns: { left: shots.left, max: shots.max, color: turnsColor(shots.left) },
      points: snap.score,
      time: formatTime(snap.playTime),
    },
    control: {
      title: strings.control,
      launch: { label: strings.launch, key: 'Space', enabled: snap.state === 'Aiming' && !snap.paused },
      speed: {
        label: strings.speed,
        current: `${snap.speed}X`,
        options: SPEEDS.map((v) => ({ label: `${v}X`, key: String(v), active: snap.speed === v })),
      },
      shortcuts: strings.shortcutList,
    },
    pause: { visible: snap.paused, label: strings.pause },
  };
}
