import { STORAGE_KEYS } from '../config/gameConfig';
import { clamp } from '../utils/math';
import { storage } from './storage';

export interface Settings {
  muted: boolean;
  /** Master volume 0..1. */
  volume: number;
  musicEnabled: boolean;
  /** Screen shake and flashes. */
  screenEffects: boolean;
}

const DEFAULTS: Settings = {
  muted: false,
  volume: 0.7,
  musicEnabled: true,
  screenEffects: true,
};

type Listener = (settings: Readonly<Settings>) => void;

class SettingsStore {
  private current: Settings;
  private readonly listeners = new Set<Listener>();

  constructor() {
    const saved = storage.read<Partial<Settings>>(STORAGE_KEYS.settings, {});
    this.current = { ...DEFAULTS, ...saved };
    this.current.volume = clamp(Number(this.current.volume) || 0, 0, 1);
  }

  get(): Readonly<Settings> {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    this.current.volume = clamp(this.current.volume, 0, 1);
    storage.write(STORAGE_KEYS.settings, this.current);
    for (const l of this.listeners) l(this.current);
  }

  /** Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const settings = new SettingsStore();
