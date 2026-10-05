import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { getLevelParams } from '../config/difficulty';
import { LAYOUT, MAX_FRAME_DT_SEC, SCENE_KEYS } from '../config/gameConfig';
import { COLORS } from '../config/theme';
import { EnemyView, PlayerView } from '../entities/views';
import { getMap } from '../maps';
import { highScores } from '../services/highScores';
import { getOnlineServices } from '../services/online';
import { settings } from '../services/settings';
import { audio } from '../systems/AudioSystem';
import { GameSession } from '../systems/GameSession';
import type { GameMode } from '../systems/GameSession';
import { GameWorld } from '../systems/GameWorld';
import type { WorldEvent } from '../systems/GameWorld';
import { InputController } from '../systems/InputController';
import { MenuNavigator, NeonButton } from '../ui/Button';
import { Effects } from '../ui/Effects';
import { Hud } from '../ui/Hud';
import { MazeLayout } from '../ui/MazeLayout';
import { renderMaze } from '../ui/MazeRenderer';
import { TEX } from '../ui/textures';
import { addGridBackground } from '../ui/Backdrop';
import { DESIGN, fitDesign, fullscreenAvailable, pinDesign, preferredOrientation, toggleFullscreen } from '../ui/viewport';
import type { DesignSize, Orientation } from '../ui/viewport';
import type { Rect } from '../ui/MazeLayout';
import { displayText, glow, monoText } from '../ui/text';
import { SeededRandom } from '../utils/random';

type Phase = 'ready' | 'playing' | 'dying' | 'cleared' | 'over';

export interface GameSceneData {
  level?: number;
  mode?: GameMode;
  seed?: number;
}

