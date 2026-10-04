import type { TilePos } from '../core/types';

export type Personality = 'hunter' | 'interceptor' | 'strategist' | 'wildcard';

export interface EnemyProfile {
  personality: Personality;
  name: string;
  role: string;
  description: string;
  color: number;
  colorCss: string;
  /** Personal speed multiplier: small differences stop the group from moving as one blob. */
  speedFactor: number;
  /** Where the enemy retreats during PATROL, as a fraction of the map size (0..1). */
  patrolCorner: TilePos;
}

/**
 * The four Glitches. Order matters: index = spawn marker (1-4) - 1 and
 * release order.
 */
export const ENEMY_PROFILES: readonly EnemyProfile[] = [
  {
    personality: 'hunter',
    name: 'RAZE',
    speedFactor: 1,
    role: 'Cazador',
    description: 'Va directo a por ti. Se enfurece cuando quedan pocas chispas.',
    color: 0xff3d6e,
    colorCss: '#ff3d6e',
    patrolCorner: { x: 1, y: 0 },
  },
  {
    personality: 'interceptor',
    name: 'VEX',
    speedFactor: 0.97,
    role: 'Interceptor',
    description: 'Predice hacia dónde vas y te espera delante.',
    color: 0x3dc8ff,
    colorCss: '#3dc8ff',
    patrolCorner: { x: 0, y: 0 },
  },
  {
    personality: 'strategist',
    name: 'NYX',
    speedFactor: 0.95,
    role: 'Estratega',
    description: 'Ocupa los cruces cercanos para cortarte la huida.',
    color: 0xb46bff,
    colorCss: '#b46bff',
    patrolCorner: { x: 1, y: 1 },
  },
  {
    personality: 'wildcard',
    name: 'FLUX',
    speedFactor: 1.02,
    role: 'Impredecible',
    description: 'Alterna persecución y deriva errática. Nunca sabes qué hará.',
    color: 0xffa13d,
    colorCss: '#ffa13d',
    patrolCorner: { x: 0, y: 1 },
  },
];
