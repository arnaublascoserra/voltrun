/**
 * Game balance that does NOT change with the level.
 * Per-level values (speeds, AI, power duration…) are in `difficulty.ts`.
 *
 * Speeds are expressed in tiles per second, times in seconds.
 */
export const BALANCE = {
  lives: {
    start: 3,
    max: 6,
    /** An extra life is awarded every N points. 0 disables it. */
    extraLifeEvery: 10_000,
  },

  score: {
    shard: 10,
    core: 50,
    prism: 100,
    /** Points for catching enemies during one power-up: 1st, 2nd, 3rd, 4th… */
    enemyCombo: [300, 600, 1200, 2400],
    /** Extra bonus for catching all enemies during a single power-up. */
    allEnemiesBonus: 3000,
    /** Shards are worth this many times more while the power-up is active. */
    poweredShardMultiplier: 2,
    levelClearBase: 1000,
    levelClearPerLevel: 250,
    /** Bonus per life remaining when a level is cleared. */
    levelClearPerLife: 200,
  },

  player: {
    /** How long a pressed direction is remembered while waiting for a valid turn. */
    inputBufferSec: 0.3,
    /**
     * If a turn is requested up to this far (in tiles) past a junction centre,
     * the player snaps back and takes the turn — forgiving late presses.
     */
    lateTurnWindow: 0.22,
    /** Distance (in tiles) under which player and enemy collide. */
    collisionRadius: 0.6,
  },

  enemy: {
    count: 4,
    vulnerableSpeedFactor: 0.55,
    tunnelSpeedFactor: 0.5,
    leavingSpeedFactor: 0.6,
    returningSpeed: 15,
    /** Time spent at home after being caught before leaving again. */
    respawnDelay: 1.2,
    /** Last seconds of the power-up during which vulnerable enemies flash. */
    flashWarningSec: 2,
    flashIntervalSec: 0.18,
  },

  timing: {
    readySec: 2.2,
    readyAfterDeathSec: 1.4,
    deathSec: 1.7,
    levelClearSec: 2.6,
    /** Hit-stop when an enemy is caught. */
    enemyCaughtFreezeSec: 0.35,
  },

  /** Clearing this level wins the game. */
  maxLevel: 12,
} as const;

export type Balance = typeof BALANCE;