const MAZE_TEXTURE_KEY = 'maze-current';
const BANNER_ROWS_BELOW_EXIT = 5.4;
/** Large enough to cover any canvas size around the design box. */
const PAUSE_SHADE_SIZE = 8000;
const CORE_PULSE_MS = 520;
const CLEAR_FLASH_INTERVAL_SEC = 0.22;
const GAME_OVER_DELAY_MS = 1600;
const PICKUP_COLORS = { shard: COLORS.shard, core: COLORS.coreGlow, prism: COLORS.prism } as const;

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private world!: GameWorld;
  private rng!: SeededRandom;
  private layout!: MazeLayout;
  private hud!: Hud;
  private fx!: Effects;
  private controls!: InputController;

  private mazeImage: Phaser.GameObjects.Image | null = null;
  private pickupSprites: (Phaser.GameObjects.Image | null)[] = [];
  private playerView: PlayerView | null = null;
  private enemyViews: EnemyView[] = [];
  private banner!: Phaser.GameObjects.Text;
  private subBanner!: Phaser.GameObjects.Text;

  private phase: Phase = 'ready';
  private phaseTimer = 0;
  private flashTimer = 0;
  private continueAfterDeath = true;
  private paused = false;
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private pauseNav: MenuNavigator | null = null;
  private startData: GameSceneData = {};
  private orientation: Orientation = 'portrait';
  private design: DesignSize = DESIGN.portrait;

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data: GameSceneData): void {
    this.startData = data ?? {};
    const params = new URLSearchParams(window.location.search);
    // Dev-only shortcuts: ?level=5&seed=123
    const devLevel = import.meta.env.DEV ? Number(params.get('level')) || undefined : undefined;
    const devSeed = import.meta.env.DEV ? Number(params.get('seed')) || undefined : undefined;
    const seed = data?.seed ?? devSeed ?? Date.now() >>> 0;

    this.rng = new SeededRandom(seed);
    this.session = new GameSession(highScores.getBest(), data?.level ?? devLevel ?? 1, data?.mode ?? 'classic', seed);
    this.mazeImage = null;
    this.pickupSprites = [];
    this.playerView = null;
    this.enemyViews = [];
    this.paused = false;
    this.pauseLayer = null;
    this.pauseNav = null;
  }

  create(): void {
    // Phones always play in portrait; desktop gets the wide layout.
    this.orientation = preferredOrientation();
    this.design = DESIGN[this.orientation];
    pinDesign(this, this.design);
    fitDesign(this, this.design);
    this.cameras.main.setBackgroundColor(COLORS.background);
    addGridBackground(this, 0.35);

    this.hud = new Hud(this, this.orientation, {
      onPause: () => this.togglePause(),
      onToggleMute: () => this.toggleMute(),
      onToggleFullscreen: fullscreenAvailable() ? () => toggleFullscreen() : undefined,
    });
    this.hud.setMuted(settings.get().muted);
    this.fx = new Effects(this);
    this.controls = new InputController({
      onDirection: (dir) => {
        if (this.phase === 'playing' || this.phase === 'ready') this.world.player.requestDirection(dir);
      },
      onPause: () => this.togglePause(),
      onToggleMute: () => this.toggleMute(),
    });

    this.banner = glow(this.add.text(0, 0, '', displayText(40, COLORS.gold)).setOrigin(0.5).setDepth(50), COLORS.gold, 18);
    this.subBanner = this.add.text(0, 0, '', monoText(18, COLORS.text)).setOrigin(0.5).setDepth(50);

    const unsubscribe = settings.subscribe((s) => this.hud.setMuted(s.muted));
    const onBlur = () => {
      if (!this.paused && this.phase !== 'over') this.togglePause();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, onBlur);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      unsubscribe();
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onBlur);
      audio.stopMusic();
      audio.setIntensity('normal');
      this.clearLevel();
    });

    if (import.meta.env.DEV) (window as unknown as { __voltrun?: unknown }).__voltrun = this;

    this.buildLevel();
  }

  override update(time: number, delta: number): void {
    if (this.paused) return;
    const dt = Math.min(delta / 1000, MAX_FRAME_DT_SEC);
    this.controls.update();

    switch (this.phase) {
      case 'ready':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.startPlaying();
        break;
      case 'playing':
        this.session.stats.timePlayed += dt;
        this.world.update(dt);
        this.handleEvents(this.world.drainEvents());
        break;
      case 'dying':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.afterDeath();
        break;
      case 'cleared':
        this.updateClearFlash(dt);
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.advanceLevel();
        break;
      case 'over':
        break;
    }

    this.syncViews(time);
  }

  // ───────────────────────────── level lifecycle ─────────────────────────────

  private buildLevel(): void {
    this.clearLevel();
    const params = getLevelParams(this.session.level);
    const map = getMap(params.mapId);
    this.world = new GameWorld(map, params, this.rng);

    this.layout = new MazeLayout(map.cols, map.rows, this.mazeArea());
    this.mazeImage = renderMaze(this, this.world.grid, this.layout, MAZE_TEXTURE_KEY).setDepth(1);

    this.pickupSprites = new Array<Phaser.GameObjects.Image | null>(map.cols * map.rows).fill(null);
    for (const p of map.pickups) {
      const key = p.kind === 'shard' ? TEX.shard : p.kind === 'core' ? TEX.core : TEX.prism;
      const sprite = this.add.image(this.layout.x(p.x), this.layout.y(p.y), key).setScale(this.layout.scale).setDepth(5);
      if (p.kind !== 'shard') {
        this.tweens.add({
          targets: sprite,
          scale: this.layout.scale * 1.25,
          duration: CORE_PULSE_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.pickupSprites[p.y * map.cols + p.x] = sprite;
    }

    this.playerView = new PlayerView(this, this.layout);
    this.enemyViews = this.world.enemies.map((e) => new EnemyView(this, this.layout, e));

    const bannerX = this.layout.x(map.penExit.x);
    // Just below the enemy home, where every map has open corridor space.
    const bannerY = this.layout.y(map.penExit.y + BANNER_ROWS_BELOW_EXIT);
    this.banner.setPosition(bannerX, bannerY);
    this.subBanner.setPosition(bannerX, bannerY + 40);

    this.hud.setLevel(this.session.level);
    this.hud.setMapName(map.name);
    this.enterReady(BALANCE.timing.readySec, `NIVEL ${this.session.level}`, map.name);
  }

  /** Where the maze goes inside the design box for the current layout. */
  private mazeArea(): Rect {
    const { width, height } = this.design;
    if (this.orientation === 'landscape') {
      return {
        x: LAYOUT.sidePanelWidth,
        y: LAYOUT.landscapeMazeMarginY,
        width: width - LAYOUT.sidePanelWidth * 2,
        height: height - LAYOUT.landscapeMazeMarginY * 2,
      };
    }
    return {
      x: LAYOUT.mazeMarginX,
      y: LAYOUT.hudHeight,
      width: width - LAYOUT.mazeMarginX * 2,
      height: height - LAYOUT.hudHeight - LAYOUT.footerHeight,
    };
  }

  private clearLevel(): void {
    for (const sprite of this.pickupSprites) {
      if (!sprite) continue;
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.pickupSprites = [];
    this.playerView?.destroy();
    this.playerView = null;
    this.enemyViews.forEach((v) => v.destroy());
    this.enemyViews = [];
    this.mazeImage?.destroy();
    this.mazeImage = null;
  }

  private enterReady(seconds: number, title: string, subtitle = ''): void {
    this.phase = 'ready';
    this.phaseTimer = seconds;
    this.banner.setText(title).setVisible(true);
    this.subBanner.setText(subtitle || 'READY!').setVisible(true);
    audio.play('ready');
  }

  private startPlaying(): void {
    this.phase = 'playing';
    this.banner.setVisible(false);
    this.subBanner.setVisible(false);
    audio.setIntensity(this.world.powerActive ? 'power' : 'normal');
    audio.startMusic();
  }

  private afterDeath(): void {
    if (!this.continueAfterDeath) {
      this.endRun(false);
      return;
    }
    this.world.resetActors();
    this.playerView?.reset();
    this.enterReady(BALANCE.timing.readyAfterDeathSec, 'READY!', `${this.session.lives} ${this.session.lives === 1 ? 'VIDA' : 'VIDAS'}`);
  }

  private advanceLevel(): void {
    this.mazeImage?.clearTint();
    if (this.session.nextLevel()) {
      audio.play('ready');
      this.buildLevel();
    } else {
      this.endRun(true);
    }
  }

  private endRun(victory: boolean): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    audio.stopMusic();
    audio.setIntensity('normal');
    audio.play(victory ? 'victory' : 'gameOver');

    const result = this.session.result(victory);
    highScores.submit(result);
    void getOnlineServices().leaderboard.submit(result).catch(() => {});

    this.banner.setText(victory ? 'SYSTEM CLEAR' : 'GAME OVER').setColor(victory ? COLORS.accent : COLORS.danger).setVisible(true);
    this.subBanner.setVisible(false);
    this.time.delayedCall(GAME_OVER_DELAY_MS, () => this.scene.start(SCENE_KEYS.gameOver, result));
  }

  // ───────────────────────────── world events ─────────────────────────────

  private handleEvents(events: WorldEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'pickup':
          this.onPickup(e.kind, e.x, e.y, e.points);
          break;
        case 'powerStart':
          audio.setIntensity('power');
          this.fx.ring(this.playerX(), this.playerY(), COLORS.coreGlow, 8);
          this.fx.flash(120, 57, 255, 176);
          break;
        case 'powerEnd':
          audio.setIntensity('normal');
          break;
        case 'enemyCaught': {
          this.addScore(e.points);
          this.session.stats.enemiesCaught++;
          this.session.stats.bestCombo = Math.max(this.session.stats.bestCombo, e.combo);
          const enemy = this.world.enemies[e.enemyIndex];
          const x = this.layout.x(e.x);
          const y = this.layout.y(e.y);
          this.fx.burst(x, y, enemy.profile.color, 26);
          this.fx.ring(x, y, enemy.profile.color, 3);
          this.fx.floatText(x, y - 10, e.combo > 1 ? `+${e.points}  x${e.combo}` : `+${e.points}`, enemy.profile.colorCss, 22);
          audio.play('enemyCaught', e.combo);
          break;
        }
        case 'allEnemiesCaught':
          this.addScore(e.points);
          this.fx.floatText(this.playerX(), this.playerY() - 50, `FULL SWEEP +${e.points}`, COLORS.gold, 26);
          audio.play('extraLife');
          break;
        case 'playerCaught':
          this.onPlayerCaught();
          break;
        case 'cleared':
          this.onCleared();
          break;
        case 'modeChange':
          break;
      }
    }
  }

  private onPickup(kind: 'shard' | 'core' | 'prism', tx: number, ty: number, points: number): void {
    const idx = ty * this.world.grid.cols + tx;
    const sprite = this.pickupSprites[idx];
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
      this.pickupSprites[idx] = null;
    }
    this.addScore(points);
    const stats = this.session.stats;
    if (kind === 'shard') {
      stats.shards++;
      audio.play('shard');
      return;
    }
    const x = this.layout.x(tx);
    const y = this.layout.y(ty);
    this.fx.burst(x, y, PICKUP_COLORS[kind], kind === 'core' ? 22 : 16);
    if (kind === 'core') {
      stats.cores++;
      audio.play('core');
    } else {
      stats.prisms++;
      this.fx.floatText(x, y - 10, `+${points}`, COLORS.gold);
      audio.play('prism');
    }
  }

  private onPlayerCaught(): void {
    this.phase = 'dying';
    this.phaseTimer = BALANCE.timing.deathSec;
    this.continueAfterDeath = this.session.loseLife();
    audio.stopMusic();
    audio.setIntensity('normal');
    audio.play('death');
    this.fx.shake(300, 0.012);
    this.fx.burst(this.playerX(), this.playerY(), COLORS.player, 36);
    this.playerView?.playDeath(BALANCE.timing.deathSec);
  }

  private onCleared(): void {
    this.phase = 'cleared';
    this.phaseTimer = BALANCE.timing.levelClearSec;
    this.flashTimer = 0;
    audio.stopMusic();
    audio.setIntensity('normal');
    audio.play('levelClear');
    const bonus = this.session.levelClearBonus();
    this.addScore(bonus);
    this.banner.setText('CIRCUIT CLEAR!').setColor(COLORS.accent).setVisible(true);
    this.subBanner.setText(`BONUS +${bonus}`).setVisible(true);
    this.fx.burst(this.playerX(), this.playerY(), COLORS.player, 40);
  }

  private updateClearFlash(dt: number): void {
    this.flashTimer -= dt;
    if (this.flashTimer > 0 || !this.mazeImage) return;
    this.flashTimer = CLEAR_FLASH_INTERVAL_SEC;
    if (this.mazeImage.isTinted) this.mazeImage.clearTint();
    else this.mazeImage.setTintFill(0xffffff);
  }

  private addScore(points: number): void {
    if (this.session.addScore(points)) {
      audio.play('extraLife');
      this.fx.floatText(this.playerX(), this.playerY() - 40, '+1 VIDA', COLORS.accent, 24);
    }
  }

  // ───────────────────────────── rendering ─────────────────────────────

  private syncViews(time: number): void {
    const w = this.world;
    const enemiesVisible = this.phase !== 'cleared' && !(this.phase === 'dying' && this.phaseTimer < BALANCE.timing.deathSec * 0.7);
    this.playerView?.sync(w.player, time, w.powerActive);
    this.enemyViews.forEach((v) => v.sync(time, w.powerTimer, enemiesVisible));
    this.hud.setScore(this.session.score);
    this.hud.setHighScore(this.session.highScore);
    this.hud.setLives(this.session.lives);
  }

  private playerX(): number {
    return this.playerView?.sprite.x ?? this.design.width / 2;
  }

  private playerY(): number {
    return this.playerView?.sprite.y ?? this.design.height / 2;
  }

  // ───────────────────────────── pause / settings ─────────────────────────────

  private toggleMute(): void {
    settings.update({ muted: !settings.get().muted });
  }

  private togglePause(): void {
    if (this.phase === 'over') return;
    this.paused = !this.paused;
    if (this.paused) {
      audio.stopMusic();
      this.tweens.pauseAll();
      this.fx.setPaused(true);
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
      this.tweens.resumeAll();
      this.fx.setPaused(false);
      if (this.phase === 'playing') audio.startMusic();
    }
  }

  private showPauseMenu(): void {
    const cx = this.design.width / 2;
    const cy = this.design.height / 2;
    const shade = this.add
      .rectangle(cx, cy, PAUSE_SHADE_SIZE, PAUSE_SHADE_SIZE, COLORS.background, 0.82)
      .setInteractive();
    const title = glow(this.add.text(cx, cy - 170, 'PAUSED', displayText(48)).setOrigin(0.5), COLORS.accent, 18);
    const buttons = [
      new NeonButton(this, cx, cy - 60, 'RESUME', () => this.togglePause(), { color: COLORS.accentHex }),
      new NeonButton(this, cx, cy + 20, 'RESTART', () => this.scene.restart({ ...this.startData, seed: undefined })),
      new NeonButton(this, cx, cy + 100, 'MENU', () => this.scene.start(SCENE_KEYS.menu)),
    ];
    const hint = this.add.text(cx, cy + 180, 'P / Esc para continuar', monoText(16, COLORS.textDim)).setOrigin(0.5);
    this.pauseLayer = this.add.container(0, 0, [shade, title, ...buttons, hint]).setDepth(100);
    this.pauseNav = new MenuNavigator(this, buttons);
  }

  private hidePauseMenu(): void {
    this.pauseNav?.destroy();
    this.pauseNav = null;
    this.pauseLayer?.destroy();
    this.pauseLayer = null;
  }
}
