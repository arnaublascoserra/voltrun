import { TOUCH } from '../config/gameConfig';
import type { MoveDir } from '../core/types';

export interface InputHandlers {
  onDirection(dir: MoveDir): void;
  onPause(): void;
  onToggleMute(): void;
}

const KEY_DIRS: Record<string, MoveDir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/**
 * Keyboard (arrows / WASD) and touch swipes → direction requests.
 *
 * Swipes are detected on the whole window (not just the canvas) and are
 * continuous: after a swipe is recognised the origin resets, so the player can
 * chain turns without lifting the finger. Every listener is removed in
 * `destroy()` to avoid leaks across scene restarts.
 */
export class InputController {
  /** Directions currently held, most recent last. */
  private readonly held: MoveDir[] = [];
  private touchId: number | null = null;
  private touchX = 0;
  private touchY = 0;

  constructor(private readonly handlers: InputHandlers) {
    // DOM listeners instead of Phaser's keyboard queue (see MenuNavigator for why).
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    window.addEventListener('blur', this.clearHeld);
  }

  /** Re-sends the held key every frame so the input buffer never expires while a key is down. */
  update(): void {
    const dir = this.held[this.held.length - 1];
    if (dir) this.handlers.onDirection(dir);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('blur', this.clearHeld);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const dir = KEY_DIRS[event.code];
    if (dir) {
      event.preventDefault();
      if (!this.held.includes(dir)) this.held.push(dir);
      this.handlers.onDirection(dir);
      return;
    }
    if (event.repeat) return;
    if (event.code === 'Escape' || event.code === 'KeyP') this.handlers.onPause();
    else if (event.code === 'KeyM') this.handlers.onToggleMute();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const dir = KEY_DIRS[event.code];
    if (!dir) return;
    const i = this.held.indexOf(dir);
    if (i >= 0) this.held.splice(i, 1);
  };

  private readonly clearHeld = (): void => {
    this.held.length = 0;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    this.touchId = e.pointerId;
    this.touchX = e.clientX;
    this.touchY = e.clientY;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.touchId) return;
    const dx = e.clientX - this.touchX;
    const dy = e.clientY - this.touchY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TOUCH.swipeThresholdPx) return;
    const dir: MoveDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.handlers.onDirection(dir);
    this.touchX = e.clientX;
    this.touchY = e.clientY;
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.touchId) this.touchId = null;
  };
}
