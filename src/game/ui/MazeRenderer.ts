import type Phaser from 'phaser';
import { COLORS } from '../config/theme';
import type { Grid } from '../core/Grid';
import type { MazeLayout } from './MazeLayout';

/** Inset of the neon wall line inside the wall tile, as a fraction of the tile. */
const WALL_INSET = 0.22;
const GLOW_WIDTH = 0.28;
const LINE_WIDTH = 0.08;

/**
 * Draws the maze once into a texture (walls, tunnels, door) so the per-frame
 * cost of the static level is a single image.
 *
 * Wall outlines follow the boundary between wall and floor tiles. Line ends
 * are extended/trimmed depending on the neighbouring tiles so convex and
 * concave corners join cleanly.
 */
export function renderMaze(scene: Phaser.Scene, grid: Grid, layout: MazeLayout, key: string): Phaser.GameObjects.Image {
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const ts = layout.tileSize;
  const g = scene.make.graphics({}, false);
  const wall = (x: number, y: number) => grid.tileAt(x, y) === 'wall' && x >= 0 && x < grid.cols;
  const isWall = (x: number, y: number) => (x < 0 || x >= grid.cols ? true : wall(x, y));

  // Tunnels: subtle striped floor so players notice the slow-down zone.
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (grid.isTunnel(x, y)) {
        g.fillStyle(COLORS.tunnel, 1);
        g.fillRect(x * ts, y * ts + ts * 0.15, ts, ts * 0.7);
      }
    }
  }

  const segments: [number, number, number, number][] = [];
  const d = ts * WALL_INSET;
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!wall(x, y)) continue;
      const x0 = x * ts;
      const y0 = y * ts;
      const x1 = x0 + ts;
      const y1 = y0 + ts;
      const N = !isWall(x, y - 1);
      const S = !isWall(x, y + 1);
      const W = !isWall(x - 1, y);
      const E = !isWall(x + 1, y);
      const NW = isWall(x - 1, y - 1);
      const NE = isWall(x + 1, y - 1);
      const SW = isWall(x - 1, y + 1);
      const SE = isWall(x + 1, y + 1);

      if (N) segments.push([W ? x0 + d : NW ? x0 - d : x0, y0 + d, E ? x1 - d : NE ? x1 + d : x1, y0 + d]);
      if (S) segments.push([W ? x0 + d : SW ? x0 - d : x0, y1 - d, E ? x1 - d : SE ? x1 + d : x1, y1 - d]);
      if (W) segments.push([x0 + d, N ? y0 + d : NW ? y0 - d : y0, x0 + d, S ? y1 - d : SW ? y1 + d : y1]);
      if (E) segments.push([x1 - d, N ? y0 + d : NE ? y0 - d : y0, x1 - d, S ? y1 - d : SE ? y1 + d : y1]);
    }
  }

  const strokeAll = (width: number, color: number, alpha: number) => {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    for (const [ax, ay, bx, by] of segments) {
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
    }
    g.strokePath();
  };
  strokeAll(ts * GLOW_WIDTH, COLORS.wallGlow, 0.12);
  strokeAll(ts * GLOW_WIDTH * 0.5, COLORS.wallGlow, 0.22);
  strokeAll(Math.max(2, ts * LINE_WIDTH), COLORS.wall, 1);

  // Enemy home door.
  const door = grid.map.door;
  g.fillStyle(COLORS.door, 0.25);
  g.fillRect(door.x * ts, door.y * ts + ts * 0.3, ts, ts * 0.4);
  g.fillStyle(COLORS.door, 1);
  g.fillRect(door.x * ts, door.y * ts + ts * 0.42, ts, ts * 0.16);

  g.generateTexture(key, layout.width, layout.height);
  g.destroy();

  return scene.add.image(layout.originX, layout.originY, key).setOrigin(0, 0);
}
