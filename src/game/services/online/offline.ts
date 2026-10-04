import { seedForDate } from '../../utils/random';
import { highScores } from '../highScores';
import type { DailyChallenge, LeaderboardEntry, OnlineServices } from './types';

const LOCAL_USER_ID = 'local';
const LOCAL_NAME = 'TÚ';

/**
 * Offline implementation of the online contracts. The leaderboard is backed
 * by the local high-score table; auth/profile features report themselves as
 * unavailable so the UI can hide them.
 */
export function createOfflineServices(): OnlineServices {
  return {
    auth: {
      isAvailable: false,
      getCurrentUser: async () => null,
      signInWithEmail: async () => {
        throw new Error('Online accounts are not enabled yet');
      },
      signOut: async () => {},
    },

    leaderboard: {
      isAvailable: false,
      // The local table is written by the game-over flow, nothing to sync.
      submit: async () => {},
      getTop: async (_scope, limit): Promise<LeaderboardEntry[]> =>
        highScores.getTop(limit).map((e, i) => ({
          rank: i + 1,
          userId: LOCAL_USER_ID,
          displayName: LOCAL_NAME,
          score: e.score,
          level: e.level,
          submittedAt: e.date,
        })),
    },

    profiles: {
      getProfile: async () => null,
      updateDisplayName: async () => {},
    },

    daily: {
      getToday: async (): Promise<DailyChallenge> => {
        const now = new Date();
        return {
          date: now.toISOString().slice(0, 10),
          seed: seedForDate(now),
          startLevel: 1,
          modifier: null,
        };
      },
    },
  };
}
