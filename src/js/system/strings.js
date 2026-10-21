// Centralized UI copy (neutral Spanish, P2/E9). No other module hardcodes visible text.
export const strings = Object.freeze({
  title: 'AngleCraft',
  loading: 'Cargando... {pct}%',
  clickToStart: 'Haz clic para comenzar',
  loadError: 'No se pudieron cargar los niveles',

  telemetry: 'TELEMETRÍA',
  stage: 'STAGE',
  puzzle: 'PUZZLE',
  balls: 'BOLAS',
  turns: 'TURNOS',
  points: 'PUNTOS',
  time: 'TIEMPO',

  control: 'CONTROL',
  launch: 'LANZAR',
  speed: 'VELOCIDAD',
  shortcuts: 'ATAJOS',
  pause: 'PAUSA',

  // v1 controls only: no right-click cancel and no Esc.
  shortcutList: Object.freeze([
    { keys: 'Mouse', action: 'Apuntar' },
    { keys: 'Clic / Espacio', action: 'Lanzar' },
    { keys: '1 / 2 / 4', action: 'Velocidad' },
    { keys: 'P', action: 'Pausa' },
    { keys: 'R', action: 'Reiniciar' },
  ]),

  solved: 'RESUELTO',
  failed: 'FALLIDO',
  perfectShot: 'TIRO PERFECTO',
  record: 'Récord',
  retry: 'Repetir',
  restart: 'Reiniciar',
  restartPuzzle: 'Reiniciar puzzle [R]',
  nextLevel: 'Siguiente nivel',
  lastLevel: 'Último nivel completado',
});
