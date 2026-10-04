import { BALANCE } from '../config/balance';
import type { Grid } from '../core/Grid';
import { advance, createMover, reverse } from '../core/GridMover';
import type { MoverHooks, MoverState } from '../core/GridMover';
import { opposite } from '../core/direction';
import type { Dir, MoveDir, TilePos } from '../core/types';

/**
 * Player logic (no rendering). Movement is grid-based with an input buffer:
 * a requested direction is remembered for `inputBufferSec` and applied at
 * the first tile centre where it is possible.
 */
export class Player {
  readonly mover: MoverState;
  private bufferedDir: Dir = 'none';
  private bufferTime = 0;
  private arriveHandler: ((tile: TilePos) => void) | undefined;
  private readonly hooks: MoverHooks;

  constructor(
    private readonly grid: Grid,
    private spawn: TilePos,
  ) {
    this.mover = createMover(spawn);
    this.hooks = {
      decide: (tile, current) => this.decide(tile, current),
      canMove: (tile, dir) => this.grid.canMove(tile, dir, false),
      onArrive: (tile) => this.arriveHandler?.(tile),
    };
  }

  get tile(): TilePos {
    return this.mover.tile;
  }

  get facing(): Dir {
    return this.mover.dir;
  }

  reset(spawn: TilePos = this.spawn): void {
    this.spawn = spawn;
    this.mover.tile.x = spawn.x;
    this.mover.tile.y = spawn.y;
    this.mover.dir = 'none';
    this.mover.progress = 0;
    this.mover.moving = false;
    this.bufferedDir = 'none';
    this.bufferTime = 0;
  }

  /** Register a direction request (keyboard, swipe…). */
  requestDirection(dir: MoveDir): void {
    this.bufferedDir = dir;
    this.bufferTime = BALANCE.player.inputBufferSec;

    const m = this.mover;
    if (!m.moving || m.progress === 0) return;

    // Instant reversal in the middle of a corridor.
    if (dir === opposite(m.dir)) {
      reverse(m, this.grid);
      this.bufferedDir = 'none';
      return;
    }

    // Late turn: just passed a junction centre → snap back and turn there.
    if (dir !== m.dir && m.progress <= BALANCE.player.lateTurnWindow && this.grid.canMove(m.tile, dir, false)) {
      m.progress = 0;
    }
  }

  update(dt: number, speed: number, onArrive: (tile: TilePos) => void): void {
    if (this.bufferTime > 0) {
      this.bufferTime -= dt;
      if (this.bufferTime <= 0) this.bufferedDir = 'none';
    }
    this.arriveHandler = onArrive;
    advance(this.mover, speed * dt, this.grid, this.hooks);
  }

  private decide(tile: TilePos, current: Dir): Dir {
    if (this.bufferedDir !== 'none' && this.grid.canMove(tile, this.bufferedDir, false)) {
      const dir = this.bufferedDir;
      this.bufferedDir = 'none';
      return dir;
    }
    if (current !== 'none' && this.grid.canMove(tile, current, false)) return current;
    return 'none';
  }
}
