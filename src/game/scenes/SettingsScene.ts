import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { highScores } from '../services/highScores';
import { settings } from '../services/settings';
import { audio } from '../systems/AudioSystem';
import { addBackdrop } from '../ui/Backdrop';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { displayText, glow } from '../ui/text';

const VOLUME_STEP = 0.1;
const START_Y = 220;
const GAP = 84;

const onOff = (v: boolean) => (v ? 'ON' : 'OFF');

export class SettingsScene extends Phaser.Scene {
  private confirmReset = false;

  constructor() {
    super(SCENE_KEYS.settings);
  }

  create(): void {
    this.confirmReset = false;
    addBackdrop(this, false);
    const cx = GAME_WIDTH / 2;
    glow(this.add.text(cx, 90, 'SETTINGS', displayText(40)).setOrigin(0.5), COLORS.accent, 18);

    const opts = { width: 420 };
    const sound = new NeonButton(this, cx, START_Y, '', () => this.toggle('muted'), opts);
    const music = new NeonButton(this, cx, START_Y + GAP, '', () => this.toggle('musicEnabled'), opts);
    const volDown = new NeonButton(this, cx - 150, START_Y + GAP * 2, '−', () => this.changeVolume(-VOLUME_STEP), { width: 90 });
    const volUp = new NeonButton(this, cx + 150, START_Y + GAP * 2, '+', () => this.changeVolume(VOLUME_STEP), { width: 90 });
    const volumeLabel = this.add.text(cx, START_Y + GAP * 2, '', displayText(22)).setOrigin(0.5);
    const effects = new NeonButton(this, cx, START_Y + GAP * 3, '', () => this.toggle('screenEffects'), opts);
    const reset = new NeonButton(this, cx, START_Y + GAP * 4, 'RESET HIGH SCORES', () => this.resetScores(reset), opts);
    const back = new NeonButton(this, cx, GAME_HEIGHT - 90, 'BACK', () => this.scene.start(SCENE_KEYS.menu), { width: 220 });

    const refresh = () => {
      const s = settings.get();
      sound.setText(`SOUND: ${onOff(!s.muted)}`);
      music.setText(`MUSIC: ${onOff(s.musicEnabled)}`);
      volumeLabel.setText(`VOLUME ${Math.round(s.volume * 100)}%`);
      effects.setText(`SCREEN FX: ${onOff(s.screenEffects)}`);
    };
    refresh();
    const unsubscribe = settings.subscribe(refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);

    new MenuNavigator(this, [sound, music, volDown, volUp, effects, reset, back], () => this.scene.start(SCENE_KEYS.menu));
  }

  private toggle(key: 'muted' | 'musicEnabled' | 'screenEffects'): void {
    settings.update({ [key]: !settings.get()[key] });
  }

  private changeVolume(delta: number): void {
    const volume = Math.round((settings.get().volume + delta) * 10) / 10;
    settings.update({ volume, muted: false });
    audio.play('uiMove');
  }

  private resetScores(button: NeonButton): void {
    if (!this.confirmReset) {
      this.confirmReset = true;
      button.setText('PULSA OTRA VEZ PARA BORRAR');
      return;
    }
    highScores.clear();
    this.confirmReset = false;
    button.setText('RÉCORDS BORRADOS');
  }
}
