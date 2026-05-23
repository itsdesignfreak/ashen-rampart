import type { TowerType } from '../types';
import type { Tower } from '../types';
import {
  TOWER_COST_ARROW,  TOWER_COST_MAGE,  TOWER_COST_CANNON,
  TOWER_RANGE_ARROW, TOWER_RANGE_MAGE, TOWER_RANGE_CANNON,
  TOWER_FIRE_RATE_ARROW, TOWER_FIRE_RATE_MAGE, TOWER_FIRE_RATE_CANNON,
  TOWER_DAMAGE_ARROW, TOWER_DAMAGE_MAGE, TOWER_DAMAGE_CANNON,
  PROJ_SPEED_ARROW, PROJ_SPEED_MAGE, PROJ_SPEED_CANNON,
  CANNON_SPLASH_RADIUS, MAGE_SLOW_DURATION, MAGE_SLOW_FACTOR,
  TOWER_FOOTPRINT,
} from '../constants';

/** Returns true if the tile at (col, row) falls within a tower's footprint. */
export function towerOccupies(tower: Tower, col: number, row: number): boolean {
  return col >= tower.col && col < tower.col + TOWER_FOOTPRINT &&
         row >= tower.row && row < tower.row + TOWER_FOOTPRINT;
}

export interface TowerStats {
  cost:           number;
  range:          number;      // attack radius in tiles
  fireRate:       number;      // ms between shots
  label:          string;
  color:          string;      // CSS hex for the placeholder circle
  abbrev:         string;
  ringFill:       string;
  ringStroke:     string;
  // Projectile
  projectileDamage: number;
  projectileSpeed:  number;    // tiles per second
  splashRadius?:    number;    // tiles — cannon only
  slowDuration?:    number;    // ms  — mage only
  slowFactor?:      number;    // 0–1 — mage only
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  arrow: {
    cost:             TOWER_COST_ARROW,
    range:            TOWER_RANGE_ARROW,
    fireRate:         TOWER_FIRE_RATE_ARROW,
    label:            'Archer',
    color:            '#60a5fa',
    abbrev:           'A',
    ringFill:         'rgba(96,165,250,0.08)',
    ringStroke:       'rgba(96,165,250,0.55)',
    projectileDamage: TOWER_DAMAGE_ARROW,
    projectileSpeed:  PROJ_SPEED_ARROW,
  },
  mage: {
    cost:             TOWER_COST_MAGE,
    range:            TOWER_RANGE_MAGE,
    fireRate:         TOWER_FIRE_RATE_MAGE,
    label:            'Mage',
    color:            '#a855f7',
    abbrev:           'M',
    ringFill:         'rgba(168,85,247,0.08)',
    ringStroke:       'rgba(168,85,247,0.55)',
    projectileDamage: TOWER_DAMAGE_MAGE,
    projectileSpeed:  PROJ_SPEED_MAGE,
    slowDuration:     MAGE_SLOW_DURATION,
    slowFactor:       MAGE_SLOW_FACTOR,
  },
  cannon: {
    cost:             TOWER_COST_CANNON,
    range:            TOWER_RANGE_CANNON,
    fireRate:         TOWER_FIRE_RATE_CANNON,
    label:            'Cannon',
    color:            '#f97316',
    abbrev:           'C',
    ringFill:         'rgba(249,115,22,0.08)',
    ringStroke:       'rgba(249,115,22,0.55)',
    projectileDamage: TOWER_DAMAGE_CANNON,
    projectileSpeed:  PROJ_SPEED_CANNON,
    splashRadius:     CANNON_SPLASH_RADIUS,
  },
};
