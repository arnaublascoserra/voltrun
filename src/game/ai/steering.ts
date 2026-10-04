import type { Grid } from '../core/Grid';
import { MOVE_DIRS, opposite } from '../core/direction';
import type { Dir, MoveDir, TilePos } from '../core/types';
import { distSq } from '../utils/math';
import type { SeededRandom } from '../utils/random';

export type SteerMode = 'seek' | 'flee' | 'wander';

export interface SteerOptions {
  mode: SteerMode;
  /** Required for 'seek' and 'flee'. */
  target?: TilePos;
  /** Use real path distance (BFS) instead of straight-line distance. */
  smart: boolean;
  allowDoor: boolean;
  /** Enemies normally never turn back on themselves. */
  allowReverse: boolean;
  /** Tiles to steer around when possible (e.g. tiles claimed by other enemies). */
  avoid?: ((x: number, y: number) => boolean) | null;
}

/** Extra cost (in tiles) of moving into a tile flagged by `avoid`. */
export const AVOID_PENALTY_TILES = 3;

const options: MoveDir[] = [];
const probe: TilePos = { x: 0, y: 0 };

/**
 * Picks the direction to take at a tile centre. Ties are broken by the fixed
 * order in MOVE_DIRS so behaviour is deterministic for a given RNG seed.
 */
export function chooseDirection(grid: Grid, tile: TilePos, current: Dir, opts: SteerOptions, rng: SeededRandom): Dir {
  const back = opposite(current);
  options.length = 0;
  for (const d of MOVE_DIRS) {
    if (!opts.allowReverse && d === back) continue;
    if (grid.canMove(tile, d, opts.allowDoor)) options.push(d);
  }
  if (options.length === 0) {
    // Dead end: turning back is the only way out.
    return grid.canMove(tile, back, opts.allowDoor) ? back : 'none';
  }
  if (options.length === 1) return options[0];
  if (opts.mode === 'wander' || !opts.target) return rng.pick(options);

  const field = opts.smart ? grid.distanceField(opts.target, opts.allowDoor) : null;
  const sign = opts.mode === 'flee' ? -1 : 1;
  let best: Dir = options[0];
  let bestScore = Infinity;
  for (const d of options) {
    grid.neighbor(tile, d, probe);
    const raw = field ? field[grid.index(probe.x, probe.y)] : Math.sqrt(distSq(probe.x, probe.y, opts.target.x, opts.target.y));
    const penalty = opts.mode === 'seek' && opts.avoid?.(probe.x, probe.y) ? AVOID_PENALTY_TILES : 0;
    const score = raw * sign + penalty;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
