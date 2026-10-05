import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/gameConfig';
import { ENEMY_PROFILES } from '../config/enemies';
import { COLORS } from '../config/theme';
import { highScores } from '../services/highScores';
import { addBackdrop } from '../ui/Backdrop';
import { DESIGN, fitDesign } from '../ui/viewport';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { TEX } from '../ui/textures';
import { displayText, formatScore, glow, monoText } from '../ui/text';

const BUTTON_START_Y = 520;
const BUTTON_GAP = 78;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.menu);
  }

  create(): void {
    fitDesign(this, DESIGN.portrait);
    addBackdrop(this);
    const cx = GAME_WIDTH / 2;

    // Logo
    const logoIcon = this.add.image(cx, 170, TEX.player).setScale(2.4);
    this.tweens.add({ targets: logoIcon, angle: 360, duration: 12000, repeat: -1 });
    const title = glow(this.add.text(cx, 270, 'VOLTRUN', displayText(84, COLORS.text, { fontStyle: '900' })).setOrigin(0.5), COLORS.accent, 28);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(cx, 335, 'RECOGE LA ENERGÍA · ESQUIVA LOS GLITCHES', monoText(18, COLORS.textDim)).setOrigin(0.5);

    // The four Glitches parade under the logo.
    ENEMY_PROFILES.forEach((p, i) => {
      const x = cx + (i - 1.5) * 64;
      const sprite = this.add.image(x, 410, TEX.enemy(p.personality)).setTint(p.color).setScale(1.1);
      this.tweens.add({ targets: sprite, y: 400, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const buttons = [
      new NeonButton(this, cx, BUTTON_START_Y, 'PLAY', () => this.scene.start(SCENE_KEYS.game), { color: COLORS.accentHex }),
      new NeonButton(this, cx, BUTTON_START_Y + BUTTON_GAP, 'HOW TO PLAY', () => this.scene.start(SCENE_KEYS.howTo)),
      new NeonButton(this, cx, BUTTON_START_Y + BUTTON_GAP * 2, 'HIGH SCORES', () => this.scene.start(SCENE_KEYS.highScores)),
      new NeonButton(this, cx, BUTTON_START_Y + BUTTON_GAP * 3, 'SETTINGS', () => this.scene.start(SCENE_KEYS.settings)),
    ];
    new MenuNavigator(this, buttons);

    const best = highScores.getBest();
    this.add.text(cx, GAME_HEIGHT - 70, `BEST  ${formatScore(best)}`, displayText(22, COLORS.gold)).setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT - 32, 'Flechas / WASD · desliza en móvil · Enter para empezar', monoText(14, COLORS.textDim))
      .setOrigin(0.5);
  }
}
