import { chooseDirection } from '../ai/steering';
import type { SteerOptions } from '../ai/steering';
import { chaseTarget, patrolTarget } from '../ai/targeting';
import type { TargetContext } from '../ai/targeting';
import { BALANCE } from '../config/balance';
import type { EnemyMode, LevelParams } from '../config/difficulty';
import type { EnemyProfile } from '../config/enemies';
import type { Grid } from '../core/Grid';
import { advance, createMover, reverse } from '../core/GridMover';
import type { MoverHooks, MoverState } from '../core/GridMover';
import type { Dir, TilePos } from '../core/types';
import type { SeededRandom } from '../utils/random';

/**
 * HOME and LEAVING are internal sub-states of the enemy base; the four
 * gameplay states are PATROL, CHASE, VULNERABLE and RETURNING.
 */
export type EnemyState = 'HOME' | 'LEAVING' | 'PATROL' | 'CHASE' | 'VULNERABLE' | 'RETURNING';

export interface EnemyWorldContext {
  grid: Grid;
  params: LevelParams;
  rng: SeededRandom;
  playerTile: TilePos;
  playerDir: Dir;
  hunterTile: TilePos;
  globalMode: EnemyMode;
  remainingPickups: number;
  /** All enemies, used to keep them from piling up on the same route. */
  enemies: readonly Enemy[];
}

export class Enemy {
  readonly mover: MoverState;
  state: EnemyState = 'HOME';
  /** Seconds left before leaving home. */
  releaseTimer = 0;
  /** Wildcard only: currently chasing (true) or drifting (false). */
  wildcardChasing = true;
  private wildcardTimer = 0;

  private readonly patrolTile: TilePos;
  private readonly hooks: MoverHooks;
  private readonly steer: SteerOptions = { mode: 'seek', smart: false, allowDoor: false, allowReverse: false };
  private readonly targetCtx: TargetContext;
  private readonly probe: TilePos = { x: 0, y: 0 };
  private readonly avoidClaimed = (x: number, y: number): boolean => this.isClaimedByOther(x, y);
  private ctx!: EnemyWorldContext;

  constructor(
    readonly index: number,
    readonly profile: EnemyProfile,
    private readonly grid: Grid,
    readonly homeTile: TilePos,
  ) {
    this.mover = createMover(homeTile);
    this.patrolTile = patrolTarget(grid, profile.patrolCorner);
    this.targetCtx = {
      grid,
      params: undefined as unknown as LevelParams,
      playerTile: homeTile,
      playerDir: 'none',
      hunterTile: homeTile,
      selfTile: this.mover.tile,
    };
    this.hooks = {
      decide: (tile, current) => this.decide(tile, current),
      canMove: (tile, dir) => this.grid.canMove(tile, dir, this.usesDoor),
      onArrive: (tile) => this.onArrive(tile),
    };
  }

  get tile(): TilePos {
    return this.mover.tile;
  }

  /** Touching the player in these states costs a life. */
  get isDangerous(): boolean {
    return this.state === 'PATROL' || this.state === 'CHASE' || this.state === 'LEAVING';
  }

  get isVulnerable(): boolean {
    return this.state === 'VULNERABLE';
  }

  private get usesDoor(): boolean {
    return this.state === 'LEAVING' || this.state === 'RETURNING';
  }

  /** Back to the spawn point, waiting `releaseDelay` seconds before leaving. */
  reset(releaseDelay: number): void {
    this.mover.tile.x = this.homeTile.x;
    this.mover.tile.y = this.homeTile.y;
    this.mover.dir = 'none';
    this.mover.progress = 0;
    this.mover.moving = false;
    this.state = 'HOME';
    this.releaseTimer = releaseDelay;
    this.wildcardChasing = true;
    this.wildcardTimer = 0;
  }

  /** Power-up started. Returns true if the enemy became vulnerable. */
  frighten(): boolean {
    if (this.state === 'PATROL' || this.state === 'CHASE') {
      this.state = 'VULNERABLE';
      reverse(this.mover, this.grid);
      return true;
    }
    // Already vulnerable (a second core was eaten): stay vulnerable.
    return this.state === 'VULNERABLE';
  }

  calm(mode: EnemyMode): void {
    if (this.state === 'VULNERABLE') this.state = mode;
  }

  /** Global PATROL/CHASE switch: enemies turn around to signal it. */
  applyMode(mode: EnemyMode): void {
    if ((this.state === 'PATROL' || this.state === 'CHASE') && this.state !== mode) {
      this.state = mode;
      reverse(this.mover, this.grid);
    }
  }

  catch(): void {
    this.state = 'RETURNING';
  }

