// Core reachability as a level rule (design "Reachability"): from the launcher, some angle must
// reach a valid entry of each core, or the core itself, with at most one reflection. Static
// geometry only: blockers the ball cannot remove (standard blocks are ignored).
import { Raycaster } from './Raycaster.js';
import { entryCells } from './TrapAnalysis.js';

export const Reachability = {
  sweep: (board, launcher, target, geometry) => Raycaster.sweep(board, launcher, target, geometry),
};

// One CORE_UNREACHABLE error per core with no reaching angle. Run after the trap rules pass.
export function coreReachabilityErrors(board) {
  const errors = [];
  for (const core of board.cores) {
    const target = [{ col: core.col, row: core.row }, ...entryCells(board, core)];
    if (Reachability.sweep(board, board.launcher, target, 'static').length > 0) continue;
    const message = `CORE_UNREACHABLE at core (${core.col},${core.row})`;
    errors.push({ code: 'CORE_UNREACHABLE', col: core.col, row: core.row, message });
  }
  return errors;
}
