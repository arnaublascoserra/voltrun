import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/gameConfig';
import { ENEMY_PROFILES } from '../config/enemies';
import { COLORS } from '../config/theme';
import { addBackdrop } from '../ui/Backdrop';
import { DESIGN, fitDesign } from '../ui/viewport';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { TEX } from '../ui/textures';
import { displayText, glow, monoText } from '../ui/text';

const LEFT = 60;
const TEXT_X = 110;
const ROW_MIN_HEIGHT = 58;
const ROW_GAP = 14;

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.howTo);
  }

  create(): void {
    fitDesign(this, DESIGN.portrait);
    addBackdrop(this, false);
    const s = BALANCE.score;
    glow(this.add.text(GAME_WIDTH / 2, 56, 'HOW TO PLAY', displayText(40)).setOrigin(0.5), COLORS.accent, 18);

    let y = 120;
    const heading = (text: string) => {
      this.add.text(LEFT, y, text, displayText(18, COLORS.accent));
      y += 34;
    };
    const row = (icon: string, tint: number | null, title: string, body: string) => {
      const img = this.add.image(LEFT + 14, y + 14, icon);
      if (tint !== null) img.setTint(tint);
      this.add.text(TEXT_X, y, title, displayText(16));
      const bodyText = this.add.text(TEXT_X, y + 22, body, monoText(15, COLORS.textDim, { wordWrap: { width: GAME_WIDTH - TEXT_X - 40 } }));
      y += Math.max(ROW_MIN_HEIGHT, 22 + bodyText.height + ROW_GAP);
    };

    heading('CONTROLES');
    this.add.text(LEFT, y, 'Flechas o WASD · P / Esc: pausa · M: silencio', monoText(16));
    this.add.text(LEFT, y + 24, 'Móvil: desliza el dedo en cualquier parte de la pantalla.', monoText(16));
    this.add.text(LEFT, y + 48, 'Pulsa la dirección antes del cruce: el giro se guarda.', monoText(16, COLORS.textDim));
    y += 88;

    heading('ENERGÍA');
    row(TEX.shard, null, `CHISPA  +${s.shard}`, 'Recógelas todas para completar el circuito.');
    row(TEX.core, null, `NÚCLEO  +${s.core}`, 'Sobrecarga: los Glitches se vuelven vulnerables y las chispas valen el doble.');
    row(TEX.prism, null, `PRISMA  +${s.prism}`, 'Escondidos en zonas de riesgo. ¿Merece la pena?');

    heading('LOS GLITCHES');
    for (const p of ENEMY_PROFILES) {
      row(TEX.enemy(p.personality), p.color, `${p.name} · ${p.role.toUpperCase()}`, p.description);
    }

    this.add
      .text(GAME_WIDTH / 2, y + 6, `Combo con un mismo núcleo: ${s.enemyCombo.join(' → ')}`, monoText(15, COLORS.gold))
      .setOrigin(0.5);

    const back = new NeonButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'BACK', () => this.scene.start(SCENE_KEYS.menu), {
      width: 220,
      height: 52,
    });
    new MenuNavigator(this, [back], () => this.scene.start(SCENE_KEYS.menu));
  }
}
