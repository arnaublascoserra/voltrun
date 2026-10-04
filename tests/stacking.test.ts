import { describe, expect, it } from 'vitest';
import { getLevelParams } from '../src/game/config/difficulty';
import { moverPosition } from '../src/game/core/GridMover';
import { getMap } from '../src/game/maps';
import { GameWorld } from '../src/game/systems/GameWorld';
import { SeededRandom } from '../src/game/utils/random';

const STEP = 1 / 60;
/** Every N seconds all enemies are sent home at once (the "full sweep" case that made them clump). */
const SWEEP_EVERY_SEC = 15;

/** Fraction of frames in which two chasing enemies overlap (closer than one tile). */
function clumpingRatio(seed: number): number {
  const world = new GameWorld(getMap('circuit'), getLevelParams(6), new SeededRandom(seed));
  const dirs = ['left', 'up', 'right', 'down'] as const;
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  let clumped = 0;
  let frames = 0;
  let nextSweep = SWEEP_EVERY_SEC;
  for (let t = 0; t < 120; t += STEP) {
    if (Math.floor(t * 2) % 7 === 0) world.player.requestDirection(dirs[Math.floor(t / 3) % 4]);
    if (t >= nextSweep) {
      nextSweep += SWEEP_EVERY_SEC;
      world.enemies.forEach((e) => e.catch());
    }
    world.update(STEP);
    world.drainEvents();
    if (world.halted) world.halted = false; // ignore deaths: we only study enemy movement

    const active = world.enemies.filter((e) => e.state === 'CHASE' || e.state === 'PATROL');
    if (active.length < 2) continue;
    frames++;
    outer: for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        moverPosition(active[i].mover, a);
        moverPosition(active[j].mover, b);
        if (Math.hypot(a.x - b.x, a.y - b.y) < 1) {
          clumped++;
          break outer;
        }
      }
    }
  }
  return clumped / Math.max(1, frames);
}

describe('enemy separation', () => {
  it('enemies rarely travel on top of each other', () => {
    const ratios = [1, 2, 3, 4, 5, 6].map(clumpingRatio);
    const avg = ratios.reduce((x, y) => x + y, 0) / ratios.length;
    void ratios; // per-seed values available when debugging
    expect(avg).toBeLessThan(0.15); // ~0.41 without the separation rule
  });
});
