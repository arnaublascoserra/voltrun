import { BALANCE } from '../config/balance';

export interface RunStats {
  shards: number;
  cores: number;
  prisms: number;
  enemiesCaught: number;
  bestCombo: number;
  deaths: number;
  levelsCleared: number;
  /** Seconds of actual gameplay. */
  timePlayed: number;
}

export type GameMode = 'classic' | 'daily';

export interface GameResult {
  score: number;
  highScore: number;
  level: number;
  isNewRecord: boolean;
  victory: boolean;
  mode: GameMode;
  seed: number;
  stats: RunStats;
}

/**
 * State that persists across levels during one run: score, lives, level and
 * statistics. Pure logic, no Phaser.
 */
export class GameSession {
  score = 0;
  lives: number = BALANCE.lives.start;
  level: number;
  readonly startingHighScore: number;
  readonly stats: RunStats = {
    shards: 0,
    cores: 0,
    prisms: 0,
    enemiesCaught: 0,
    bestCombo: 0,
    deaths: 0,
    levelsCleared: 0,
    timePlayed: 0,
  };
  private nextExtraLifeAt: number;

  constructor(
    highScore: number,
    startLevel = 1,
    readonly mode: GameMode = 'classic',
    readonly seed: number = Date.now() >>> 0,
  ) {
    this.startingHighScore = highScore;
    this.level = startLevel;
    this.nextExtraLifeAt = BALANCE.lives.extraLifeEvery || Infinity;
  }

  get highScore(): number {
    return Math.max(this.score, this.startingHighScore);
  }

  /** Adds points. Returns true if an extra life was awarded. */
  addScore(points: number): boolean {
    this.score += points;
    if (this.score < this.nextExtraLifeAt) return false;
    this.nextExtraLifeAt += BALANCE.lives.extraLifeEvery;
    if (this.lives >= BALANCE.lives.max) return false;
    this.lives++;
    return true;
  }

  /** Returns true while the run can continue. */
  loseLife(): boolean {
    this.lives = Math.max(0, this.lives - 1);
    this.stats.deaths++;
    return this.lives > 0;
  }

  levelClearBonus(): number {
    const s = BALANCE.score;
    return s.levelClearBase + s.levelClearPerLevel * (this.level - 1) + s.levelClearPerLife * this.lives;
  }

  /** Advances to the next level. Returns false if the final level was cleared. */
  nextLevel(): boolean {
    this.stats.levelsCleared++;
    if (this.level >= BALANCE.maxLevel) return false;
    this.level++;
    return true;
  }

  result(victory: boolean): GameResult {
    return {
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      isNewRecord: this.score > this.startingHighScore && this.score > 0,
      victory,
      mode: this.mode,
      seed: this.seed,
      stats: { ...this.stats },
    };
  }
}
