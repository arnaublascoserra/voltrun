/**
 * Display / layout constants. Gameplay balance lives in `balance.ts` and
 * `difficulty.ts`; this file only describes the canvas and screen layout.
 *
 * Scenes are laid out inside a fixed "design box" that is centred in the
 * canvas; the canvas itself grows to match the window's aspect ratio so the
 * background always fills the screen (see `ui/viewport.ts`).
 */
/** Portrait design box: menus everywhere, and the game on phones / tall windows. */
export const GAME_WIDTH = 672;
export const GAME_HEIGHT = 960;
/** Landscape design box: the game on desktop (maze in the centre, HUD in side panels). */
export const LANDSCAPE_WIDTH = 1400;

/** Widest / tallest canvas aspect we stretch to before letterboxing. */
export const MAX_VIEW_STRETCH = 2.4;
/** Debounce for window resize handling (ms). */
export const RESIZE_DEBOUNCE_MS = 120;

/** Reference tile size the procedural textures are drawn at. */
export const BASE_TILE = 32;

export const LAYOUT = {
  /** Portrait: HUD bar above the maze and footer below it. */
  hudHeight: 96,
  footerHeight: 56,
  /** Horizontal margin inside the maze area. */
  mazeMarginX: 0,
  /** Landscape: width of each side panel and margin around the maze. */
  sidePanelWidth: 320,
  landscapeMazeMarginY: 24,
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
