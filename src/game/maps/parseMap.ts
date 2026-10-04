import type { PickupKind, TilePos, TileType } from '../core/types';
import type { MapDefinition, ParsedMap, PickupSpawn } from './types';

export class MapError extends Error {
  constructor(mapId: string, message: string) {
    super(`[map:${mapId}] ${message}`);
    this.name = 'MapError';
  }
}

const TILE_CHARS: Record<string, TileType> = {
  '#': 'wall',
  '.': 'floor',
  o: 'floor',
  $: 'floor',
  ' ': 'floor',
  P: 'floor',
  '=': 'tunnel',
  '-': 'door',
};

const PICKUP_CHARS: Record<string, PickupKind> = {
  '.': 'shard',
  o: 'core',
  $: 'prism',
};

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Parses and validates an ASCII map. Throws a `MapError` describing the first
 * problem found, so broken maps fail fast (and in the unit tests).
 */
export function parseMap(def: MapDefinition, enemyCount = 4): ParsedMap {
  const rows = def.rows.length;
  if (rows < 3) throw new MapError(def.id, 'map needs at least 3 rows');
  const cols = def.rows[0].length;

  const tiles: TileType[] = [];
  const pickups: PickupSpawn[] = [];
  const enemySpawns: (TilePos | undefined)[] = new Array<TilePos | undefined>(enemyCount).fill(undefined);
  let playerSpawn: TilePos | undefined;
  let door: TilePos | undefined;

  def.rows.forEach((line, y) => {
    if (line.length !== cols) {
      throw new MapError(def.id, `row ${y} has ${line.length} columns, expected ${cols}`);
    }
    for (let x = 0; x < cols; x++) {
      const ch = line[x];
      if (ch >= '1' && ch <= '9') {
        const index = Number(ch) - 1;
        if (index >= enemyCount) throw new MapError(def.id, `enemy spawn ${ch} exceeds enemy count ${enemyCount}`);
        if (enemySpawns[index]) throw new MapError(def.id, `duplicate enemy spawn ${ch}`);
        enemySpawns[index] = { x, y };
        tiles.push('floor');
        continue;
      }
      const type = TILE_CHARS[ch];
      if (!type) throw new MapError(def.id, `unknown character "${ch}" at ${x},${y}`);
      tiles.push(type);
      const kind = PICKUP_CHARS[ch];
      if (kind) pickups.push({ x, y, kind });
      if (ch === 'P') {
        if (playerSpawn) throw new MapError(def.id, 'more than one player spawn');
        playerSpawn = { x, y };
      }
      if (ch === '-') {
        if (door) throw new MapError(def.id, 'more than one door');
        door = { x, y };
      }
    }
  });

  if (!playerSpawn) throw new MapError(def.id, 'missing player spawn "P"');
  if (!door) throw new MapError(def.id, 'missing enemy door "-"');
  const missing = enemySpawns.findIndex((s) => !s);
  if (missing >= 0) throw new MapError(def.id, `missing enemy spawn "${missing + 1}"`);
  if (pickups.length === 0) throw new MapError(def.id, 'map has no pickups');

  const penExit = { x: door.x, y: door.y - 1 };
  if (penExit.y < 0 || tiles[penExit.y * cols + penExit.x] === 'wall') {
    throw new MapError(def.id, 'the tile above the door must be walkable');
  }

  const parsed: ParsedMap = {
    id: def.id,
    name: def.name,
    cols,
    rows,
    tiles,
    pickups,
    playerSpawn,
    enemySpawns: enemySpawns as TilePos[],
    door,
    penExit,
  };

  validateReachability(parsed);
  return parsed;
}

function floodFill(map: ParsedMap, start: TilePos, allowDoor: boolean): Set<number> {
  const seen = new Set<number>([start.y * map.cols + start.x]);
  const queue: TilePos[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const { x, y } = queue[head];
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = (x + dx + map.cols) % map.cols;
      const ny = y + dy;
      if (ny < 0 || ny >= map.rows) continue;
      const idx = ny * map.cols + nx;
      const t = map.tiles[idx];
      if (t === 'wall' || (t === 'door' && !allowDoor) || seen.has(idx)) continue;
      seen.add(idx);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

function validateReachability(map: ParsedMap): void {
  const fromPlayer = floodFill(map, map.playerSpawn, false);
  for (const p of map.pickups) {
    if (!fromPlayer.has(p.y * map.cols + p.x)) {
      throw new MapError(map.id, `pickup at ${p.x},${p.y} is unreachable for the player`);
    }
  }
  if (!fromPlayer.has(map.penExit.y * map.cols + map.penExit.x)) {
    throw new MapError(map.id, 'the enemy exit is not connected to the player area');
  }
  map.enemySpawns.forEach((spawn, i) => {
    const reach = floodFill(map, spawn, true);
    if (!reach.has(map.penExit.y * map.cols + map.penExit.x)) {
      throw new MapError(map.id, `enemy ${i + 1} cannot leave its home`);
    }
  });
}
