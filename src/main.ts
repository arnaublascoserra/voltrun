import './style.css';
import { createGame } from './game/createGame';
import { FONTS } from './game/config/theme';
import { audio } from './game/systems/AudioSystem';

const FONT_TIMEOUT_MS = 2500;

/** Waits for the web fonts so Phaser rasterises text with them (falls back after a timeout). */
async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const fonts = [`900 32px ${FONTS.display}`, `700 32px ${FONTS.display}`, `16px ${FONTS.mono}`];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))).then(() => undefined), timeout]).catch(() => undefined);
}

void loadFonts().then(() => {
  const game = createGame('game');
  // Dev-only hook for debugging and automated checks from the browser console.
  if (import.meta.env.DEV) Object.assign(window, { __voltrunGame: game, __voltrunAudio: audio });
});
