import { BALANCE } from '../config/balance';
import type { EnemyMode, LevelParams } from '../config/difficulty';
import { ENEMY_PROFILES } from '../config/enemies';
import { Grid } from '../core/Grid';
import { moverPosition } from '../core/GridMover';
import type { PickupKind, TilePos } from '../core/types';
import { Enemy } from '../entities/Enemy';
import type { EnemyWorldContext } from '../entities/Enemy';
import { Player } from '../entities/Player';
import type { ParsedMap } from '../maps/types';
import { wrappedDx } from '../utils/math';
import type { SeededRandom } from '../utils/random';

export type WorldEvent =
  | { type: 'pickup'; kind: PickupKind; x: number; y: number; points: number }
  | { type: 'powerStart'; duration: number }
  | { type: 'powerEnd' }
  | { type: 'enemyCaught'; enemyIndex: number; x: number; y: number; points: number; combo: number }
  | { type: 'allEnemiesCaught'; points: number }
  | { type: 'playerCaught'; enemyIndex: number }
  | { type: 'modeChange'; mode: EnemyMode }
  | { type: 'cleared' };

const PICKUP_NONE = 0;
const PICKUP_CODES: Record<PickupKind, number> = { shard: 1, core: 2, prism: 3 };
const PICKUP_KINDS: readonly (PickupKind | null)[] = [null, 'shard', 'core', 'prism'];

/**
 * Pure simulation of one level: movement, pickups, power-ups, AI and
 * collisions. It knows nothing about Phaser — the scene reads its state and
 * consumes `events` to drive visuals and audio. This makes the rules fully
 * unit-testable.
 */
export class GameWorld {
  readonly grid: Grid;
  readonly player: Player;
  readonly enemies: Enemy[];
  /** Pickup code per tile (0 = none). */
  readonly pickups: Uint8Array;
  readonly totalPickups: number;
  remaining: number;

  powerTimer = 0;
  private comboIndex = 0;
  private frightenedCount = 0;
  private caughtThisPower = 0;
  private freezeTimer = 0;
  private modeIndex = 0;
  private modeTimer = 0;
  /** Set when the player is caught or the level is cleared; the scene resumes it. */
  halted = false;

  private readonly events: WorldEvent[] = [];
  private readonly ctx: EnemyWorldContext;
  private readonly posA = { x: 0, y: 0 };
  private readonly posB = { x: 0, y: 0 };
  private readonly onPlayerArrive = (tile: TilePos): void => this.collect(tile);

  constructor(
    map: ParsedMap,
    readonly params: LevelParams,
    rng: SeededRandom,
  ) {
    this.grid = new Grid(map);
    this.player = new Player(this.grid, map.playerSpawn);
    this.enemies = map.enemySpawns.map((spawn, i) => new Enemy(i, ENEMY_PROFILES[i % ENEMY_PROFILES.length], this.grid, spawn));

    this.pickups = new Uint8Array(map.cols * map.rows);
    for (const p of map.pickups) this.pickups[p.y * map.cols + p.x] = PICKUP_CODES[p.kind];
    this.totalPickups = map.pickups.length;
    this.remaining = this.totalPickups;

    this.ctx = {
      grid: this.grid,
      params,
      rng,
      playerTile: this.player.tile,
      playerDir: 'none',
      hunterTile: this.enemies[0].tile,
      globalMode: params.modeSchedule[0].mode,
      remainingPickups: this.remaining,
      enemies: this.enemies,
    };
    this.resetActors();
  }

  get globalMode(): EnemyMode {
    return this.params.modeSchedule[this.modeIndex].mode;
  }

  get powerActive(): boolean {
    return this.powerTimer > 0;
  }

  get isFrozen(): boolean {
    return this.freezeTimer > 0;
  }

  pickupAt(x: number, y: number): PickupKind | null {
    return PICKUP_KINDS[this.pickups[y * this.grid.cols + x]];
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): WorldEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  /** Puts player and enemies back at their spawns (start of level / after a death). */
  resetActors(): void {
    this.player.reset(this.grid.map.playerSpawn);
    this.enemies.forEach((e, i) => e.reset(this.params.releaseDelays[i] ?? 0));
    this.powerTimer = 0;
    this.freezeTimer = 0;
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.halted = false;
  }

