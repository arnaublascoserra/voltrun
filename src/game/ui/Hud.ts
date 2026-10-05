import type Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { GAME_HEIGHT, GAME_WIDTH, LANDSCAPE_WIDTH, LAYOUT } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { TEX } from './textures';
import { displayText, formatScore, glow, monoText } from './text';
import type { Orientation } from './viewport';

const ICON_SIZE = 44;
const MARGIN = 24;
const ICON_GAP = 60;
const LIFE_SPACING = 30;
const SCORE_GLOW = 10;

/** Landscape side panels: vertical positions inside the design box. */
const PANEL = {
  scoreY: 270,
  highY: 390,
  levelY: 510,
  mapNameY: 630,
  livesY: 330,
  buttonsY: 470,
  hintY: 560,
  labelGap: 32,
  labelSize: 16,
  valueSize: 40,
} as const;

export interface HudCallbacks {
  onPause(): void;
  onToggleMute(): void;
  /** Omitted when the browser has no fullscreen support (e.g. iPhone). */
  onToggleFullscreen?: () => void;
}

/**
 * In-game heads-up display. Values are only re-rendered when they change,
 * because updating a Phaser Text re-rasterises its texture.
 *
 * Portrait: score bar above the maze, lives/buttons below.
 * Landscape: score panel on the left, lives/buttons panel on the right.
 */
export class Hud {
  private readonly score: Phaser.GameObjects.Text;
  private readonly high: Phaser.GameObjects.Text;
  private readonly level: Phaser.GameObjects.Text;
  private readonly mapName: Phaser.GameObjects.Text;
  private readonly lifeIcons: Phaser.GameObjects.Image[] = [];
  private readonly muteIcon: Phaser.GameObjects.Graphics;
  private last = { score: -1, high: -1, level: -1, lives: -1, muted: null as boolean | null };

