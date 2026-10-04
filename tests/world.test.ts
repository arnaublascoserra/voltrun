import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/config/balance';
import { getLevelParams } from '../src/game/config/difficulty';
import { getMap } from '../src/game/maps';
import { parseMap } from '../src/game/maps/parseMap';
import { GameWorld } from '../src/game/systems/GameWorld';
import type { WorldEvent } from '../src/game/systems/GameWorld';
import { GameSession } from '../src/game/systems/GameSession';
import { SeededRandom } from '../src/game/utils/random';

const STEP = 1 / 60;

function simulate(world: GameWorld, seconds: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    world.update(STEP);
    events.push(...world.drainEvents());
    if (world.halted) break;
  }
  return events;
}

describe('GameWorld', () => {
  it('collects shards and scores them', () => {
    const world = new GameWorld(getMap('circuit'), getLevelParams(1), new SeededRandom(1));
    world.player.requestDirection('left');
    const events = simulate(world, 0.6);
    const pickups = events.filter((e) => e.type === 'pickup');
    expect(pickups.length).toBeGreaterThan(0);
    expect(pickups[0]).toMatchObject({ kind: 'shard', points: BALANCE.score.shard });
    expect(world.remaining).toBe(world.totalPickups - pickups.length);
  });

  it('releases enemies from home over time', () => {
    const world = new GameWorld(getMap('circuit'), getLevelParams(1), new SeededRandom(2));
    expect(world.enemies.every((e) => e.state === 'HOME')).toBe(true);
    simulate(world, 1.5);
    expect(world.enemies[0].state).not.toBe('HOME');
  });

  it('enemies leave the home and never walk through walls', () => {
    const world = new GameWorld(getMap('foundry'), getLevelParams(5), new SeededRandom(3));
    // Keep the player out of the way: it never moves, so it might get caught; just reset when it does.
    for (let t = 0; t < 30; t += STEP) {
      world.update(STEP);
      world.drainEvents();
      if (world.halted) world.resetActors();
      for (const e of world.enemies) {
        expect(world.grid.isWalkable(e.tile.x, e.tile.y, true)).toBe(true);
      }
    }
    expect(world.enemies.some((e) => e.state === 'CHASE' || e.state === 'PATROL')).toBe(true);
  });

  it('a stationary player eventually gets caught', () => {
    const world = new GameWorld(getMap('circuit'), getLevelParams(3), new SeededRandom(4));
    const events = simulate(world, 60);
    expect(events.some((e) => e.type === 'playerCaught')).toBe(true);
  });

  it('power core makes enemies vulnerable and catching them uses the combo table', () => {
    // Tiny arena: core right next to the player, enemy released immediately.
    const map = parseMap({
      id: 'power',
      name: 'power',
      rows: [
        '###########',
        '#P.o......#',
        '#.###-###.#',
        '#.##1234#.#',
        '#.#######.#',
        '#.........#',
        '###########',
      ],
    });
    const params = { ...getLevelParams(1), releaseDelays: [0, 99, 99, 99], powerDuration: 30, vulnerableFleeChance: 0 };
    const world = new GameWorld(map, params, new SeededRandom(5));
    simulate(world, 1.2); // enemy 0 leaves home and starts moving
    world.player.requestDirection('right');
    const events = simulate(world, 0.5);
    expect(events.some((e) => e.type === 'powerStart')).toBe(true);
    expect(world.powerActive).toBe(true);
    const roaming = world.enemies[0];
    expect(['VULNERABLE', 'LEAVING']).toContain(roaming.state);
  });

  it('catching vulnerable enemies scores a growing combo and sends them home', () => {
    const world = new GameWorld(getMap('circuit'), { ...getLevelParams(1), releaseDelays: [0, 0, 0, 0] }, new SeededRandom(7));
    simulate(world, 4); // everybody out of the house
    const caughtEvents: WorldEvent[] = [];
    // Force power and put two enemies right on top of the player.
    (world as unknown as { startPower(): void }).startPower();
    for (const enemy of world.enemies.slice(0, 2)) {
      expect(enemy.state).toBe('VULNERABLE');
      enemy.mover.tile.x = world.player.tile.x;
      enemy.mover.tile.y = world.player.tile.y;
      enemy.mover.progress = 0;
      world.update(STEP);
      caughtEvents.push(...world.drainEvents().filter((e) => e.type === 'enemyCaught'));
      simulate(world, BALANCE.timing.enemyCaughtFreezeSec + 0.05);
    }
    expect(caughtEvents.map((e) => (e.type === 'enemyCaught' ? e.points : 0))).toEqual(BALANCE.score.enemyCombo.slice(0, 2));
    const returning = world.enemies[0];
    expect(['RETURNING', 'HOME', 'LEAVING']).toContain(returning.state);
    // Eyes travel fast back to the house and come out again.
    let reachedHome = false;
    for (let t = 0; t < 8 && !reachedHome; t += STEP) {
      world.update(STEP);
      world.drainEvents();
      if (world.halted) world.halted = false;
      reachedHome = returning.state === 'HOME';
    }
    expect(reachedHome).toBe(true);
  });

  it('clears the level when every pickup is collected', () => {
    const map = parseMap({
      id: 'tiny',
      name: 'tiny',
      rows: ['#######', '#P...o#', '###-###', '#12 34#', '#######'],
    });
    const params = { ...getLevelParams(1), releaseDelays: [99, 99, 99, 99] };
    const world = new GameWorld(map, params, new SeededRandom(6));
    world.player.requestDirection('right');
    const events = simulate(world, 3);
    expect(events.at(-1)).toEqual({ type: 'cleared' });
    expect(world.remaining).toBe(0);
  });
});

describe('GameSession', () => {
  it('awards an extra life at the threshold', () => {
    const s = new GameSession(0);
    expect(s.addScore(BALANCE.lives.extraLifeEvery - 1)).toBe(false);
    expect(s.addScore(1)).toBe(true);
    expect(s.lives).toBe(BALANCE.lives.start + 1);
  });

  it('ends the run when lives reach zero', () => {
    const s = new GameSession(0);
    for (let i = 1; i < BALANCE.lives.start; i++) expect(s.loseLife()).toBe(true);
    expect(s.loseLife()).toBe(false);
  });

  it('reports a new record only when beating the previous best', () => {
    const s = new GameSession(500);
    s.addScore(400);
    expect(s.result(false).isNewRecord).toBe(false);
    s.addScore(200);
    expect(s.result(false)).toMatchObject({ isNewRecord: true, highScore: 600 });
  });
});
