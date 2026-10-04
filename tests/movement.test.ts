import { describe, expect, it } from 'vitest';
import { Grid } from '../src/game/core/Grid';
import { moverPosition } from '../src/game/core/GridMover';
import { Player } from '../src/game/entities/Player';
import { parseMap } from '../src/game/maps/parseMap';

/*
 * Small test arena:
 *   row 1 is a corridor, column 3 goes down from it (a T junction at 3,1).
 */
const arena = parseMap({
  id: 'arena',
  name: 'arena',
  rows: [
    '#########',
    '#P......#',
    '###.#-###',
    '###.#1###',
    '###.#234#',
    '#########',
  ],
});

const STEP = 1 / 60;
const noop = () => {};

function run(player: Player, seconds: number, speed = 6) {
  for (let t = 0; t < seconds; t += STEP) player.update(STEP, speed, noop);
}

describe('Player movement', () => {
  it('stays still until a direction is requested', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    run(p, 0.5);
    expect(p.tile).toEqual({ x: 1, y: 1 });
  });

  it('moves along a corridor and stops at the wall', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    p.requestDirection('right');
    run(p, 3);
    expect(p.tile).toEqual({ x: 7, y: 1 });
    expect(p.mover.moving).toBe(false);
    expect(p.facing).toBe('right');
  });

  it('buffers a turn pressed before reaching the junction', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    p.requestDirection('right');
    // Travel 1.5 tiles (to x=2.5), then press down: junction is at x=3.
    run(p, 1.5 / 6);
    p.requestDirection('down');
    run(p, 0.6);
    expect(p.tile.x).toBe(3);
    expect(p.tile.y).toBeGreaterThan(1);
  });

  it('forgets a buffered turn after the buffer window', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    p.requestDirection('up'); // impossible from spawn (wall) → expires
    run(p, 0.5);
    p.requestDirection('right');
    run(p, 3);
    expect(p.tile).toEqual({ x: 7, y: 1 });
  });

  it('reverses instantly in the middle of a corridor', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    p.requestDirection('right');
    run(p, 0.25); // 1.5 tiles
    const before = moverPosition(p.mover).x;
    p.requestDirection('left');
    run(p, STEP);
    expect(moverPosition(p.mover).x).toBeLessThan(before);
  });

  it('accepts a slightly late turn just after the junction', () => {
    const p = new Player(new Grid(arena), arena.playerSpawn);
    p.requestDirection('right');
    run(p, 2.1 / 6); // ~0.1 tiles past the junction centre at x=3
    p.requestDirection('down');
    run(p, 0.5);
    expect(p.tile.x).toBe(3);
    expect(p.tile.y).toBeGreaterThan(1);
  });

  it('never ends up inside a wall at very high speed', () => {
    const grid = new Grid(arena);
    const p = new Player(grid, arena.playerSpawn);
    p.requestDirection('right');
    for (let i = 0; i < 30; i++) p.update(0.05, 40, noop);
    expect(grid.isWalkable(p.tile.x, p.tile.y, false)).toBe(true);
  });
});