  constructor(scene: Phaser.Scene, orientation: Orientation, cb: HudCallbacks) {
    const labelStyle = monoText(14, COLORS.textDim, { letterSpacing: 2 } as Phaser.Types.GameObjects.Text.TextStyle);
    const icons: [(g: Phaser.GameObjects.Graphics) => void, () => void][] = [[drawPause, cb.onPause]];

    if (orientation === 'landscape') {
      const leftX = LAYOUT.sidePanelWidth / 2;
      const rightX = LANDSCAPE_WIDTH - LAYOUT.sidePanelWidth / 2;
      const valueStyle = (color: string) => displayText(PANEL.valueSize, color);
      const panelLabel = monoText(PANEL.labelSize, COLORS.textDim, { letterSpacing: 2 } as Phaser.Types.GameObjects.Text.TextStyle);

      scene.add.text(leftX, PANEL.scoreY, 'SCORE', panelLabel).setOrigin(0.5, 0);
      this.score = glow(scene.add.text(leftX, PANEL.scoreY + PANEL.labelGap, '000000', valueStyle(COLORS.text)).setOrigin(0.5, 0), COLORS.accent, SCORE_GLOW);
      // Glow padding shifts top-anchored text down; compensate.
      this.score.y -= SCORE_GLOW;
      scene.add.text(leftX, PANEL.highY, 'HIGH SCORE', panelLabel).setOrigin(0.5, 0);
      this.high = scene.add.text(leftX, PANEL.highY + PANEL.labelGap, '000000', valueStyle(COLORS.gold)).setOrigin(0.5, 0);
      scene.add.text(leftX, PANEL.levelY, 'LEVEL', panelLabel).setOrigin(0.5, 0);
      this.level = scene.add.text(leftX, PANEL.levelY + PANEL.labelGap, '1', valueStyle(COLORS.text)).setOrigin(0.5, 0);
      this.mapName = scene.add
        .text(leftX, PANEL.mapNameY, '', monoText(16, COLORS.textDim, { align: 'center', wordWrap: { width: LAYOUT.sidePanelWidth - 40 } }))
        .setOrigin(0.5, 0);

      scene.add.text(rightX, PANEL.livesY, 'LIVES', panelLabel).setOrigin(0.5, 0);
      const livesY = PANEL.livesY + PANEL.labelGap + 18;
      const firstX = rightX - ((BALANCE.lives.max - 1) * LIFE_SPACING) / 2;
      for (let i = 0; i < BALANCE.lives.max; i++) {
        this.lifeIcons.push(scene.add.image(firstX + i * LIFE_SPACING, livesY, TEX.player).setScale(0.5).setVisible(false));
      }

      const muteHolder: Phaser.GameObjects.Graphics[] = [];
      icons.push([(g) => muteHolder.push(g), cb.onToggleMute]);
      if (cb.onToggleFullscreen) icons.push([drawFullscreen, cb.onToggleFullscreen]);
      const startX = rightX - ((icons.length - 1) * ICON_GAP) / 2;
      icons.forEach(([draw, onClick], i) => this.makeIconButton(scene, startX + i * ICON_GAP, PANEL.buttonsY, onClick, draw));
      this.muteIcon = muteHolder[0];

      const hint = cb.onToggleFullscreen ? ['P pausa · M sonido', 'F pantalla completa'] : ['P pausa · M sonido'];
      scene.add.text(rightX, PANEL.hintY, hint, monoText(14, COLORS.textDim, { align: 'center' })).setOrigin(0.5, 0);
      return;
    }

    const top = 22;
    const valueY = 52;
    scene.add.text(MARGIN, top, 'SCORE', labelStyle);
    this.score = glow(scene.add.text(MARGIN - SCORE_GLOW, valueY - SCORE_GLOW, '000000', displayText(28, COLORS.text)), COLORS.accent, SCORE_GLOW);

    scene.add.text(GAME_WIDTH / 2 - 30, top, 'HIGH SCORE', labelStyle).setOrigin(0.5, 0);
    this.high = scene.add.text(GAME_WIDTH / 2 - 30, valueY, '000000', displayText(28, COLORS.gold)).setOrigin(0.5, 0);

    scene.add.text(GAME_WIDTH - 150, top, 'LEVEL', labelStyle).setOrigin(0.5, 0);
    this.level = scene.add.text(GAME_WIDTH - 150, valueY, '1', displayText(28, COLORS.text)).setOrigin(0.5, 0);

    const iconX = GAME_WIDTH - MARGIN - ICON_SIZE / 2;
    this.makeIconButton(scene, iconX, LAYOUT.hudHeight / 2, cb.onPause, drawPause);

    const footerY = GAME_HEIGHT - LAYOUT.footerHeight / 2;
    scene.add.text(MARGIN, footerY, 'LIVES', labelStyle).setOrigin(0, 0.5);
    for (let i = 0; i < BALANCE.lives.max; i++) {
      this.lifeIcons.push(scene.add.image(MARGIN + 80 + i * LIFE_SPACING, footerY, TEX.player).setScale(0.5).setVisible(false));
    }
    this.mapName = scene.add.text(GAME_WIDTH / 2 + 20, footerY, '', monoText(16, COLORS.textDim)).setOrigin(0.5);

    this.muteIcon = this.makeIconButton(scene, iconX, footerY, cb.onToggleMute, () => {});
    if (cb.onToggleFullscreen) this.makeIconButton(scene, iconX - ICON_GAP, footerY, cb.onToggleFullscreen, drawFullscreen);
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

function drawPause(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(-9, -11, 6, 22, 2);
  g.fillRoundedRect(3, -11, 6, 22, 2);
}

/** Four corner brackets. */
function drawFullscreen(g: Phaser.GameObjects.Graphics): void {
  const a = 11;
  const b = 5;
  g.lineStyle(3, 0xffffff, 1);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.lineBetween(sx * a, sy * a, sx * (a - b), sy * a);
    g.lineBetween(sx * a, sy * a, sx * a, sy * (a - b));
  }
}
