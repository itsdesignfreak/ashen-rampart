// Grid & tile — 75×75px tiles, grid sized to fill 1448×1086 canvas
export const TILE_W = 75;          // px per tile column
export const TILE_H = 75;          // px per tile row
export const GRID_COLS = 20;       // ⌊1448 / 72⌋
export const GRID_ROWS = 15;       // ⌊1086 / 72⌋

// Canvas — exact image dimensions
export const CANVAS_WIDTH  = 1448;
export const CANVAS_HEIGHT = 1086;

// Towers
export const TOWER_COST_ARROW = 50;
export const TOWER_COST_CANNON = 100;
export const TOWER_RANGE_ARROW = 3; // tiles
export const TOWER_RANGE_CANNON = 2;
export const TOWER_FIRE_RATE_ARROW = 1000; // ms between shots
export const TOWER_FIRE_RATE_CANNON = 2500;

// Enemies
export const ENEMY_SPEED_BASE = 1; // tiles per second
export const ENEMY_HP_BASE = 100;

// Economy
export const STARTING_GOLD = 200;
export const GOLD_PER_KILL = 10;
export const LIVES_START = 20;

// Wave timing
export const WAVE_SPAWN_INTERVAL  = 800;  // ms between enemy spawns in a wave
export const WAVE_BREAK_DURATION  = 5000; // ms between waves
export const WAVE_ENEMY_COUNT     = 10;   // enemies per wave

// Projectiles
export const PROJECTILE_SPEED_ARROW = 400; // px per second
export const PROJECTILE_SPEED_CANNON = 250;

// Map background — single image replaces per-tile sprites
export const MAP_BG_SRC = '/assets/tiles/map-bg.png';

// Grid perspective — per-column skewX fan
export const GRID_PERSPECTIVE_MAX_DEG = 6;

// Tile appearance
export const TILE_GAP    = 10;  // px gap between adjacent tiles
export const TILE_RADIUS = 2;   // px border radius on each tile corner

// Grid rotateX — tilt the overlay toward the viewer (positive = top recedes)
export const GRID_ROTATE_X_DEG = 22.5;
export const GRID_PERSP_D      = 2350; // perspective distance in canvas pixels

// Grid origin offset — shift the entire overlay to align with background art
export const GRID_OFFSET_X = -62;
export const GRID_OFFSET_Y = 6;

// Asset paths (resolved relative to /public)
export const ASSETS = {
  towers: '/assets/towers/',
  enemies: '/assets/enemies/',
  ui: '/assets/ui/',
  projectiles: '/assets/projectiles/',
} as const;
