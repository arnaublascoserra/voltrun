/** Visual identity: dark neon arcade. Every colour used by the game lives here. */
export const COLORS = {
  background: 0x05060f,
  backgroundCss: '#05060f',
  gridLine: 0x10173a,
  wall: 0x2f6bff,
  wallGlow: 0x2f6bff,
  wallFill: 0x080c22,
  door: 0xff3df2,
  tunnel: 0x0d1433,

  player: 0x39ffb0,
  playerCore: 0xeafff6,
  shard: 0x9ffcff,
  core: 0xffffff,
  coreGlow: 0x39ffb0,
  prism: 0xffd23d,

  vulnerable: 0x3a46ff,
  vulnerableFlash: 0xe9ecff,
  eyeWhite: 0xffffff,
  eyePupil: 0x05060f,

  text: '#e8ecff',
  textDim: '#7d86b5',
  accent: '#39ffb0',
  accentHex: 0x39ffb0,
  danger: '#ff3d6e',
  gold: '#ffd23d',
  panel: 0x0b1030,
  panelStroke: 0x2f6bff,
  buttonFill: 0x0d1440,
  buttonHover: 0x16206a,
} as const;

export const FONTS = {
  display: '"Orbitron", "Segoe UI", sans-serif',
  mono: '"Share Tech Mono", "Consolas", monospace',
} as const;
