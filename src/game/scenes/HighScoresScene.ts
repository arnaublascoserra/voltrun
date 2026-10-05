import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { highScores } from '../services/highScores';
import { addBackdrop } from '../ui/Backdrop';
import { DESIGN, fitDesign } from '../ui/viewport';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { displayText, formatScore, glow, monoText } from '../ui/text';

const TABLE_TOP = 170;
const ROW_HEIGHT = 46;
const COLUMNS = { rank: 90, score: 250, level: 420, date: 560 };

export class HighScoresScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.highScores);
  }

  create(): void {
    fitDesign(this, DESIGN.portrait);
    addBackdrop(this, false);
    glow(this.add.text(GAME_WIDTH / 2, 70, 'HIGH SCORES', displayText(40, COLORS.gold)).setOrigin(0.5), COLORS.gold, 18);

    const header = monoText(14, COLORS.textDim);
    this.add.text(COLUMNS.rank, TABLE_TOP - 40, '#', header).setOrigin(0.5, 0);
    this.add.text(COLUMNS.score, TABLE_TOP - 40, 'SCORE', header).setOrigin(0.5, 0);
    this.add.text(COLUMNS.level, TABLE_TOP - 40, 'LEVEL', header).setOrigin(0.5, 0);
    this.add.text(COLUMNS.date, TABLE_TOP - 40, 'FECHA', header).setOrigin(0.5, 0);

    const entries = highScores.getTop(10);
    if (entries.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, TABLE_TOP + 120, 'Aún no hay récords.\n¡Juega una partida!', monoText(20, COLORS.textDim, { align: 'center' }))
        .setOrigin(0.5);
    }
    entries.forEach((e, i) => {
      const y = TABLE_TOP + i * ROW_HEIGHT;
      const color = i === 0 ? COLORS.gold : COLORS.text;
      this.add.text(COLUMNS.rank, y, String(i + 1), displayText(20, color)).setOrigin(0.5, 0);
      this.add.text(COLUMNS.score, y, formatScore(e.score), displayText(20, color)).setOrigin(0.5, 0);
      this.add.text(COLUMNS.level, y, `${e.level}${e.victory ? ' ★' : ''}`, monoText(20, color)).setOrigin(0.5, 0);
      this.add.text(COLUMNS.date, y, new Date(e.date).toLocaleDateString(), monoText(18, COLORS.textDim)).setOrigin(0.5, 0);
    });

    const stats = highScores.getCareerStats();
    if (stats.gamesPlayed > 0) {
      const minutes = Math.round(stats.timePlayed / 60);
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 150,
          `Partidas ${stats.gamesPlayed} · Glitches atrapados ${stats.enemiesCaught} · Mejor nivel ${stats.bestLevel} · ${minutes} min`,
          monoText(15, COLORS.textDim, { align: 'center', wordWrap: { width: GAME_WIDTH - 80 } }),
        )
        .setOrigin(0.5);
    }

    const back = new NeonButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 70, 'BACK', () => this.scene.start(SCENE_KEYS.menu), {
      width: 220,
      height: 52,
    });
    new MenuNavigator(this, [back], () => this.scene.start(SCENE_KEYS.menu));
  }
}
