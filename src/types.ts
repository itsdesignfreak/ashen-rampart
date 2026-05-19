export type TileType = 'grass' | 'path' | 'obstacle';
export type TileOverrides = Record<string, TileType>; // key: "col,row"
export type Direction = 'north' | 'south' | 'east' | 'west';
export type TowerType = 'arrow' | 'cannon';

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
