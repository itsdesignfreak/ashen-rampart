import type { LevelData, TileType } from '../types';
import { GRID_COLS, GRID_ROWS } from '../constants';

// Waypoints for 20×15 grid
export const WAYPOINTS = [
  { col: 10, row:  0 },  // Enemy Entrance (stone road, top)
  { col: 10, row:  6 },  // turn east
  { col: 13, row:  6 },  // turn south
  { col: 13, row:  9 },  // turn west
  { col:  7, row:  9 },  // turn south
  { col:  7, row: 12 },  // turn west
  { col:  5, row: 12 },  // Base
] as const;

function buildGrid(): TileType[][] {
  const grid: TileType[][] = Array.from({ length: GRID_ROWS }, () =>
    new Array<TileType>(GRID_COLS).fill('grass')
  );

  // Trace path tiles between consecutive waypoints
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    if (a.col === b.col) {
      const rMin = Math.min(a.row, b.row);
      const rMax = Math.max(a.row, b.row);
      for (let r = rMin; r <= rMax; r++) grid[r][a.col] = 'path';
    } else {
      const cMin = Math.min(a.col, b.col);
      const cMax = Math.max(a.col, b.col);
      for (let c = cMin; c <= cMax; c++) grid[a.row][c] = 'path';
    }
  }

  // Manually painted obstacle tiles (never overwrite path)
  const OBSTACLES: [number, number][] = [ // [row, col]
    [0,5],[0,6],[0,7],[0,8],[0,9],[0,11],[0,12],[0,13],[0,14],
    [1,5],[1,6],[1,7],[1,8],[1,9],[1,11],[1,12],[1,13],[1,14],
    [2,11],[2,14],
    [3,6],[3,7],[3,12],
    [4,5],[4,6],[4,7],[4,8],[4,12],[4,13],[4,14],[4,15],[4,16],[4,17],
    [5,5],[5,6],[5,7],[5,8],[5,17],[5,18],[5,19],
    [6,4],[6,5],[6,6],[6,18],[6,19],
    [7,5],[7,6],[7,7],[7,19],
    [8,5],[8,6],[8,7],[8,10],[8,19],
    [9,16],[9,18],
    [10,14],[10,18],
    [11,3],[11,4],[11,5],[11,6],[11,17],[11,18],
    [12,4],[12,10],[12,11],[12,12],[12,13],[12,14],[12,15],[12,16],[12,17],[12,18],
    [13,4],[13,5],[13,10],[13,11],[13,12],[13,13],[13,14],[13,15],[13,16],[13,17],[13,18],
    [14,10],[14,11],[14,12],[14,13],[14,14],[14,15],[14,16],[14,17],[14,18],
  ];
  for (const [r, c] of OBSTACLES) {
    if (grid[r]?.[c] !== 'path') grid[r][c] = 'obstacle';
  }

  return grid;
}

export const LEVEL1: LevelData = {
  grid: buildGrid(),
  waypoints: [...WAYPOINTS],
};
