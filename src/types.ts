export type TileType = 'grass' | 'path' | 'obstacle';
export type TileOverrides = Record<string, TileType>; // key: "col,row"
export type Direction = 'north' | 'south' | 'east' | 'west';
export type TowerType = 'arrow' | 'mage' | 'cannon';

export interface Waypoint {
  col: number;
  row: number;
}

export interface LevelData {
  grid: TileType[][];  // indexed [row][col]
  waypoints: Waypoint[];
}

export interface Tower {
  col: number;
  row: number;
  type: TowerType;
}

export interface ActiveBeam {
  towerKey: string;   // "col,row" of the mage tower
  fromX:    number;   // visual launch grid col
  fromY:    number;   // visual launch grid row
  targetId: number;
  targetX:  number;   // live enemy col (updated every tick)
  targetY:  number;   // live enemy row (updated every tick)
}

export interface Projectile {
  id:       number;
  type:     TowerType;
  x:        number;   // current grid col (fractional)
  y:        number;   // current grid row (fractional)
  fromX:    number;   // launch grid col — fixed at spawn (used for laser beam)
  fromY:    number;   // launch grid row — fixed at spawn
  targetId: number;   // ID of the homed enemy
  targetX:  number;   // last known target col (updated each tick if alive)
  targetY:  number;   // last known target row
  alive:    boolean;
  towerKey: string;   // "col,row" of the tower that fired — used to enforce 1 projectile at a time
}
