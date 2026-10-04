import type Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { TEX } from './textures';
import { displayText, formatScore, glow, monoText } from './text';

const ICON_SIZE = 44;
const MARGIN = 24;

/**
 * In-game heads-up display. Values are only re-rendered when they change,
 * because updating a Phaser Text re-rasterises its texture.
 */
export class Hud {
  private readonly score: Phaser.GameObjects.Text;
  private readonly high: Phaser.GameObjects.Text;
  private readonly level: Phaser.GameObjects.Text;
  private readonly mapName: Phaser.GameObjects.Text;
  private readonly lifeIcons: Phaser.GameObjects.Image[] = [];
  private readonly muteIcon: Phaser.GameObjects.Graphics;
  private last = { score: -1, high: -1, level: -1, lives: -1, muted: null as boolean | null };

  constructor(scene: Phaser.Scene, onPause: () => void, onToggleMute: () => void) {
    const labelStyle = monoText(14, COLORS.textDim, { letterSpacing: 2 } as Phaser.Types.GameObjects.Text.TextStyle);
    const top = 22;
    const valueY = 52;

    scene.add.text(MARGIN, top, 'SCORE', labelStyle);
    const scoreGlow = 10;
    this.score = glow(scene.add.text(MARGIN - scoreGlow, valueY - scoreGlow, '000000', displayText(28, COLORS.text)), COLORS.accent, scoreGlow);

    scene.add.text(GAME_WIDTH / 2 - 30, top, 'HIGH SCORE', labelStyle).setOrigin(0.5, 0);
    this.high = scene.add.text(GAME_WIDTH / 2 - 30, valueY, '000000', displayText(28, COLORS.gold)).setOrigin(0.5, 0);

    scene.add.text(GAME_WIDTH - 150, top, 'LEVEL', labelStyle).setOrigin(0.5, 0);
    this.level = scene.add.text(GAME_WIDTH - 150, valueY, '1', displayText(28, COLORS.text)).setOrigin(0.5, 0);

    this.makeIconButton(scene, GAME_WIDTH - MARGIN - ICON_SIZE / 2, LAYOUT.hudHeight / 2, onPause, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-9, -11, 6, 22, 2);
      g.fillRoundedRect(3, -11, 6, 22, 2);
    });

    const footerY = GAME_HEIGHT - LAYOUT.footerHeight / 2;
    scene.add.text(MARGIN, footerY, 'LIVES', labelStyle).setOrigin(0, 0.5);
    for (let i = 0; i < BALANCE.lives.max; i++) {
      this.lifeIcons.push(scene.add.image(MARGIN + 80 + i * 30, footerY, TEX.player).setScale(0.5).setVisible(false));
    }
    this.mapName = scene.add.text(GAME_WIDTH / 2 + 40, footerY, '', monoText(16, COLORS.textDim)).setOrigin(0.5);

    this.muteIcon = this.makeIconButton(scene, GAME_WIDTH - MARGIN - ICON_SIZE / 2, footerY, onToggleMute, () => {});
  }

  setScore(value: number): void {
    if (value === this.last.score) return;
    this.last.score = value;
    this.score.setText(formatScore(value));
  }

  setHighScore(value: number): void {
    if (value === this.last.high) return;
    this.last.high = value;
    this.high.setText(formatScore(value));
  }

  setLevel(value: number): void {
    if (value === this.last.level) return;
    this.last.level = value;
    this.level.setText(String(value));
  }

  setLives(value: number): void {
    if (value === this.last.lives) return;
    this.last.lives = value;
    this.lifeIcons.forEach((icon, i) => icon.setVisible(i < value));
  }

  setMapName(name: string): void {
    this.mapName.setText(name);
  }

  setMuted(muted: boolean): void {
    if (muted === this.last.muted) return;
    this.last.muted = muted;
    const g = this.muteIcon;
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(-12, -5, 6, 10);
    g.fillTriangle(-7, -5, 2, -12, 2, 12);
    g.fillTriangle(-7, -5, 2, 12, -7, 5);
    g.lineStyle(2.5, muted ? 0xff3d6e : 0xffffff, 1);
    if (muted) {
      g.lineBetween(6, -6, 14, 6);
      g.lineBetween(14, -6, 6, 6);
    } else {
      g.beginPath();
      g.arc(4, 0, 7, -0.9, 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(4, 0, 12, -0.9, 0.9);
      g.strokePath();
    }
  }

  private makeIconButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onClick: () => void,
    drawIcon: (g: Phaser.GameObjects.Graphics) => void,
  ): Phaser.GameObjects.Graphics {
    const frame = scene.add.graphics({ x, y });
    frame.fillStyle(COLORS.buttonFill, 0.9);
    frame.fillRoundedRect(-ICON_SIZE / 2, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, 10);
    frame.lineStyle(2, COLORS.panelStroke, 1);
    frame.strokeRoundedRect(-ICON_SIZE / 2, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, 10);
    const icon = scene.add.graphics({ x, y });
    drawIcon(icon);
    const zone = scene.add.zone(x, y, ICON_SIZE + 12, ICON_SIZE + 12).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);
    return icon;
  }
}
