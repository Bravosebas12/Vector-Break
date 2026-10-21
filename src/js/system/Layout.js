// Board B1 layout and shared gameplay constants (board coordinates, y grows downward).
// Grid top = y 0 = ceiling; side walls coincide with the grid edges (design D7).

export const BOARD_W = 1080;
export const BOARD_H = 1000;

export const COLS = 9;
export const ROWS = 12;
export const CELL_W = 112;
export const CELL_H = 56;
export const GRID_X = 36;
export const GRID_W = COLS * CELL_W; // 1008
export const GRID_H = ROWS * CELL_H; // 672

export const WALL_LEFT = GRID_X; // 36
export const WALL_RIGHT = GRID_X + GRID_W; // 1044
export const CEILING_Y = 0;
export const FLOOR_Y = 956; // launch line: a ball lands when its centre crosses it moving down

export const BALL_RADIUS = 14;
export const BALL_SPEED = 1200; // px/s at 1X
export const MAX_VOLLEY = 50; // v1 cap, also the ball pool size
export const MIN_DIR_Y = 0.05; // |dir.y| floor: no perfectly horizontal infinite loops

export const STEP = 1 / 120; // fixed timestep, seconds
export const MAX_SUBSTEPS = 64;
export const EMIT_INTERVAL = 1 / 12; // seconds of simTime between emitted balls

export const LAUNCHER_Y = FLOOR_Y;
export const LAUNCHER_MIN_X = WALL_LEFT + BALL_RADIUS; // 50
export const LAUNCHER_MAX_X = WALL_RIGHT - BALL_RADIUS; // 1030

export function cellMinX(col) {
  return GRID_X + CELL_W * col;
}

export function cellMaxX(col) {
  return GRID_X + CELL_W * (col + 1);
}

export function cellMinY(row) {
  return CELL_H * row;
}

export function cellMaxY(row) {
  return CELL_H * (row + 1);
}

// Level files store launcher.x normalized by BOARD_W.
export function isLauncherXValid(normalizedX) {
  const x = normalizedX * BOARD_W;
  return x >= LAUNCHER_MIN_X - 1e-9 && x <= LAUNCHER_MAX_X + 1e-9;
}

export function clampLauncherX(x) {
  return Math.min(LAUNCHER_MAX_X, Math.max(LAUNCHER_MIN_X, x));
}
