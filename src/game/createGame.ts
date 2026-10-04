import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameConfig';
import { COLORS } from './config/theme';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HighScoresScene } from './scenes/HighScoresScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.backgroundCss,
    scale: {
      // Keeps the aspect ratio and fits any screen (desktop, tablet, phone).
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    fps: { target: 60 },
    // Audio is handled by our own WebAudio synth (systems/AudioSystem).
    audio: { noAudio: true },
    input: { activePointers: 2 },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, MenuScene, HowToPlayScene, HighScoresScene, SettingsScene, GameScene, GameOverScene],
  });
}
