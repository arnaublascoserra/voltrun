import { createOfflineServices } from './offline';
import type { OnlineServices } from './types';

let instance: OnlineServices | null = null;

/**
 * Single entry point for online features. When a backend is added, decide
 * here which implementation to return (e.g. based on
 * `import.meta.env.VITE_SUPABASE_URL`).
 */
export function getOnlineServices(): OnlineServices {
  instance ??= createOfflineServices();
  return instance;
}

export type * from './types';
