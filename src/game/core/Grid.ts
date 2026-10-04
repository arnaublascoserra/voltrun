import type { ParsedMap } from '../maps/types';
import { DIR_VECTORS, MOVE_DIRS } from './direction';
import type { Dir, TilePos, TileType } from './types';

/** Value used in distance fields for tiles that cannot be reached. */
export const UNREACHABLE = 0x7fff;

const FIELD_CACHE_LIMIT = 256;

/**
 * Read-only spatial queries over a parsed map. The map wraps horizontally so
 * tunnels that touch the left/right edge connect to each other.
 */
export class Grid {
  readonly cols: number;
  readonly rows: number;
  /** Junction tiles (3+ exits) — used by the Strategist AI. */
  readonly intersections: readonly TilePos[];

  private readonly fieldCache = new Map<number, Int16Array>();

  constructor(readonly map: ParsedMap) {
    this.cols = map.cols;
    this.rows = map.rows;
    this.intersections = this.findIntersections();
  }

  index(x: number, y: number): number {
    return y * this.cols + this.wrapX(x);
  }

  wrapX(x: number): number {
    return ((x % this.cols) + this.cols) % this.cols;
  }

  tileAt(x: number, y: number): TileType {
    if (y < 0 || y >= this.rows) return 'wall';
    return this.map.tiles[this.index(x, y)];
  }

  isWalkable(x: number, y: number, allowDoor: boolean): boolean {
    const t = this.tileAt(x, y);
    return t === 'floor' || t === 'tunnel' || (allowDoor && t === 'door');
  }

  isTunnel(x: number, y: number): boolean {
    return this.tileAt(x, y) === 'tunnel';
  }

  /** Neighbour tile in `dir`, wrapped horizontally. Writes into `out` to avoid allocations. */
  neighbor(pos: TilePos, dir: Dir, out: TilePos = { x: 0, y: 0 }): TilePos {
    const v = DIR_VECTORS[dir];
    out.x = this.wrapX(pos.x + v.x);
    out.y = pos.y + v.y;
    return out;
  }

  canMove(pos: TilePos, dir: Dir, allowDoor: boolean): boolean {
    if (dir === 'none') return false;
    const v = DIR_VECTORS[dir];
    return this.isWalkable(pos.x + v.x, pos.y + v.y, allowDoor);
  }

  exitCount(x: number, y: number, allowDoor = false): number {
    let n = 0;
    for (const d of MOVE_DIRS) {
      const v = DIR_VECTORS[d];
      if (this.isWalkable(x + v.x, y + v.y, allowDoor)) n++;
    }
    return n;
  }

  /**
   * Breadth-first distance (in tiles) from every tile to `target`.
   * Cached per target because maps are static.
   */
  distanceField(target: TilePos, allowDoor: boolean): Int16Array {
    const tx = this.wrapX(target.x);
    const ty = Math.min(this.rows - 1, Math.max(0, target.y));
    const key = (ty * this.cols + tx) * 2 + (allowDoor ? 1 : 0);
    const cached = this.fieldCache.get(key);
    if (cached) return cached;

    const field = new Int16Array(this.cols * this.rows).fill(UNREACHABLE);
    const queue = new Int32Array(this.cols * this.rows);
    let head = 0;
    let tail = 0;
    const start = ty * this.cols + tx;
    field[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % this.cols;
      const y = (idx - x) / this.cols;
      const d = field[idx] + 1;
      for (const dir of MOVE_DIRS) {
        const v = DIR_VECTORS[dir];
        const ny = y + v.y;
        if (!this.isWalkable(x + v.x, ny, allowDoor)) continue;
        const nIdx = this.index(x + v.x, ny);
        if (field[nIdx] <= d) continue;
        field[nIdx] = d;
        queue[tail++] = nIdx;
      }
    }

    if (this.fieldCache.size >= FIELD_CACHE_LIMIT) {
      const oldest = this.fieldCache.keys().next().value;
      if (oldest !== undefined) this.fieldCache.delete(oldest);
    }
    this.fieldCache.set(key, field);
    return field;
  }

  /** Nearest walkable (non-door) tile to an arbitrary point, clamped into the map. */
  nearestWalkable(x: number, y: number): TilePos {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.round(x)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.round(y)));
    if (this.isWalkable(cx, cy, false)) return { x: cx, y: cy };
    for (let r = 1; r < Math.max(this.cols, this.rows); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= this.cols) continue;
          if (this.isWalkable(nx, ny, false)) return { x: nx, y: ny };
        }
      }
    }
    return { ...this.map.playerSpawn };
  }

  private findIntersections(): TilePos[] {
    const result: TilePos[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.isWalkable(x, y, false) && this.exitCount(x, y) >= 3) result.push({ x, y });
      }
    }
    return result;
  }
}
