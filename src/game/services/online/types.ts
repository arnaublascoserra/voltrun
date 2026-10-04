/**
 * PHASE 3 — online contracts.
 *
 * These interfaces describe the online features planned for later (accounts,
 * world/weekly rankings, profiles, stats, daily runs, challenges). Nothing in
 * the game depends on a backend yet: `offline.ts` provides local
 * implementations. A future `supabase.ts` only has to implement these same
 * interfaces and be returned from `createOnlineServices()`.
 */
import type { GameResult } from '../../systems/GameSession';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarSeed: string;
  createdAt: string;
  country?: string;
}

export type LeaderboardScope = 'global' | 'weekly' | 'daily';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  level: number;
  submittedAt: string;
}

export interface DailyChallenge {
  /** YYYY-MM-DD (UTC). */
  date: string;
  /** Seed for the deterministic RNG so everybody plays the same run. */
  seed: number;
  startLevel: number;
  /** Optional twist, e.g. "no cores", "double speed". */
  modifier: string | null;
}

export interface AuthService {
  readonly isAvailable: boolean;
  getCurrentUser(): Promise<UserProfile | null>;
  signInWithEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface LeaderboardService {
  readonly isAvailable: boolean;
  submit(result: GameResult): Promise<void>;
  getTop(scope: LeaderboardScope, limit: number): Promise<LeaderboardEntry[]>;
}

export interface ProfileService {
  getProfile(userId: string): Promise<UserProfile | null>;
  updateDisplayName(name: string): Promise<void>;
}

export interface DailyChallengeService {
  getToday(): Promise<DailyChallenge>;
}

export interface OnlineServices {
  auth: AuthService;
  leaderboard: LeaderboardService;
  profiles: ProfileService;
  daily: DailyChallengeService;
}
