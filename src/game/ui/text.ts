import type Phaser from 'phaser';
import { COLORS, FONTS } from '../config/theme';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function displayText(size: number, color: string = COLORS.text, extra: TextStyle = {}): TextStyle {
  return { fontFamily: FONTS.display, fontSize: `${size}px`, color, fontStyle: '700', ...extra };
}

export function monoText(size: number, color: string = COLORS.text, extra: TextStyle = {}): TextStyle {
  return { fontFamily: FONTS.mono, fontSize: `${size}px`, color, ...extra };
}

/** Neon glow via text shadow (rendered once into the text texture, so it is cheap). */
export function glow(text: Phaser.GameObjects.Text, color: string, blur = 16): Phaser.GameObjects.Text {
  // Padding keeps the blurred shadow from being clipped by the text texture bounds.
  return text.setPadding(blur, blur, blur, blur).setShadow(0, 0, color, blur, true, true);
}

export function formatScore(value: number): string {
  return value.toString().padStart(6, '0');
}