  update(dt: number): void {
    if (this.halted) return;
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    this.updatePower(dt);
    if (!this.powerActive) this.updateMode(dt);

    this.player.update(dt, this.params.playerSpeed, this.onPlayerArrive);
    if (this.halted) return; // level cleared by the last pickup

    const ctx = this.ctx;
    ctx.playerTile = this.player.tile;
    ctx.playerDir = this.player.facing;
    ctx.hunterTile = this.enemies[0].tile;
    ctx.globalMode = this.globalMode;
    ctx.remainingPickups = this.remaining;
    for (const enemy of this.enemies) enemy.update(dt, ctx);

    this.checkCollisions();
  }

  private updatePower(dt: number): void {
    if (this.powerTimer <= 0) return;
    this.powerTimer -= dt;
    if (this.powerTimer > 0) return;
    this.powerTimer = 0;
    for (const e of this.enemies) e.calm(this.globalMode);
    this.events.push({ type: 'powerEnd' });
  }

  private updateMode(dt: number): void {
    const phase = this.params.modeSchedule[this.modeIndex];
    if (!Number.isFinite(phase.duration)) return;
    this.modeTimer += dt;
    if (this.modeTimer < phase.duration) return;
    this.modeTimer -= phase.duration;
    this.modeIndex = Math.min(this.modeIndex + 1, this.params.modeSchedule.length - 1);
    const mode = this.globalMode;
    for (const e of this.enemies) e.applyMode(mode);
    this.events.push({ type: 'modeChange', mode });
  }

  private collect(tile: TilePos): void {
    const idx = tile.y * this.grid.cols + tile.x;
    const code = this.pickups[idx];
    if (code === PICKUP_NONE) return;
    this.pickups[idx] = PICKUP_NONE;
    this.remaining--;
    const kind = PICKUP_KINDS[code] as PickupKind;
    const s = BALANCE.score;

    let points: number;
    if (kind === 'shard') points = s.shard * (this.powerActive ? s.poweredShardMultiplier : 1);
    else if (kind === 'core') points = s.core;
    else points = s.prism;
    this.events.push({ type: 'pickup', kind, x: tile.x, y: tile.y, points });

    if (kind === 'core') this.startPower();

    if (this.remaining === 0) {
      this.halted = true;
      this.events.push({ type: 'cleared' });
    }
  }

  private startPower(): void {
    this.powerTimer = this.params.powerDuration;
    this.comboIndex = 0;
    this.caughtThisPower = 0;
    this.frightenedCount = 0;
    for (const e of this.enemies) if (e.frighten()) this.frightenedCount++;
    this.events.push({ type: 'powerStart', duration: this.params.powerDuration });
  }

  private checkCollisions(): void {
    const p = moverPosition(this.player.mover, this.posA);
    const r2 = BALANCE.player.collisionRadius ** 2;
    for (const enemy of this.enemies) {
      if (!enemy.isDangerous && !enemy.isVulnerable) continue;
      const e = moverPosition(enemy.mover, this.posB);
      const dx = wrappedDx(p.x, e.x, this.grid.cols);
      const dy = p.y - e.y;
      if (dx * dx + dy * dy > r2) continue;

      if (enemy.isVulnerable) {
        this.catchEnemy(enemy, e.x, e.y);
      } else {
        this.halted = true;
        this.events.push({ type: 'playerCaught', enemyIndex: enemy.index });
        return;
      }
    }
  }

  private catchEnemy(enemy: Enemy, x: number, y: number): void {
    const table = BALANCE.score.enemyCombo;
    const points = table[Math.min(this.comboIndex, table.length - 1)];
    this.comboIndex++;
    this.caughtThisPower++;
    enemy.catch();
    this.freezeTimer = BALANCE.timing.enemyCaughtFreezeSec;
    this.events.push({ type: 'enemyCaught', enemyIndex: enemy.index, x, y, points, combo: this.comboIndex });
    if (this.caughtThisPower === this.enemies.length && this.frightenedCount === this.enemies.length) {
      this.events.push({ type: 'allEnemiesCaught', points: BALANCE.score.allEnemiesBonus });
    }
  }
}
