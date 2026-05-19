import type { LevelData, TileType } from '../types';
import { GRID_COLS, GRID_ROWS } from '../constants';

// Waypoints for 20×15 grid — entrance shifted to col 7 to follow the stone road
export const WAYPOINTS = [
  { col:  7, row:  0 },  // Enemy Entrance (stone road, top)
  { col:  7, row:  5 },  // turn east
  { col: 13, row:  5 },  // turn south
  { col: 13, row:  8 },  // turn west
  { col:  4, row:  8 },  // turn south
  { col:  4, row: 11 },  // turn west
  { col:  2, row: 11 },  // turn south
  { col:  2, row: 13 },  // Base (castle, bottom-left)
] as const;

// Building footprints for 20×15 grid: [colStart, rowStart, colEnd, rowEnd]
const OBSTACLE_RECTS: [number, number, number, number][] = [
  [ 0,  0,  4,  2],  // top-left building (blacksmith)
  [15,  0, 18,  2],  // top-right building (shop)
  [ 0,  4,  4,  7],  // centre-left building
];

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

  // Mark obstacles (never overwrite path tiles)
  for (const [c0, r0, c1, r1] of OBSTACLE_RECTS) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (grid[r][c] !== 'path') grid[r][c] = 'obstacle';
      }
    }
  }

  return grid;
}

export const LEVEL1: LevelData = {
  grid: buildGrid(),
  waypoints: [...WAYPOINTS],
};
