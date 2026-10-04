import { STORAGE_KEYS } from '../config/gameConfig';
import type { GameMode, GameResult, RunStats } from '../systems/GameSession';
import { storage } from './storage';

export interface HighScoreEntry {
  score: number;
  level: number;
  mode: GameMode;
  /** ISO date string. */
  date: string;
  victory: boolean;
}

/**
 * Persistence contract for scores. The local implementation is used today;
 * an online implementation (e.g. Supabase) can be swapped in later without
 * touching the scenes. See `services/online`.
 */
export interface HighScoreRepository {
  getBest(): number;
  getTop(limit?: number): HighScoreEntry[];
  /** Stores a result and returns its rank (1-based) or null if it did not make the table. */
  submit(result: GameResult): number | null;
  clear(): void;
}

export interface CareerStats extends RunStats {
  gamesPlayed: number;
  bestLevel: number;
  totalScore: number;
}

const MAX_ENTRIES = 10;

export class LocalHighScoreRepository implements HighScoreRepository {
  getBest(): number {
    return this.getTop(1)[0]?.score ?? 0;
  }

  getTop(limit = MAX_ENTRIES): HighScoreEntry[] {
    const list = storage.read<HighScoreEntry[]>(STORAGE_KEYS.highScores, []);
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => typeof e?.score === 'number' && Number.isFinite(e.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  submit(result: GameResult): number | null {
    this.recordStats(result);
    if (result.score <= 0) return null;
    const entry: HighScoreEntry = {
      score: result.score,
      level: result.level,
      mode: result.mode,
      date: new Date().toISOString(),
      victory: result.victory,
    };
    const list = [...this.getTop(MAX_ENTRIES), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    storage.write(STORAGE_KEYS.highScores, list);
    const rank = list.indexOf(entry);
    return rank >= 0 ? rank + 1 : null;
  }

  clear(): void {
    storage.remove(STORAGE_KEYS.highScores);
    storage.remove(STORAGE_KEYS.stats);
  }

  getCareerStats(): CareerStats {
    return storage.read<CareerStats>(STORAGE_KEYS.stats, {
      gamesPlayed: 0,
      bestLevel: 0,
      totalScore: 0,
      shards: 0,
      cores: 0,
      prisms: 0,
      enemiesCaught: 0,
      bestCombo: 0,
      deaths: 0,
      levelsCleared: 0,
      timePlayed: 0,
    });
  }

  private recordStats(result: GameResult): void {
    const s = this.getCareerStats();
    const r = result.stats;
    storage.write(STORAGE_KEYS.stats, {
      gamesPlayed: s.gamesPlayed + 1,
      bestLevel: Math.max(s.bestLevel, result.level),
      totalScore: s.totalScore + result.score,
      shards: s.shards + r.shards,
      cores: s.cores + r.cores,
      prisms: s.prisms + r.prisms,
      enemiesCaught: s.enemiesCaught + r.enemiesCaught,
      bestCombo: Math.max(s.bestCombo, r.bestCombo),
      deaths: s.deaths + r.deaths,
      levelsCleared: s.levelsCleared + r.levelsCleared,
      timePlayed: s.timePlayed + r.timePlayed,
    } satisfies CareerStats);
  }
}

export const highScores = new LocalHighScoreRepository();
