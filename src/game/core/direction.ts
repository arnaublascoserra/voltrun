import type { Dir, MoveDir, TilePos } from './types';

/** Fixed order also used as the tie-breaker when two moves score the same. */
export const MOVE_DIRS: readonly MoveDir[] = ['up', 'left', 'down', 'right'];

export const DIR_VECTORS: Readonly<Record<Dir, Readonly<TilePos>>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
};

export function opposite(dir: Dir): Dir {
  return OPPOSITE[dir];
}

/** Rotation in radians for a sprite that faces right by default. */
export function dirAngle(dir: Dir): number {
  switch (dir) {
    case 'up':
      return -Math.PI / 2;
    case 'down':
      return Math.PI / 2;
    case 'left':
      return Math.PI;
    default:
      return 0;
  }
}
