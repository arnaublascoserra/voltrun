import type { PickupKind, TilePos, TileType } from '../core/types';

/**
 * Map legend (one character per tile):
 *
 *   #  wall                     .  shard (small collectible)
 *   o  overcharge core (power)  $  prism (bonus, put them in risky spots)
 *   =  tunnel (no pickup, enemies slow down; wraps at the map edge)
 *   -  enemy home door          P  player spawn
 *   1-4 enemy spawns (inside the home)   (space) empty floor
 */
export interface MapDefinition {
  id: string;
  name: string;
  rows: readonly string[];
}

export interface PickupSpawn extends TilePos {
  kind: PickupKind;
}

export interface ParsedMap {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Row-major: index = y * cols + x. */
  tiles: TileType[];
  pickups: PickupSpawn[];
  playerSpawn: TilePos;
  /** Index i = spawn marker `i + 1`. */
  enemySpawns: TilePos[];
  door: TilePos;
  /** Tile just outside the door where enemies enter the maze. */
  penExit: TilePos;
}
