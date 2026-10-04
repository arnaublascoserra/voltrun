import type { LevelParams } from '../config/difficulty';
import type { Personality } from '../config/enemies';
import type { Grid } from '../core/Grid';
import { DIR_VECTORS } from '../core/direction';
import type { Dir, TilePos } from '../core/types';

export interface TargetContext {
  grid: Grid;
  params: LevelParams;
  playerTile: TilePos;
  playerDir: Dir;
  /** Position of the Hunter, used by the Strategist to build pincers. */
  hunterTile: TilePos;
  selfTile: TilePos;
}

/** Strategist: how many tiles ahead of the player it predicts. */
const STRATEGIST_LOOKAHEAD = 2;
/** Strategist: below this distance (tiles) it stops scheming and charges. */
const STRATEGIST_CHARGE_DISTANCE = 3;
/** Strategist: how strongly it prefers junctions away from the Hunter. */
const STRATEGIST_PINCER_WEIGHT = 0.75;

export function projectAhead(ctx: TargetContext, tiles: number): TilePos {
  const v = DIR_VECTORS[ctx.playerDir];
  return ctx.grid.nearestWalkable(ctx.playerTile.x + v.x * tiles, ctx.playerTile.y + v.y * tiles);
}

function dist(a: TilePos, b: TilePos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * CHASE target per personality. The Wildcard targets the player directly; its
 * erratic phases are handled by `Enemy` (it switches to wandering).
 */
export function chaseTarget(personality: Personality, ctx: TargetContext): TilePos {
  switch (personality) {
    case 'hunter':
      return ctx.playerTile;

    case 'interceptor':
      return projectAhead(ctx, ctx.params.interceptLookahead);

    case 'strategist': {
      if (dist(ctx.selfTile, ctx.playerTile) <= STRATEGIST_CHARGE_DISTANCE) return ctx.playerTile;
      const ahead = projectAhead(ctx, STRATEGIST_LOOKAHEAD);
      const radius = ctx.params.strategistRadius;
      let best: TilePos | null = null;
      let bestScore = Infinity;
      for (const junction of ctx.grid.intersections) {
        if (Math.abs(junction.x - ahead.x) + Math.abs(junction.y - ahead.y) > radius) continue;
        // Close to where the player is heading, far from the Hunter → closes the other exit.
        const score = dist(junction, ahead) - STRATEGIST_PINCER_WEIGHT * dist(junction, ctx.hunterTile);
        if (score < bestScore) {
          bestScore = score;
          best = junction;
        }
      }
      return best ?? ahead;
    }

    case 'wildcard':
      return ctx.playerTile;
  }
}

/** PATROL target: a walkable tile near the enemy's corner. */
export function patrolTarget(grid: Grid, corner: TilePos): TilePos {
  return grid.nearestWalkable(corner.x * (grid.cols - 1), corner.y * (grid.rows - 1));
}
