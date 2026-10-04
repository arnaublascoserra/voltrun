import { settings } from '../services/settings';
import type { Settings } from '../services/settings';

/**
 * Procedural audio (WebAudio). Every sound is synthesised at runtime, so the
 * game ships with zero audio files. To replace a sound with a real sample
 * later, add a `SampleRecipe` for that id (see `SOUND_BANK`).
 */
export type SoundId =
  | 'shard'
  | 'core'
  | 'prism'
  | 'enemyCaught'
  | 'death'
  | 'levelClear'
  | 'gameOver'
  | 'victory'
  | 'extraLife'
  | 'ready'
  | 'uiMove'
  | 'uiSelect';

export type MusicIntensity = 'normal' | 'power';

type OscType = OscillatorType;

interface ToneOptions {
  freq: number;
  /** Seconds from `at`. */
  start?: number;
  duration: number;
  type?: OscType;
  gain?: number;
  slideTo?: number;
  attack?: number;
}

/** A recipe receives the synth, the start time and an optional variant (e.g. combo level). */
type Recipe = (s: Synth, at: number, variant: number) => void;

const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

class Synth {
  constructor(
    readonly ctx: AudioContext,
    private readonly out: AudioNode,
    private readonly noiseBuffer: AudioBuffer,
  ) {}

  tone(at: number, o: ToneOptions): void {
    const t0 = at + (o.start ?? 0);
    const t1 = t0 + o.duration;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t1);
    const peak = o.gain ?? 0.1;
    const attack = o.attack ?? 0.005;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(amp).connect(this.out);
    osc.start(t0);
    osc.stop(t1 + 0.02);
    osc.onended = () => amp.disconnect();
  }

  noise(at: number, duration: number, gain: number, filterFreq = 4000): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter).connect(amp).connect(this.out);
    src.start(at);
    src.stop(at + duration + 0.02);
    src.onended = () => amp.disconnect();
  }

  arpeggio(at: number, notes: number[], step: number, type: OscType, gain: number): void {
    notes.forEach((n, i) => this.tone(at, { freq: midi(n), start: i * step, duration: step * 1.6, type, gain }));
  }
}

const SOUND_BANK: Record<SoundId, Recipe> = {
  shard: (s, t, v) => s.tone(t, { freq: v % 2 ? 990 : 880, duration: 0.05, type: 'square', gain: 0.045 }),
  core: (s, t) => {
    s.tone(t, { freq: 220, slideTo: 1320, duration: 0.3, type: 'sawtooth', gain: 0.08 });
    s.tone(t, { freq: 1760, start: 0.18, duration: 0.2, type: 'triangle', gain: 0.06 });
  },
  prism: (s, t) => s.arpeggio(t, [84, 88, 91, 96], 0.045, 'triangle', 0.08),
  enemyCaught: (s, t, combo) => {
    const lift = 2 ** (Math.min(combo, 4) / 6);
    s.tone(t, { freq: 1800 * lift, slideTo: 180, duration: 0.28, type: 'square', gain: 0.07 });
    s.noise(t, 0.12, 0.12, 2500);
  },
  death: (s, t) => {
    s.tone(t, { freq: 880, slideTo: 55, duration: 1.1, type: 'sawtooth', gain: 0.09 });
    s.tone(t, { freq: 660, slideTo: 40, duration: 1.1, type: 'square', gain: 0.04, start: 0.05 });
    s.noise(t + 0.9, 0.4, 0.15, 800);
  },
  levelClear: (s, t) => s.arpeggio(t, [69, 72, 76, 81, 84, 88, 93], 0.07, 'square', 0.06),
  gameOver: (s, t) => {
    [64, 62, 60, 57].forEach((n, i) =>
      s.tone(t, { freq: midi(n), start: i * 0.28, duration: 0.42, type: 'triangle', gain: 0.12 }),
    );
    s.tone(t, { freq: midi(45), start: 1.12, duration: 1.0, type: 'sawtooth', gain: 0.06 });
  },
  victory: (s, t) => {
    s.arpeggio(t, [72, 76, 79, 84, 79, 84, 88, 91, 96], 0.09, 'square', 0.06);
    s.tone(t, { freq: midi(60), duration: 1.2, type: 'triangle', gain: 0.1 });
  },
  extraLife: (s, t) => s.arpeggio(t, [88, 91, 96, 100], 0.06, 'square', 0.06),
  ready: (s, t) => {
    s.tone(t, { freq: midi(69), duration: 0.12, type: 'square', gain: 0.06 });
    s.tone(t, { freq: midi(81), start: 0.16, duration: 0.2, type: 'square', gain: 0.06 });
  },
  uiMove: (s, t) => s.tone(t, { freq: 620, duration: 0.03, type: 'square', gain: 0.03 }),
  uiSelect: (s, t) => {
    s.tone(t, { freq: 740, duration: 0.05, type: 'square', gain: 0.05 });
    s.tone(t, { freq: 1110, start: 0.05, duration: 0.08, type: 'square', gain: 0.05 });
  },
};

