import { describe, expect, it } from 'vitest';
import { chooseDirection } from '../src/game/ai/steering';
import { chaseTarget } from '../src/game/ai/targeting';
import type { TargetContext } from '../src/game/ai/targeting';
import { getLevelParams } from '../src/game/config/difficulty';
import type { Personality } from '../src/game/config/enemies';
import { Grid, UNREACHABLE } from '../src/game/core/Grid';
import { getMap } from '../src/game/maps';
import { SeededRandom } from '../src/game/utils/random';

const grid = new Grid(getMap('circuit'));

function ctx(overrides: Partial<TargetContext> = {}): TargetContext {
  return {
    grid,
    params: getLevelParams(5),
    playerTile: { x: 10, y: 19 },
    playerDir: 'right',
    hunterTile: { x: 4, y: 19 },
    selfTile: { x: 10, y: 3 },
    ...overrides,
  };
}

describe('AI targeting', () => {
  it('each personality aims at a different spot', () => {
    const personalities: Personality[] = ['hunter', 'interceptor', 'strategist'];
    const targets = personalities.map((p) => chaseTarget(p, ctx()));
    const keys = new Set(targets.map((t) => `${t.x},${t.y}`));
    expect(keys.size).toBe(3);
  });

  it('interceptor aims ahead of the player', () => {
    const t = chaseTarget('interceptor', ctx());
    expect(t.x).toBeGreaterThan(10);
    expect(t.y).toBe(19);
  });

  it('strategist picks a junction on the far side from the hunter', () => {
    const t = chaseTarget('strategist', ctx());
    expect(grid.intersections).toContainEqual(t);
    expect(t.x).toBeGreaterThanOrEqual(10);
  });

  it('targets are always walkable tiles', () => {
    for (const playerDir of ['up', 'down', 'left', 'right'] as const) {
      for (const p of ['hunter', 'interceptor', 'strategist', 'wildcard'] as Personality[]) {
        const t = chaseTarget(p, ctx({ playerDir, playerTile: { x: 1, y: 1 } }));
        expect(grid.isWalkable(t.x, t.y, false)).toBe(true);
      }
    }
  });
});

describe('steering', () => {
  it('smart seeking follows the shortest path', () => {
    const target = { x: 10, y: 19 };
    const field = grid.distanceField(target, false);
    const from = { x: 1, y: 3 };
    const dir = chooseDirection(grid, from, 'none', { mode: 'seek', target, smart: true, allowDoor: false, allowReverse: true }, new SeededRandom(1));
    const next = grid.neighbor(from, dir);
    expect(field[grid.index(next.x, next.y)]).toBe(field[grid.index(from.x, from.y)] - 1);
  });

  it('never reverses unless at a dead end', () => {
    const rng = new SeededRandom(9);
    for (let i = 0; i < 50; i++) {
      const dir = chooseDirection(grid, { x: 3, y: 3 }, 'right', { mode: 'wander', smart: false, allowDoor: false, allowReverse: false }, rng);
      expect(dir).not.toBe('left');
    }
  });

  it('distance field marks walls as unreachable and wraps through tunnels', () => {
    const field = grid.distanceField({ x: 0, y: 10 }, false);
    expect(field[grid.index(0, 0)]).toBe(UNREACHABLE);
    expect(field[grid.index(20, 10)]).toBe(1);
  });
});

describe('difficulty', () => {
  it('ramps more than just speed', () => {
    const l1 = getLevelParams(1);
    const l8 = getLevelParams(8);
    expect(l8.enemySpeed).toBeGreaterThan(l1.enemySpeed);
    expect(l8.powerDuration).toBeLessThan(l1.powerDuration);
    expect(l8.smartness).toBeGreaterThan(l1.smartness);
    expect(l8.modeSchedule[0].duration).toBeLessThan(l1.modeSchedule[0].duration);
    expect(l8.releaseDelays[3]).toBeLessThan(l1.releaseDelays[3]);
    expect(l8.mapId).not.toBe(l1.mapId);
  });

  it('the final wave chases forever', () => {
    expect(getLevelParams(1).modeSchedule.at(-1)).toEqual({ mode: 'CHASE', duration: Infinity });
  });
});
