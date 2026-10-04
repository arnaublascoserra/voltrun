import { describe, expect, it } from 'vitest';
import { MAPS, getMap } from '../src/game/maps';
import type { MapId } from '../src/game/maps';
import { MapError, parseMap } from '../src/game/maps/parseMap';
import { Grid } from '../src/game/core/Grid';

describe('maps', () => {
  for (const id of Object.keys(MAPS) as MapId[]) {
    it(`${id} parses and every pickup is reachable`, () => {
      const map = getMap(id);
      expect(map.pickups.length).toBeGreaterThan(100);
      expect(map.enemySpawns).toHaveLength(4);
      expect(map.pickups.some((p) => p.kind === 'core')).toBe(true);
    });

    it(`${id} has tunnels that wrap around`, () => {
      const grid = new Grid(getMap(id));
      const tunnelRow = getMap(id).tiles.findIndex((t) => t === 'tunnel');
      const y = Math.floor(tunnelRow / grid.cols);
      expect(grid.canMove({ x: 0, y }, 'left', false)).toBe(true);
      expect(grid.neighbor({ x: 0, y }, 'left')).toEqual({ x: grid.cols - 1, y });
    });
  }

  it('rejects ragged rows', () => {
    expect(() => parseMap({ id: 'bad', name: 'bad', rows: ['###', '#P.#', '###'] })).toThrow(MapError);
  });

  it('rejects unreachable pickups', () => {
    const rows = [
      '#########',
      '#P..#..o#',
      '###-#####',
      '#1234   #',
      '#########',
    ];
    expect(() => parseMap({ id: 'bad', name: 'bad', rows })).toThrow(/unreachable/);
  });
});
