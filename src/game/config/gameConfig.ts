/**
 * Display / layout constants. Gameplay balance lives in `balance.ts` and
 * `difficulty.ts`; this file only describes the canvas and screen layout.
 */
export const GAME_WIDTH = 672;
export const GAME_HEIGHT = 960;

/** Reference tile size the procedural textures are drawn at. */
export const BASE_TILE = 32;

export const LAYOUT = {
  hudHeight: 96,
  footerHeight: 56,
  /** Horizontal margin inside the maze area. */
  mazeMarginX: 0,
} as const;

/** Upper bound for a single simulation step (prevents tunnelling after a tab switch). */
export const MAX_FRAME_DT_SEC = 0.05;

export const SCENE_KEYS = {
  boot: 'BootScene',
  menu: 'MenuScene',
  howTo: 'HowToPlayScene',
  highScores: 'HighScoresScene',
  settings: 'SettingsScene',
  game: 'GameScene',
  gameOver: 'GameOverScene',
} as const;

export const STORAGE_KEYS = {
  settings: 'voltrun.settings.v1',
  highScores: 'voltrun.highscores.v1',
  stats: 'voltrun.stats.v1',
} as const;

/** Touch swipe tuning (CSS pixels). */
export const TOUCH = {
  swipeThresholdPx: 22,
} as const;
