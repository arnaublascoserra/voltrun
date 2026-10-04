import type Phaser from 'phaser';
import { BASE_TILE } from '../config/gameConfig';
import type { Personality } from '../config/enemies';
import { COLORS } from '../config/theme';

/** Texture keys. Every texture is generated at boot — no image files needed. */
export const TEX = {
  shard: 'tex-shard',
  core: 'tex-core',
  prism: 'tex-prism',
  player: 'tex-player',
  enemy: (p: Personality) => `tex-enemy-${p}`,
  eyeWhite: 'tex-eye-white',
  pupil: 'tex-pupil',
  particle: 'tex-particle',
  ring: 'tex-ring',
  gridDot: 'tex-grid-dot',
} as const;

type Point = { x: number; y: number };

function polygon(cx: number, cy: number, radius: number, sides: number, rotation = 0): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  }
  return pts;
}

function star(cx: number, cy: number, outer: number, inner: number, points: number, rotation = -Math.PI / 2): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i / (points * 2)) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function scalePoints(points: Point[], cx: number, cy: number, factor: number): Point[] {
  return points.map((p) => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
}

/** Draws a shape several times, bigger and fainter each time, to fake a neon glow. */
function glowShape(g: Phaser.GameObjects.Graphics, pts: Point[], cx: number, cy: number, color: number, layers = 3): void {
  for (let i = layers; i >= 1; i--) {
    g.fillStyle(color, 0.06 + 0.04 * (layers - i));
    g.fillPoints(scalePoints(pts, cx, cy, 1 + i * 0.16), true);
  }
}

function make(scene: Phaser.Scene, key: string, size: number, draw: (g: Phaser.GameObjects.Graphics, c: number) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g, size / 2);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** Enemy silhouettes (drawn white, tinted per enemy at runtime). */
const ENEMY_SHAPES: Record<Personality, (c: number) => Point[]> = {
  // RAZE — horned arrowhead.
  hunter: (c) => [
    { x: c - 14, y: c - 12 },
    { x: c - 6, y: c - 5 },
    { x: c, y: c - 13 },
    { x: c + 6, y: c - 5 },
    { x: c + 14, y: c - 12 },
    { x: c + 11, y: c + 5 },
    { x: c, y: c + 14 },
    { x: c - 11, y: c + 5 },
  ],
  // VEX — swept kite with fins.
  interceptor: (c) => star(c, c, 15, 8, 4, -Math.PI / 2),
  // NYX — solid hexagon.
  strategist: (c) => polygon(c, c, 14, 6, -Math.PI / 2),
  // FLUX — jagged eight-point burst.
  wildcard: (c) => star(c, c, 15, 10, 8, -Math.PI / 2),
};

export function generateTextures(scene: Phaser.Scene): void {
  const T = BASE_TILE;

  make(scene, TEX.shard, 16, (g, c) => {
    const d = star(c, c, 3.5, 3.5, 2, 0);
    glowShape(g, d, c, c, COLORS.shard, 3);
    g.fillStyle(COLORS.shard, 1);
    g.fillPoints(polygon(c, c, 3.2, 4, 0), true);
  });

  make(scene, TEX.core, 32, (g, c) => {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(COLORS.coreGlow, 0.07 * (5 - i));
      g.fillCircle(c, c, 7 + i * 2);
    }
    g.lineStyle(2, COLORS.coreGlow, 1);
    g.strokeCircle(c, c, 8);
    g.fillStyle(COLORS.core, 1);
    g.fillCircle(c, c, 4.5);
  });

  make(scene, TEX.prism, 28, (g, c) => {
    const pts = star(c, c, 9, 4.5, 4, -Math.PI / 2);
    glowShape(g, pts, c, c, COLORS.prism, 3);
    g.fillStyle(COLORS.prism, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(c, c, 2);
  });

  // VOLT — the player: a hexagonal energy core with a visor pointing right.
  make(scene, TEX.player, 48, (g, c) => {
    const hex = polygon(c, c, T * 0.42, 6, 0);
    glowShape(g, hex, c, c, COLORS.player, 4);
    g.fillStyle(COLORS.player, 1);
    g.fillPoints(hex, true);
    g.fillStyle(COLORS.background, 1);
    g.fillPoints(polygon(c, c, T * 0.25, 6, 0), true);
    g.fillStyle(COLORS.playerCore, 1);
    g.fillTriangle(c - 3, c - 6, c + 7, c, c - 3, c + 6);
  });

  for (const personality of Object.keys(ENEMY_SHAPES) as Personality[]) {
    make(scene, TEX.enemy(personality), 48, (g, c) => {
      const pts = ENEMY_SHAPES[personality](c);
      glowShape(g, pts, c, c, 0xffffff, 3);
      g.fillStyle(0xffffff, 1);
      g.fillPoints(pts, true);
      // Dark inner core gives the silhouette depth after tinting.
      g.fillStyle(0x000000, 0.35);
      g.fillPoints(scalePoints(pts, c, c, 0.55), true);
    });
  }

  make(scene, TEX.eyeWhite, 10, (g, c) => {
    g.fillStyle(COLORS.eyeWhite, 1);
    g.fillCircle(c, c, 4);
  });

  make(scene, TEX.pupil, 6, (g, c) => {
    g.fillStyle(COLORS.eyePupil, 1);
    g.fillCircle(c, c, 2);
  });

  make(scene, TEX.particle, 12, (g, c) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(c, c, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 3);
  });

  make(scene, TEX.ring, 64, (g, c) => {
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(c, c, 28);
  });

  make(scene, TEX.gridDot, 4, (g) => {
    g.fillStyle(COLORS.gridLine, 1);
    g.fillRect(1, 1, 2, 2);
  });
}
