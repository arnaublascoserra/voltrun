import Phaser from 'phaser';
import { COLORS } from './config/theme';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HighScoresScene } from './scenes/HighScoresScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { computeViewSize } from './ui/viewport';

export function createGame(parent: string): Phaser.Game {
  // Canvas matches the window's aspect ratio; scenes centre their design box in it.
  const view = computeViewSize(window.innerWidth, window.innerHeight);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: view.width,
    height: view.height,
    backgroundColor: COLORS.backgroundCss,
    scale: {
      // Scales the canvas to the window keeping its aspect ratio; Phaser alone centres it.
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