/** Chord progression for the background loop (Am – F – C – G), midi notes. */
const PROGRESSION: number[][] = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const STEPS_PER_BAR = 16;
const MUSIC_TEMPO: Record<MusicIntensity, number> = { normal: 112, power: 136 };
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;
const MUSIC_LEVEL = 0.55;

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private synth: Synth | null = null;
  private musicSynth: Synth | null = null;

  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private intensity: MusicIntensity = 'normal';
  private shardVariant = 0;

  /** Must be called from a user gesture at least once (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get isReady(): boolean {
    return this.ctx !== null;
  }

  play(id: SoundId, variant = 0): void {
    if (!this.ctx || !this.synth || settings.get().muted) return;
    if (id === 'shard') variant = this.shardVariant++;
    SOUND_BANK[id](this.synth, this.ctx.currentTime + 0.005, variant);
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), SCHEDULER_INTERVAL_MS);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setIntensity(intensity: MusicIntensity): void {
    this.intensity = intensity;
  }

  private init(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    // Gentle limiter so stacked effects never clip.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(compressor).connect(ctx.destination);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.synth = new Synth(ctx, this.sfxBus, noise);
    this.musicSynth = new Synth(ctx, this.musicBus, noise);

    this.applySettings(settings.get());
    settings.subscribe((s) => this.applySettings(s));
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private applySettings(s: Readonly<Settings>): void {
    if (!this.ctx || !this.master || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.volume, now, 0.02);
    this.musicBus.gain.setTargetAtTime(s.musicEnabled ? MUSIC_LEVEL : 0, now, 0.05);
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicSynth) return;
    const stepDur = 60 / MUSIC_TEMPO[this.intensity] / 4;
    // If the tab was throttled, skip ahead instead of firing a burst of notes.
    if (this.nextStepTime < this.ctx.currentTime - 0.2) this.nextStepTime = this.ctx.currentTime + 0.02;
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      this.playStep(this.step, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % (STEPS_PER_BAR * PROGRESSION.length);
    }
  }

  private playStep(step: number, t: number, stepDur: number): void {
    const s = this.musicSynth as Synth;
    const chord = PROGRESSION[Math.floor(step / STEPS_PER_BAR)];
    const inBar = step % STEPS_PER_BAR;
    const power = this.intensity === 'power';

    if (inBar % 4 === 0 || inBar === 6 || inBar === 14) {
      s.tone(t, { freq: midi(chord[0] - 24), duration: stepDur * 1.8, type: 'triangle', gain: 0.16 });
    }
    if (power || inBar % 2 === 0) {
      const note = chord[(inBar >> (power ? 0 : 1)) % chord.length] + (inBar >= 8 ? 12 : 0) + (power ? 12 : 0);
      s.tone(t, { freq: midi(note), duration: stepDur * 0.9, type: 'square', gain: power ? 0.022 : 0.028 });
    }
    if (inBar % 4 === 2) s.noise(t, 0.04, 0.05, 7000);
  }
}

export const audio = new AudioSystem();
