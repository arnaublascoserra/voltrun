import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LANDSCAPE_WIDTH, MAX_VIEW_STRETCH, RESIZE_DEBOUNCE_MS } from '../config/gameConfig';

export type Orientation = 'portrait' | 'landscape';

export interface DesignSize {
  width: number;
  height: number;
}

export const DESIGN: Readonly<Record<Orientation, DesignSize>> = {
  portrait: { width: GAME_WIDTH, height: GAME_HEIGHT },
  landscape: { width: LANDSCAPE_WIDTH, height: GAME_HEIGHT },
};

/** Phones and tablets: a touch screen without a precise pointer (mouse/trackpad). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
}

/**
 * Layout to use for the game. Touch devices always get the vertical layout;
 * on desktop it follows the window shape (normally landscape).
 */
export function preferredOrientation(width = window.innerWidth, height = window.innerHeight): Orientation {
  if (isTouchDevice()) return 'portrait';
  return width >= height ? 'landscape' : 'portrait';
}

/** A design box that must stay fully visible while it is on screen (the running game). */
let pinnedDesign: DesignSize | null = null;

/**
 * Canvas size with the same aspect ratio as the window that contains every
 * design box that may be shown. Matching the window aspect means Phaser's FIT
 * mode fills the whole screen — no black bars, nothing cut off.
 */
export function computeViewSize(winW: number, winH: number): DesignSize {
  const needed = [DESIGN.portrait, DESIGN[preferredOrientation(winW, winH)]];
  if (pinnedDesign) needed.push(pinnedDesign);
  const needW = Math.max(...needed.map((d) => d.width));
  const needH = Math.max(...needed.map((d) => d.height));

  const aspect = Math.max(winW, 1) / Math.max(winH, 1);
  if (aspect >= needW / needH) {
    return { width: Math.round(Math.min(needH * aspect, needH * MAX_VIEW_STRETCH)), height: needH };
  }
  return { width: needW, height: Math.round(Math.min(needW / aspect, needW * MAX_VIEW_STRETCH)) };
}

let game: Phaser.Game | null = null;

function applyViewSize(): void {
  if (!game) return;
  const { width, height } = computeViewSize(window.innerWidth, window.innerHeight);
  if (width !== game.scale.gameSize.width || height !== game.scale.gameSize.height) {
    game.scale.setGameSize(width, height);
  }
}

/** Keeps the canvas size in sync with the window (resize, rotation, fullscreen). */
export function initViewport(target: Phaser.Game): void {
  game = target;
  let timer: number | undefined;
  const onResize = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(applyViewSize, RESIZE_DEBOUNCE_MS);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  applyViewSize();
}

/** Keeps `design` visible until the scene shuts down (used by the game scene). */
export function pinDesign(scene: Phaser.Scene, design: DesignSize): void {
  pinnedDesign = design;
  applyViewSize();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    pinnedDesign = null;
    // Resize after the scene switch has finished, never in the middle of a shutdown.
    window.setTimeout(applyViewSize, 0);
  });
}

/**
 * Centres the scene's design box in the canvas by scrolling the main camera,
 * so scenes can keep using fixed design coordinates. Re-centres on resize.
 */
export function fitDesign(scene: Phaser.Scene, design: DesignSize): void {
  const centre = () => {
    // A resize can arrive while the scene is shutting down (cameras already gone).
    if (scene.sys.settings.status >= Phaser.Scenes.SHUTDOWN || !scene.cameras?.main) return;
    const cam = scene.cameras.main;
    cam.setSize(scene.scale.width, scene.scale.height);
    cam.setScroll(-(scene.scale.width - design.width) / 2, -(scene.scale.height - design.height) / 2);
  };
  centre();
  scene.scale.on(Phaser.Scale.Events.RESIZE, centre);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, centre));
}

/** Toggles real browser fullscreen when the platform supports it. */
export function toggleFullscreen(): void {
  if (!game || !game.scale.fullscreen.available) return;
  if (game.scale.isFullscreen) game.scale.stopFullscreen();
  else game.scale.startFullscreen();
}

export function fullscreenAvailable(): boolean {
  return !!game && game.scale.fullscreen.available;
}
