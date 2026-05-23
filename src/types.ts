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

export interface Projectile {
  id:       number;
  type:     TowerType;
  x:        number;   // current grid col (fractional)
  y:        number;   // current grid row (fractional)
  targetId: number;   // ID of the homed enemy
  targetX:  number;   // last known target col (updated each tick if alive)
  targetY:  number;   // last known target row
  alive:    boolean;
}
