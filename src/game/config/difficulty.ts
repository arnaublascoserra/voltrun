import type { MapId } from '../maps';

/**
 * Per-level difficulty. Every value ramps linearly from `from` (level 1) to
 * `to` (level `RAMP_LEVELS`) and then stays there. Tweak these numbers to
 * rebalance the game — nothing else needs to change.
 */
export const RAMP_LEVELS = 10;

interface Ramp {
  from: number;
  to: number;
}

export const DIFFICULTY_CURVE = {
  /** Tiles per second. */
  playerSpeed: { from: 7.4, to: 8.4 },
  enemySpeed: { from: 6.4, to: 8.3 },
  /** Power-up duration in seconds. */
  powerDuration: { from: 8, to: 2.5 },
  /**
   * 0..1 — probability that an enemy evaluates a junction with real path
   * distance (BFS) instead of straight-line distance. Higher = smarter routes.
   */
  smartness: { from: 0.15, to: 0.95 },
  /** How many tiles ahead of the player the Interceptor aims. */
  interceptLookahead: { from: 3, to: 6 },
  /** Radius (tiles) in which the Strategist searches junctions to cut off. */
  strategistRadius: { from: 5, to: 9 },
  /** Fraction of time the Wildcard actually chases (rest is erratic roaming). */
  wildcardChaseShare: { from: 0.35, to: 0.8 },
  wildcardCycleSec: { from: 6, to: 4 },
  /** Probability a vulnerable enemy flees intelligently instead of wandering. */
  vulnerableFleeChance: { from: 0.1, to: 0.75 },
  /** Seconds of PATROL per wave (enemies retreat to their corners). */
  patrolSec: { from: 7, to: 2.5 },
  /** Seconds of CHASE per wave. */
  chaseSec: { from: 18, to: 32 },
  /** Delay before each enemy leaves home, scaled by its index (0,1,2,3). */
  releaseStepSec: { from: 3.5, to: 0.9 },
  /** The Hunter enrages when this many pickups (or fewer) remain. */
  rageRemaining: { from: 12, to: 40 },
  rageSpeedBonus: { from: 0.05, to: 0.14 },
} satisfies Record<string, Ramp>;

/** Number of PATROL/CHASE waves before enemies chase permanently. */
export const MODE_WAVES = 3;

/**
 * Which map each level uses. After the list ends the game cycles through
 * `MAP_CYCLE` with the (now maxed) difficulty curve.
 */
export const MAP_PROGRESSION: readonly MapId[] = ['circuit', 'circuit', 'foundry', 'foundry', 'labyrinth', 'labyrinth'];
export const MAP_CYCLE: readonly MapId[] = ['circuit', 'foundry', 'labyrinth'];

export type EnemyMode = 'PATROL' | 'CHASE';

export interface ModePhase {
  mode: EnemyMode;
  /** Seconds; `Infinity` for the final phase. */
  duration: number;
}

export interface LevelParams {
  level: number;
  mapId: MapId;
  playerSpeed: number;
  enemySpeed: number;
  powerDuration: number;
  smartness: number;
  interceptLookahead: number;
  strategistRadius: number;
  wildcardChaseShare: number;
  wildcardCycleSec: number;
  vulnerableFleeChance: number;
  modeSchedule: ModePhase[];
  releaseDelays: number[];
  rageRemaining: number;
  rageSpeedBonus: number;
}

function ramp(r: Ramp, t: number): number {
  return r.from + (r.to - r.from) * t;
}

export function mapForLevel(level: number): MapId {
  if (level <= MAP_PROGRESSION.length) return MAP_PROGRESSION[level - 1];
  return MAP_CYCLE[(level - MAP_PROGRESSION.length - 1) % MAP_CYCLE.length];
}

export function getLevelParams(level: number, enemyCount = 4): LevelParams {
  const lvl = Math.max(1, Math.floor(level));
  const t = Math.min(1, (lvl - 1) / (RAMP_LEVELS - 1));
  const c = DIFFICULTY_CURVE;

  const patrol = ramp(c.patrolSec, t);
  const chase = ramp(c.chaseSec, t);
  const modeSchedule: ModePhase[] = [];
  for (let i = 0; i < MODE_WAVES; i++) {
    modeSchedule.push({ mode: 'PATROL', duration: patrol });
    modeSchedule.push({ mode: 'CHASE', duration: chase });
  }
  modeSchedule[modeSchedule.length - 1] = { mode: 'CHASE', duration: Infinity };

  const step = ramp(c.releaseStepSec, t);
  const releaseDelays = Array.from({ length: enemyCount }, (_, i) => i * step);

  return {
    level: lvl,
    mapId: mapForLevel(lvl),
    playerSpeed: ramp(c.playerSpeed, t),
    enemySpeed: ramp(c.enemySpeed, t),
    powerDuration: ramp(c.powerDuration, t),
    smartness: ramp(c.smartness, t),
    interceptLookahead: Math.round(ramp(c.interceptLookahead, t)),
    strategistRadius: Math.round(ramp(c.strategistRadius, t)),
    wildcardChaseShare: ramp(c.wildcardChaseShare, t),
    wildcardCycleSec: ramp(c.wildcardCycleSec, t),
    vulnerableFleeChance: ramp(c.vulnerableFleeChance, t),
    modeSchedule,
    releaseDelays,
    rageRemaining: Math.round(ramp(c.rageRemaining, t)),
    rageSpeedBonus: ramp(c.rageSpeedBonus, t),
  };
}
