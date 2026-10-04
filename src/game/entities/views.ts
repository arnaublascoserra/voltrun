import type Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS } from '../config/theme';
import { moverPosition } from '../core/GridMover';
import { DIR_VECTORS, dirAngle } from '../core/direction';
import type { MazeLayout } from '../ui/MazeLayout';
import { TEX } from '../ui/textures';
import type { Enemy } from './Enemy';
import type { Player } from './Player';

const SQUASH_SPEED = 0.025;
const SQUASH_AMOUNT = 0.12;
const HOME_BOB_SPEED = 0.006;
const HOME_BOB_PX = 3;
const EYE_SPACING = 5.5;
const EYE_Y = -2;
const PUPIL_OFFSET = 1.6;

/** Renders the player from the pure `Player` state. */
export class PlayerView {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly pos = { x: 0, y: 0 };
  private dying = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: MazeLayout,
  ) {
    this.sprite = scene.add.image(0, 0, TEX.player).setDepth(20);
  }

  sync(player: Player, time: number, powered: boolean): void {
    if (this.dying) return;
    const p = moverPosition(player.mover, this.pos);
    const s = this.layout.scale;
    this.sprite.setPosition(this.layout.x(p.x), this.layout.y(p.y));
    this.sprite.setRotation(dirAngle(player.facing));
    const squash = player.mover.moving ? Math.abs(Math.sin(time * SQUASH_SPEED)) * SQUASH_AMOUNT : 0;
    const pulse = powered ? 1.08 + Math.sin(time * 0.02) * 0.05 : 1;
    this.sprite.setScale(s * pulse * (1 - squash), s * pulse * (1 + squash * 0.5));
  }

  playDeath(duration: number): void {
    this.dying = true;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: this.sprite.angle + 540,
      scale: 0,
      alpha: 0.2,
      duration: duration * 1000 * 0.6,
      ease: 'Cubic.easeIn',
    });
  }

  reset(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.dying = false;
    this.sprite.setAlpha(1).setScale(this.layout.scale).setVisible(true);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}

/** Renders one enemy (body + eyes) from the pure `Enemy` state. */
export class EnemyView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly pupils: Phaser.GameObjects.Image[];
  private readonly pos = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    private readonly layout: MazeLayout,
    private readonly enemy: Enemy,
  ) {
    this.body = scene.add.image(0, 0, TEX.enemy(enemy.profile.personality));
    const eyes = [-1, 1].map((side) => scene.add.image(side * EYE_SPACING, EYE_Y, TEX.eyeWhite));
    this.pupils = [-1, 1].map((side) => scene.add.image(side * EYE_SPACING, EYE_Y, TEX.pupil));
    this.container = scene.add.container(0, 0, [this.body, ...eyes, ...this.pupils]).setDepth(15);
    this.container.setScale(layout.scale);
  }

  sync(time: number, powerTimer: number, visible: boolean): void {
    const e = this.enemy;
    this.container.setVisible(visible);
    if (!visible) return;

    const p = moverPosition(e.mover, this.pos);
    const bob = e.state === 'HOME' ? Math.sin(time * HOME_BOB_SPEED + e.index) * HOME_BOB_PX : 0;
    this.container.setPosition(this.layout.x(p.x), this.layout.y(p.y) + bob);

    switch (e.state) {
      case 'RETURNING':
        this.body.setVisible(false);
        break;
      case 'VULNERABLE': {
        this.body.setVisible(true);
        const warn = powerTimer < BALANCE.enemy.flashWarningSec;
        const flashOn = warn && Math.floor(time / 1000 / BALANCE.enemy.flashIntervalSec) % 2 === 0;
        this.body.setTint(flashOn ? COLORS.vulnerableFlash : COLORS.vulnerable);
        this.body.setAlpha(0.85 + Math.sin(time * 0.03) * 0.15);
        break;
      }
      default:
        this.body.setVisible(true).setAlpha(1).setTint(e.profile.color);
        // FLUX glitches visibly while it is drifting erratically.
        if (e.profile.personality === 'wildcard' && !e.wildcardChasing && e.state === 'CHASE') {
          this.body.setAlpha(Math.random() < 0.15 ? 0.4 : 1);
        }
    }

    const v = DIR_VECTORS[e.mover.dir];
    const scared = e.state === 'VULNERABLE';
    this.pupils.forEach((pupil, i) => {
      const side = i === 0 ? -1 : 1;
      pupil.setPosition(side * EYE_SPACING + (scared ? 0 : v.x * PUPIL_OFFSET), EYE_Y + (scared ? 1.5 : v.y * PUPIL_OFFSET));
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
