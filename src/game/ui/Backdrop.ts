import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { TEX } from './textures';

const GRID_SPACING = 32;
const FLOATERS_PER_1000PX = 40;
const FLOATER_LIFESPAN_MS = 14000;

/**
 * Dotted grid covering the whole canvas (not just the design box). It ignores
 * the camera scroll and follows canvas resizes.
 */
export function addGridBackground(scene: Phaser.Scene, alpha: number): Phaser.GameObjects.TileSprite {
  const grid = scene.add
    .tileSprite(0, 0, scene.scale.width, scene.scale.height, TEX.gridDot)
    .setOrigin(0)
    .setScrollFactor(0)
    .setTileScale(GRID_SPACING / 4)
    .setAlpha(alpha);
  onCanvasResize(scene, (w, h) => grid.setSize(w, h));
  return grid;
}

/** Animated menu background: dotted grid, bottom fade and slowly rising sparks. */
export function addBackdrop(scene: Phaser.Scene, withFloaters = true): void {
  addGridBackground(scene, 0.6);

  const vignette = scene.add.graphics().setScrollFactor(0);
  const drawVignette = (w: number, h: number) => {
    vignette.clear();
    vignette.fillGradientStyle(COLORS.background, COLORS.background, COLORS.background, COLORS.background, 0, 0, 1, 1);
    vignette.fillRect(0, h * 0.55, w, h * 0.45);
  };
  drawVignette(scene.scale.width, scene.scale.height);
  onCanvasResize(scene, drawVignette);

  if (!withFloaters) return;
  const bounds = { width: scene.scale.width, height: scene.scale.height };
  const emitter = scene.add.particles(0, 0, TEX.particle, {
    x: { onEmit: () => Math.random() * bounds.width },
    y: { onEmit: () => bounds.height + 10 },
    speedY: { min: -60, max: -20 },
    speedX: { min: -8, max: 8 },
    lifespan: FLOATER_LIFESPAN_MS,
    scale: { min: 0.2, max: 0.6 },
    alpha: { start: 0.5, end: 0 },
    tint: [COLORS.player, 0x3dc8ff, 0xb46bff, 0xff3d6e],
    blendMode: Phaser.BlendModes.ADD,
  });
  emitter.setScrollFactor(0);
  const configure = (w: number, h: number) => {
    bounds.width = w;
    bounds.height = h;
    emitter.frequency = FLOATER_LIFESPAN_MS / Math.max(8, (w / 1000) * FLOATERS_PER_1000PX);
  };
  configure(scene.scale.width, scene.scale.height);
  onCanvasResize(scene, configure);
}

function onCanvasResize(scene: Phaser.Scene, fn: (width: number, height: number) => void): void {
  const handler = (size: Phaser.Structs.Size) => fn(size.width, size.height);
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
}
