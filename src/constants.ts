// Grid & tile — 75×75px tiles, grid sized to fill 1448×1086 canvas
export const TILE_W = 75;          // px per tile column
export const TILE_H = 75;          // px per tile row
export const GRID_COLS = 20;       // ⌊1448 / 72⌋
export const GRID_ROWS = 15;       // ⌊1086 / 72⌋

// Canvas — exact image dimensions
export const CANVAS_WIDTH  = 1448;
export const CANVAS_HEIGHT = 1086;

// Towers
export const TOWER_COST_ARROW    = 50;
export const TOWER_COST_MAGE     = 75;
export const TOWER_COST_CANNON   = 100;
export const TOWER_RANGE_ARROW   = 5;    // tiles
export const TOWER_RANGE_MAGE    = 3;
export const TOWER_RANGE_CANNON  = 3;
export const TOWER_FIRE_RATE_ARROW  = 1000; // ms between shots
export const TOWER_FIRE_RATE_MAGE   = 1500; // ms between laser shots
export const TOWER_FIRE_RATE_CANNON = 2500;
export const TOWER_SELL_REFUND = 0.5;   // fraction of cost returned on sell
export const TOWER_FOOTPRINT   = 2;     // tiles per side (1 = single tile, 2 = 2×2)

// Projectiles — damage, speed (tiles/sec), effects
export const TOWER_DAMAGE_ARROW   = 25;
export const TOWER_DAMAGE_MAGE    = 15;
export const TOWER_DAMAGE_CANNON  = 60;
export const PROJ_SPEED_ARROW     = 10;  // tiles/sec
export const PROJ_SPEED_MAGE      = 25;  // fast — laser feels near-instant
export const PROJ_SPEED_CANNON    = 6;
export const MAGE_DPS             = 10;  // damage per second from the continuous beam
export const MAGE_SLOW_FACTOR     = 0.4; // 40 % of normal speed
export const MAGE_SLOW_DURATION   = 2000; // ms
export const CANNON_SPLASH_RADIUS = 1.5; // tiles

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
