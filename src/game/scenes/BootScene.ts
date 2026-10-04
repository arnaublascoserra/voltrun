import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/gameConfig';
import { audio } from '../systems/AudioSystem';
import { generateTextures } from '../ui/textures';

/** Generates every procedural asset, then hands over to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    generateTextures(this);

    // Browsers only allow audio after a user gesture.
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    this.scene.start(SCENE_KEYS.menu);
  }
}
