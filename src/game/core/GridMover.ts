import type { Grid } from './Grid';
import { DIR_VECTORS, opposite } from './direction';
import type { Dir, TilePos } from './types';

const EPSILON = 1e-6;
/** Upper bound of tile centres crossed in one step (protects against runaway loops). */
const MAX_CENTRES_PER_STEP = 64;

/**
 * Tile-based movement state. The mover sits on `tile` and has travelled
 * `progress` (0..1) towards the neighbouring tile in `dir`. `progress === 0`
 * means it is exactly on the tile centre, which is the only place where it
 * may turn. This keeps entities perfectly aligned to corridors.
 *
 * `dir` doubles as the facing direction, so it is kept when the mover stops.
 */
export interface MoverState {
  tile: TilePos;
  dir: Dir;
  progress: number;
  moving: boolean;
}

export interface MoverHooks {
  /** Called on every tile centre. Return the direction to take next or 'none' to stop. */
  decide(tile: TilePos, current: Dir): Dir;
  /** Whether the mover may enter the neighbour of `tile` in `dir`. */
  canMove(tile: TilePos, dir: Dir): boolean;
  /** Called whenever a new tile centre is reached. */
  onArrive?(tile: TilePos): void;
}

export function createMover(tile: TilePos, dir: Dir = 'none'): MoverState {
  return { tile: { ...tile }, dir, progress: 0, moving: false };
}

/**
 * Advances the mover `distance` tiles. Handles crossing several tile centres
 * in one call, so it stays correct at any speed / frame rate.
 */
export function advance(state: MoverState, distance: number, grid: Grid, hooks: MoverHooks): void {
  let remaining = distance;
  for (let guard = 0; guard < MAX_CENTRES_PER_STEP && remaining > EPSILON; guard++) {
    if (state.progress <= EPSILON) {
      state.progress = 0;
      const next = hooks.decide(state.tile, state.dir);
      if (next === 'none' || !hooks.canMove(state.tile, next)) {
        // Blocked: stay on the centre, keep (or adopt) a facing direction.
        if (state.dir === 'none' && next !== 'none') state.dir = next;
        state.moving = false;
        return;
      }
      state.dir = next;
      state.moving = true;
    }

    const toCentre = 1 - state.progress;
    if (remaining < toCentre) {
      state.progress += remaining;
      return;
    }
    remaining -= toCentre;
    grid.neighbor(state.tile, state.dir, state.tile);
    state.progress = 0;
    hooks.onArrive?.(state.tile);
  }
}

/** Turns around mid-corridor (allowed between tile centres). */
export function reverse(state: MoverState, grid: Grid): void {
  if (state.dir === 'none') return;
  if (state.progress > EPSILON) {
    grid.neighbor(state.tile, state.dir, state.tile);
    state.progress = 1 - state.progress;
  }
  state.dir = opposite(state.dir);
}

/** Continuous position in tile units (tile centres are integers). */
export function moverPosition(state: MoverState, out: { x: number; y: number } = { x: 0, y: 0 }) {
  const v = DIR_VECTORS[state.dir];
  out.x = state.tile.x + v.x * state.progress;
  out.y = state.tile.y + v.y * state.progress;
  return out;
}
