import { BASE_TILE } from '../config/gameConfig';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Converts tile coordinates to screen pixels, fitting any map size into an area. */
export class MazeLayout {
  readonly tileSize: number;
  readonly originX: number;
  readonly originY: number;
  /** Sprite scale relative to the textures' reference tile size. */
  readonly scale: number;
  readonly width: number;
  readonly height: number;

  constructor(
    readonly cols: number,
    readonly rows: number,
    area: Rect,
  ) {
    this.tileSize = Math.floor(Math.min(area.width / cols, area.height / rows));
    this.width = cols * this.tileSize;
    this.height = rows * this.tileSize;
    this.originX = Math.round(area.x + (area.width - this.width) / 2);
    this.originY = Math.round(area.y + (area.height - this.height) / 2);
    this.scale = this.tileSize / BASE_TILE;
  }

  /** Centre of tile column `tx` (accepts fractional values). */
  x(tx: number): number {
    return this.originX + (tx + 0.5) * this.tileSize;
  }

  y(ty: number): number {
    return this.originY + (ty + 0.5) * this.tileSize;
  }
}
