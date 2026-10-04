import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import type { GameResult } from '../systems/GameSession';
import { addBackdrop } from '../ui/Backdrop';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { displayText, formatScore, glow, monoText } from '../ui/text';

export class GameOverScene extends Phaser.Scene {
  private result!: GameResult;

  constructor() {
    super(SCENE_KEYS.gameOver);
  }

  init(data: GameResult): void {
    this.result = data;
  }

  create(): void {
    const r = this.result;
    const cx = GAME_WIDTH / 2;
    addBackdrop(this, r.victory);

    const title = r.victory ? 'SYSTEM CLEAR' : 'GAME OVER';
    const titleColor = r.victory ? COLORS.accent : COLORS.danger;
    const titleText = glow(this.add.text(cx, 150, title, displayText(60, titleColor, { fontStyle: '900' })).setOrigin(0.5), titleColor, 26);
    titleText.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: titleText, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });

    if (r.victory) {
      this.add.text(cx, 210, '¡Has liberado todos los circuitos!', monoText(20, COLORS.text)).setOrigin(0.5);
    }

    this.add.text(cx, 280, 'SCORE', monoText(16, COLORS.textDim)).setOrigin(0.5);
    const scoreText = glow(this.add.text(cx, 325, '000000', displayText(56)).setOrigin(0.5), COLORS.accent, 16);
    // Count-up animation.
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: r.score,
      duration: Math.min(1500, 300 + r.score / 20),
      ease: 'Cubic.easeOut',
      onUpdate: () => scoreText.setText(formatScore(Math.round(counter.value))),
    });

    if (r.isNewRecord) {
      const rec = glow(this.add.text(cx, 382, '★ NEW RECORD ★', displayText(24, COLORS.gold)).setOrigin(0.5), COLORS.gold, 14);
      this.tweens.add({ targets: rec, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    }

    const lines: [string, string][] = [
      ['HIGH SCORE', formatScore(r.highScore)],
      ['LEVEL', String(r.level)],
      ['GLITCHES ATRAPADOS', String(r.stats.enemiesCaught)],
      ['MEJOR COMBO', `x${r.stats.bestCombo}`],
      ['TIEMPO', `${Math.floor(r.stats.timePlayed / 60)}:${String(Math.floor(r.stats.timePlayed % 60)).padStart(2, '0')}`],
    ];
    lines.forEach(([label, value], i) => {
      const y = 440 + i * 40;
      this.add.text(cx - 200, y, label, monoText(18, COLORS.textDim));
      this.add.text(cx + 200, y, value, displayText(20, i === 0 ? COLORS.gold : COLORS.text)).setOrigin(1, 0);
    });

    const buttons = [
      new NeonButton(this, cx, GAME_HEIGHT - 210, 'PLAY AGAIN', () => this.scene.start(SCENE_KEYS.game), { color: COLORS.accentHex }),
      new NeonButton(this, cx, GAME_HEIGHT - 130, 'MENU', () => this.scene.start(SCENE_KEYS.menu)),
    ];
    new MenuNavigator(this, buttons, () => this.scene.start(SCENE_KEYS.menu));
  }
}
