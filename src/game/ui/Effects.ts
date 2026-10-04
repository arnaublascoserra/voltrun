import Phaser from 'phaser';
import { settings } from '../services/settings';
import { TEX } from './textures';
import { displayText, glow } from './text';

const FLOAT_TEXT_POOL = 8;
const RING_POOL = 4;

/**
 * Juice: particle bursts, floating score popups, expanding rings and camera
 * shake. Objects are pooled and created once per scene to avoid garbage.
 */
export class Effects {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly rings: Phaser.GameObjects.Image[] = [];
  private nextText = 0;
  private nextRing = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.emitter = scene.add.particles(0, 0, TEX.particle, {
      speed: { min: 60, max: 260 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.emitter.setDepth(30);

    for (let i = 0; i < FLOAT_TEXT_POOL; i++) {
      this.texts.push(scene.add.text(0, 0, '', displayText(20)).setOrigin(0.5).setDepth(40).setVisible(false));
    }
    for (let i = 0; i < RING_POOL; i++) {
      this.rings.push(scene.add.image(0, 0, TEX.ring).setDepth(25).setVisible(false).setBlendMode(Phaser.BlendModes.ADD));
    }
  }

  burst(x: number, y: number, color: number, count = 14): void {
    this.emitter.setParticleTint(color);
    this.emitter.explode(count, x, y);
  }

  floatText(x: number, y: number, text: string, color: string, size = 20): void {
    const t = this.texts[this.nextText];
    this.nextText = (this.nextText + 1) % this.texts.length;
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setFontSize(size).setColor(color).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    glow(t, color, 12);
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      scale: 1,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.setVisible(false),
    });
  }

  ring(x: number, y: number, color: number, maxScale = 6): void {
    const r = this.rings[this.nextRing];
    this.nextRing = (this.nextRing + 1) % this.rings.length;
    this.scene.tweens.killTweensOf(r);
    r.setPosition(x, y).setTint(color).setScale(0.2).setAlpha(0.9).setVisible(true);
    this.scene.tweens.add({
      targets: r,
      scale: maxScale,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => r.setVisible(false),
    });
  }

  shake(durationMs = 250, intensity = 0.008): void {
    if (!settings.get().screenEffects) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  flash(durationMs = 150, r = 255, g = 255, b = 255): void {
    if (!settings.get().screenEffects) return;
    this.scene.cameras.main.flash(durationMs, r, g, b);
  }

  setPaused(paused: boolean): void {
    if (paused) this.emitter.pause();
    else this.emitter.resume();
  }
}
