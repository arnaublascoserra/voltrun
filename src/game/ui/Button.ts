import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { audio } from '../systems/AudioSystem';
import { displayText } from './text';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 60;
const RADIUS = 14;

/** Neon button usable with mouse, touch and keyboard (via `MenuNavigator`). */
export class NeonButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly boxW: number;
  private readonly boxH: number;
  private readonly color: number;
  private selected = false;
  onHover: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly onClick: () => void,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.boxW = opts.width ?? DEFAULT_WIDTH;
    this.boxH = opts.height ?? DEFAULT_HEIGHT;
    this.color = opts.color ?? COLORS.panelStroke;

    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, displayText(opts.fontSize ?? 24)).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.boxW, this.boxH);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => this.onHover?.());
    this.on('pointerdown', () => this.setScale(0.97));
    this.on('pointerout', () => this.setScale(1));
    this.on('pointerup', () => {
      this.setScale(1);
      this.activate();
    });

    this.draw();
    scene.add.existing(this);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setSelected(selected: boolean): this {
    if (this.selected !== selected) {
      this.selected = selected;
      this.draw();
    }
    return this;
  }

  activate(): void {
    audio.unlock();
    audio.play('uiSelect');
    this.onClick();
  }

  private draw(): void {
    const g = this.bg;
    const w = this.boxW;
    const h = this.boxH;
    g.clear();
    if (this.selected) {
      g.fillStyle(this.color, 0.18);
      g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, RADIUS + 6);
    }
    g.fillStyle(this.selected ? COLORS.buttonHover : COLORS.buttonFill, 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
    g.lineStyle(this.selected ? 3 : 2, this.selected ? COLORS.accentHex : this.color, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
    this.label.setColor(this.selected ? COLORS.accent : COLORS.text);
  }
}

/**
 * Keyboard navigation (↑/↓/W/S + Enter/Space, Esc/Backspace = back) over a list
 * of buttons. Listens on `window` directly: Phaser's keyboard queue can replay
 * an event when two keys arrive in the same frame, which skipped menu entries.
 */
export class MenuNavigator {
  private index = 0;
  private active = true;

  constructor(
    scene: Phaser.Scene,
    private readonly buttons: NeonButton[],
    private readonly onBack?: () => void,
  ) {
    buttons.forEach((b, i) => (b.onHover = () => this.select(i, false)));
    this.select(0, false);

    window.addEventListener('keydown', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void {
    this.active = false;
    window.removeEventListener('keydown', this.handler);
  }

  private readonly handler = (event: KeyboardEvent): void => {
    if (!this.active) return;
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        this.select((this.index - 1 + this.buttons.length) % this.buttons.length, true);
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        this.select((this.index + 1) % this.buttons.length, true);
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        if (!event.repeat) this.buttons[this.index]?.activate();
        break;
      case 'Escape':
      case 'Backspace':
        if (!event.repeat) this.onBack?.();
        break;
    }
  };

  private select(i: number, withSound: boolean): void {
    if (withSound && i !== this.index) audio.play('uiMove');
    this.index = i;
    this.buttons.forEach((b, j) => b.setSelected(j === i));
  }
}