  isEnraged(ctx: EnemyWorldContext): boolean {
    return this.profile.personality === 'hunter' && ctx.remainingPickups <= ctx.params.rageRemaining;
  }

  speed(ctx: EnemyWorldContext): number {
    const p = ctx.params;
    const e = BALANCE.enemy;
    let speed: number;
    switch (this.state) {
      case 'HOME':
        return 0;
      case 'LEAVING':
        speed = p.enemySpeed * e.leavingSpeedFactor;
        break;
      case 'RETURNING':
        return e.returningSpeed;
      case 'VULNERABLE':
        speed = p.enemySpeed * e.vulnerableSpeedFactor;
        break;
      default:
        speed = p.enemySpeed * this.profile.speedFactor * (this.isEnraged(ctx) ? 1 + p.rageSpeedBonus : 1);
    }
    if (this.grid.isTunnel(this.mover.tile.x, this.mover.tile.y)) speed *= e.tunnelSpeedFactor;
    return speed;
  }

  update(dt: number, ctx: EnemyWorldContext): void {
    this.ctx = ctx;
    if (this.state === 'HOME') {
      this.releaseTimer -= dt;
      if (this.releaseTimer <= 0) this.state = 'LEAVING';
      return;
    }
    if (this.profile.personality === 'wildcard') this.updateWildcard(dt, ctx);
    advance(this.mover, this.speed(ctx) * dt, this.grid, this.hooks);
  }

  private updateWildcard(dt: number, ctx: EnemyWorldContext): void {
    this.wildcardTimer -= dt;
    if (this.wildcardTimer > 0) return;
    this.wildcardChasing = ctx.rng.chance(ctx.params.wildcardChaseShare);
    // Randomised phase length so the pattern cannot be memorised.
    this.wildcardTimer = ctx.params.wildcardCycleSec * (0.5 + ctx.rng.next());
  }

  /** True if another active enemy stands on, or is heading into, tile (x, y). */
  private isClaimedByOther(x: number, y: number): boolean {
    for (const other of this.ctx.enemies) {
      if (other === this || other.state === 'HOME' || other.state === 'RETURNING') continue;
      const t = other.mover.tile;
      if (t.x === x && t.y === y) return true;
      if (other.mover.progress > 0) {
        this.grid.neighbor(t, other.mover.dir, this.probe);
        if (this.probe.x === x && this.probe.y === y) return true;
      }
    }
    return false;
  }

  private onArrive(tile: TilePos): void {
    if (this.state === 'LEAVING' && tile.x === this.grid.map.penExit.x && tile.y === this.grid.map.penExit.y) {
      this.state = this.ctx.globalMode;
    } else if (this.state === 'RETURNING' && tile.x === this.homeTile.x && tile.y === this.homeTile.y) {
      this.state = 'HOME';
      this.releaseTimer = BALANCE.enemy.respawnDelay;
      this.mover.dir = 'none';
      this.mover.moving = false;
    }
  }

  private decide(tile: TilePos, current: Dir): Dir {
    const ctx = this.ctx;
    const s = this.steer;
    s.allowDoor = this.usesDoor;
    s.allowReverse = this.usesDoor;
    s.smart = ctx.rng.chance(ctx.params.smartness);
    s.mode = 'seek';
    s.avoid = this.state === 'PATROL' || this.state === 'CHASE' ? this.avoidClaimed : null;

    switch (this.state) {
      case 'HOME':
        return 'none';
      case 'LEAVING':
        s.smart = true;
        s.target = this.grid.map.penExit;
        break;
      case 'RETURNING':
        s.smart = true;
        s.target = this.homeTile;
        break;
      case 'VULNERABLE':
        if (ctx.rng.chance(ctx.params.vulnerableFleeChance)) {
          s.mode = 'flee';
          s.smart = true;
          s.target = ctx.playerTile;
        } else {
          s.mode = 'wander';
        }
        break;
      case 'PATROL':
        if (this.isEnraged(ctx)) {
          s.target = ctx.playerTile;
        } else {
          s.target = this.patrolTile;
        }
        break;
      case 'CHASE':
        if (this.profile.personality === 'wildcard' && !this.wildcardChasing) {
          s.mode = 'wander';
          break;
        }
        this.targetCtx.params = ctx.params;
        this.targetCtx.playerTile = ctx.playerTile;
        this.targetCtx.playerDir = ctx.playerDir;
        this.targetCtx.hunterTile = ctx.hunterTile;
        s.target = chaseTarget(this.profile.personality, this.targetCtx);
        break;
    }
    return chooseDirection(this.grid, tile, current, s, ctx.rng);
  }
}
