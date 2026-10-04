/**
 * localStorage wrapper that never throws (private mode, blocked storage,
 * quota errors, corrupted JSON…). The game must work without persistence.
 */
export const storage = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  write(key: string, value: unknown): void {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable: settings and scores simply won't persist.
    }
  },

  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};
