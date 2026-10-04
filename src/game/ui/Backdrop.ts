import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { TEX } from './textures';

const GRID_SPACING = 32;
const FLOATERS = 26;

/** Animated menu background: dotted grid plus slowly rising sparks. */
export function addBackdrop(scene: Phaser.Scene, withFloaters = true): void {
  scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEX.gridDot).setOrigin(0).setTileScale(GRID_SPACING / 4).setAlpha(0.6);

  const vignette = scene.add.graphics();
  vignette.fillGradientStyle(COLORS.background, COLORS.background, COLORS.background, COLORS.background, 0, 0, 1, 1);
  vignette.fillRect(0, GAME_HEIGHT * 0.55, GAME_WIDTH, GAME_HEIGHT * 0.45);

  if (!withFloaters) return;
  scene.add.particles(0, 0, TEX.particle, {
    x: { min: 0, max: GAME_WIDTH },
    y: GAME_HEIGHT + 10,
    speedY: { min: -60, max: -20 },
    speedX: { min: -8, max: 8 },
    lifespan: 14000,
    scale: { min: 0.2, max: 0.6 },
    alpha: { start: 0.5, end: 0 },
    tint: [COLORS.player, 0x3dc8ff, 0xb46bff, 0xff3d6e],
    frequency: 14000 / FLOATERS,
    blendMode: Phaser.BlendModes.ADD,
  });
}
