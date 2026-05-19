import type { TowerType } from '../types';
import {
  TOWER_COST_ARROW,  TOWER_COST_MAGE,  TOWER_COST_CANNON,
  TOWER_RANGE_ARROW, TOWER_RANGE_MAGE, TOWER_RANGE_CANNON,
  TOWER_FIRE_RATE_ARROW, TOWER_FIRE_RATE_MAGE, TOWER_FIRE_RATE_CANNON,
} from '../constants';

export interface TowerStats {
  cost:        number;
  range:       number;    // attack radius in tiles
  fireRate:    number;    // ms between shots
  label:       string;    // display name
  color:       string;    // CSS hex for the circle fill
  abbrev:      string;    // single letter shown on placeholder
  ringFill:    string;    // rgba fill for the range-ring area
  ringStroke:  string;    // rgba stroke for the range-ring border
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  arrow: {
    cost:       TOWER_COST_ARROW,
    range:      TOWER_RANGE_ARROW,
    fireRate:   TOWER_FIRE_RATE_ARROW,
    label:      'Archer',
    color:      '#60a5fa',
    abbrev:     'A',
    ringFill:   'rgba(96,165,250,0.08)',
    ringStroke: 'rgba(96,165,250,0.55)',
  },
  mage: {
    cost:       TOWER_COST_MAGE,
    range:      TOWER_RANGE_MAGE,
    fireRate:   TOWER_FIRE_RATE_MAGE,
    label:      'Mage',
    color:      '#a855f7',
    abbrev:     'M',
    ringFill:   'rgba(168,85,247,0.08)',
    ringStroke: 'rgba(168,85,247,0.55)',
  },
  cannon: {
    cost:       TOWER_COST_CANNON,
    range:      TOWER_RANGE_CANNON,
    fireRate:   TOWER_FIRE_RATE_CANNON,
    label:      'Cannon',
    color:      '#f97316',
    abbrev:     'C',
    ringFill:   'rgba(249,115,22,0.08)',
    ringStroke: 'rgba(249,115,22,0.55)',
  },
};
