export interface TilePos {
  x: number;
  y: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right' | 'none';
export type MoveDir = Exclude<Dir, 'none'>;

export type TileType = 'wall' | 'floor' | 'door' | 'tunnel';
export type PickupKind = 'shard' | 'core' | 'prism';
