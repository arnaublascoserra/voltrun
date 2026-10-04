import { circuitMap } from './circuit';
import { foundryMap } from './foundry';
import { labyrinthMap } from './labyrinth';
import { parseMap } from './parseMap';
import type { MapDefinition, ParsedMap } from './types';

/** Register new maps here (see README → "Cómo añadir un mapa"). */
export const MAPS = {
  circuit: circuitMap,
  foundry: foundryMap,
  labyrinth: labyrinthMap,
} satisfies Record<string, MapDefinition>;

export type MapId = keyof typeof MAPS;

const cache = new Map<MapId, ParsedMap>();

export function getMap(id: MapId): ParsedMap {
  let parsed = cache.get(id);
  if (!parsed) {
    parsed = parseMap(MAPS[id]);
    cache.set(id, parsed);
  }
  return parsed;
}

export type { MapDefinition, ParsedMap } from './types';
