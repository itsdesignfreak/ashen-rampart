import type { Direction, LevelData, Tower, TowerType, TileOverrides, Waypoint } from '../types';
import type { Enemy } from './enemy';
import { enemyGridPos } from './enemy';
import {
  TILE_W, TILE_H, CANVAS_WIDTH, CANVAS_HEIGHT,
  GRID_COLS, GRID_ROWS, GRID_PERSPECTIVE_MAX_DEG,
  GRID_ROTATE_X_DEG, GRID_PERSP_D,
  TILE_GAP, TILE_RADIUS,
  GRID_OFFSET_X, GRID_OFFSET_Y,
} from '../constants';

// ── Grid configuration ────────────────────────────────────────────────────────

export interface GridConfig {
  offsetX:     number;   // shift grid origin X (canvas px)
  offsetY:     number;   // shift grid origin Y (canvas px)
  tileW:       number;   // tile width  (canvas px)
  tileH:       number;   // tile height (canvas px)
  rotateXDeg:  number;   // rotateX tilt angle (degrees)
  perspD:      number;   // perspective distance (canvas px)
  perspMaxDeg: number;   // max per-column skewX angle (degrees)
  tileGap:     number;   // px gap between adjacent tiles
  tileRadius:  number;   // px border radius on each tile corner
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  offsetX:     GRID_OFFSET_X,
  offsetY:     GRID_OFFSET_Y,
  tileW:       TILE_W,
  tileH:       TILE_H,
  rotateXDeg:  GRID_ROTATE_X_DEG,
  perspD:      GRID_PERSP_D,
  perspMaxDeg: GRID_PERSPECTIVE_MAX_DEG,
  tileGap:     TILE_GAP,
  tileRadius:  TILE_RADIUS,
};

// Perspective origin is always the canvas centre (never shifted by offset)
const OX = CANVAS_WIDTH  / 2;
const OY = CANVAS_HEIGHT / 2;

// ── Per-config math helpers ───────────────────────────────────────────────────

function makeHelpers(cfg: GridConfig) {
  const { tileW: TW, tileH: TH, offsetX: OFX, offsetY: OFY,
          perspD: D, perspMaxDeg, rotateXDeg,
          tileGap: GAP, tileRadius: RADIUS } = cfg;
  const CENTER = GRID_COLS / 2;
  const MAX_R  = perspMaxDeg * Math.PI / 180;
  const ROT_R  = rotateXDeg  * Math.PI / 180;
  const SR     = Math.sin(ROT_R);
  const CR     = Math.cos(ROT_R);

  /** Per-column skewX: vertical lines fan outward from centre column. */
  function perspTanAt(c: number): number {
    return Math.tan((c - CENTER) / CENTER * MAX_R);
  }

  /**
   * Apply grid-offset + rotateX perspective to a grid-space point.
   * offsetX/Y shifts the grid origin before the perspective transform.
   */
  function applyRotX(x: number, y: number): [number, number] {
    const xr    = (x + OFX) - OX;
    const yr    = (y + OFY) - OY;
    const scale = D / (D - yr * SR);
    return [OX + xr * scale, OY + yr * CR * scale];
  }

  /**
   * Inverse of applyRotX — maps a screen point back to grid space.
   */
  function invertRotX(sx: number, sy: number): [number, number] {
    const sxr   = sx - OX;
    const syr   = sy - OY;
    const yr    = syr * D / (CR * D + SR * syr);
    const scale = D / (D - yr * SR);
    return [OX + sxr / scale - OFX, OY + yr - OFY];
  }

  /** Screen position of grid-corner (c, r). */
  function perspCorner(c: number, r: number): [number, number] {
    const y = r * TH;
    const x = c * TW + y * perspTanAt(c);
    return applyRotX(x, y);
  }

  /** Screen centre of tile (col, row). */
  function perspCenter(col: number, row: number): [number, number] {
    const cy = (row + 0.5) * TH;
    const cx = (col + 0.5) * TW + cy * perspTanAt(col + 0.5);
    return applyRotX(cx, cy);
  }

  /**
   * 4 screen corners of a tile with TILE_GAP inset.
   * Each edge is shrunk inward by TILE_GAP/2 px in grid space before projection.
   */
  function tileScreenCorners(
    col: number, row: number,
  ): [[number,number],[number,number],[number,number],[number,number]] {
    const g  = GAP / 2;
    const x0 = col       * TW + g;
    const x1 = (col + 1) * TW - g;
    const y0 = row       * TH + g;
    const y1 = (row + 1) * TH - g;
    return [
      applyRotX(x0 + y0 * perspTanAt(col),       y0),  // TL
      applyRotX(x1 + y0 * perspTanAt(col + 1),   y0),  // TR
      applyRotX(x1 + y1 * perspTanAt(col + 1),   y1),  // BR
      applyRotX(x0 + y1 * perspTanAt(col),       y1),  // BL
    ];
  }

  /** Map screen point → grid (col, row), or null if outside grid. */
  function hitTest(sx: number, sy: number): { col: number; row: number } | null {
    const [x, y] = invertRotX(sx, sy);
    const row = Math.floor(y / TH);
    if (row < 0 || row >= GRID_ROWS) return null;
    for (let c = 0; c < GRID_COLS; c++) {
      const xLeft  = c       * TW + y * perspTanAt(c);
      const xRight = (c + 1) * TW + y * perspTanAt(c + 1);
      if (x >= xLeft && x < xRight) return { col: c, row };
    }
    return null;
  }

  /** Exact screen position for a fractional grid coordinate (used for enemy positions). */
  function perspPoint(col: number, row: number): [number, number] {
    const gy = row * TH;
    const gx = col * TW + gy * perspTanAt(col);
    return applyRotX(gx, gy);
  }

  return { perspTanAt, applyRotX, invertRotX, perspCorner, perspCenter, perspPoint, tileScreenCorners, hitTest, radius: RADIUS };
}

// ── Public exports ────────────────────────────────────────────────────────────

/** Per-column skewX using default config. */
export function perspTanAt(c: number): number {
  return makeHelpers(DEFAULT_GRID_CONFIG).perspTanAt(c);
}

/** Hit-test a screen point against the grid. Pass gridConfig for live debug alignment. */
export function perspHitTest(
  sx: number, sy: number,
  cfg: GridConfig = DEFAULT_GRID_CONFIG,
): { col: number; row: number } | null {
  return makeHelpers(cfg).hitTest(sx, sy);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

const ARROW_COLOR    = 'rgba(255,255,255,0.55)';
const HOVER_FILL     = 'rgba(180,230,120,0.35)';
const HOVER_STROKE   = 'rgba(200,255,140,0.90)';
const GRID_LINE      = 'rgba(255,255,255,0.10)';
const OBSTACLE_FILL  = 'rgba(120,30,30,0.55)';
const OBSTACLE_CROSS = 'rgba(220,80,80,0.70)';
const TILE_EDIT_FILL   = 'rgba(220,80,80,0.25)';
const TILE_EDIT_STROKE = 'rgba(240,100,100,0.90)';

function buildFlowMap(waypoints: Waypoint[]): Map<string, Direction> {
  const map = new Map<string, Direction>();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    let dir: Direction;
    if (b.col > a.col)      dir = 'east';
    else if (b.col < a.col) dir = 'west';
    else if (b.row > a.row) dir = 'south';
    else                    dir = 'north';
    if (a.col === b.col) {
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        map.set(`${a.col},${r}`, dir);
    } else {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
        map.set(`${c},${a.row}`, dir);
    }
  }
  return map;
}

/**
 * Trace a rounded quadrilateral path (no beginPath / fill / stroke — caller decides).
 * Each corner is rounded using a quadratic Bézier curve with the given radius.
 */
function traceRoundedQuad(
  ctx: CanvasRenderingContext2D,
  [tlX, tlY]: [number, number],
  [trX, trY]: [number, number],
  [brX, brY]: [number, number],
  [blX, blY]: [number, number],
  radius: number,
) {
  const lerp = (ax: number, ay: number, bx: number, by: number, t: number): [number, number] =>
    [ax + (bx - ax) * t, ay + (by - ay) * t];
  const len = (ax: number, ay: number, bx: number, by: number) =>
    Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);

  const tTop    = radius / len(tlX, tlY, trX, trY);
  const tRight  = radius / len(trX, trY, brX, brY);
  const tBottom = radius / len(brX, brY, blX, blY);
  const tLeft   = radius / len(blX, blY, tlX, tlY);

  const [a0x, a0y] = lerp(tlX, tlY, trX, trY, tTop);
  const [a1x, a1y] = lerp(trX, trY, tlX, tlY, tTop);
  const [b0x, b0y] = lerp(trX, trY, brX, brY, tRight);
  const [b1x, b1y] = lerp(brX, brY, trX, trY, tRight);
  const [c0x, c0y] = lerp(brX, brY, blX, blY, tBottom);
  const [c1x, c1y] = lerp(blX, blY, brX, brY, tBottom);
  const [d0x, d0y] = lerp(blX, blY, tlX, tlY, tLeft);
  const [d1x, d1y] = lerp(tlX, tlY, blX, blY, tLeft);

  ctx.moveTo(a0x, a0y);
  ctx.lineTo(a1x, a1y);
  ctx.quadraticCurveTo(trX, trY, b0x, b0y);
  ctx.lineTo(b1x, b1y);
  ctx.quadraticCurveTo(brX, brY, c0x, c0y);
  ctx.lineTo(c1x, c1y);
  ctx.quadraticCurveTo(blX, blY, d0x, d0y);
  ctx.lineTo(d1x, d1y);
  ctx.quadraticCurveTo(tlX, tlY, a0x, a0y);
  ctx.closePath();
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  h: ReturnType<typeof makeHelpers>,
) {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const [tl, tr, br, bl] = h.tileScreenCorners(col, row);
      traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
    }
  }
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Direction) {
  const half = Math.min(TILE_W, TILE_H) * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(
    dir === 'east'  ? 0 :
    dir === 'south' ? Math.PI / 2 :
    dir === 'west'  ? Math.PI :
                     -Math.PI / 2
  );
  ctx.fillStyle = ARROW_COLOR;
  ctx.beginPath();
  ctx.moveTo( half,        0);
  ctx.lineTo(-half * 0.6, -half * 0.7);
  ctx.lineTo(-half * 0.6,  half * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string) {
  const pad = 6;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + pad * 2;
  const h = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(text, cx, cy);
}

/** Draw a red-tinted blocked overlay on an obstacle tile. */
function drawObstacleTile(
  ctx: CanvasRenderingContext2D,
  col: number, row: number,
  h: ReturnType<typeof makeHelpers>,
) {
  const [tl, tr, br, bl] = h.tileScreenCorners(col, row);
  const [cx, cy] = h.perspCenter(col, row);

  ctx.fillStyle = OBSTACLE_FILL;
  ctx.beginPath();
  traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
  ctx.fill();

  // X cross
  ctx.strokeStyle = OBSTACLE_CROSS;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tl[0], tl[1]); ctx.lineTo(br[0], br[1]);
  ctx.moveTo(tr[0], tr[1]); ctx.lineTo(bl[0], bl[1]);
  ctx.stroke();
}

function drawTowerPlaceholder(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  type: TowerType,
  h: ReturnType<typeof makeHelpers>,
) {
  const [tl, tr, br, bl] = h.tileScreenCorners(col, row);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
  ctx.fill();

  const [cx, cy] = h.perspCenter(col, row);
  ctx.fillStyle = type === 'arrow' ? '#60a5fa' : '#f97316';
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type === 'arrow' ? 'A' : 'C', cx, cy - 5);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '8px monospace';
  ctx.fillText(type === 'arrow' ? 'ARROW' : 'CANNON', cx, cy + 10);
}

// ── Public render entry-point ─────────────────────────────────────────────────

export interface HoveredTile { col: number; row: number }

export function renderMap(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  bgImage: HTMLImageElement | null,
  hoveredTile: HoveredTile | null = null,
  towers: Tower[] = [],
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  tileOverrides: TileOverrides = {},
  tileEditMode = false,
  showObstacles = true,
) {
  const { grid, waypoints } = level;
  const flowMap = buildFlowMap(waypoints);
  const h = makeHelpers(gridConfig);

  /** Effective tile type after applying overrides. */
  const tileType = (col: number, row: number) =>
    tileOverrides[`${col},${row}`] ?? grid[row]?.[col] ?? 'grass';

  // ── Layer 1: background image ─────────────────────────────────────────────
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.fillStyle = '#2a2016';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AWAITING ASSET: map-bg.png', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  // ── Layer 2: perspective grid lines ──────────────────────────────────────
  drawGridLines(ctx, h);

  // ── Layer 3: obstacle tiles (when visible) ───────────────────────────────
  if (showObstacles || tileEditMode) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (tileType(col, row) === 'obstacle') {
          drawObstacleTile(ctx, col, row, h);
        }
      }
    }
  }

  // ── Layer 4: hover highlight ──────────────────────────────────────────────
  if (hoveredTile) {
    const { col, row } = hoveredTile;
    const type = tileType(col, row);
    const canInteract = tileEditMode ? type !== 'path' : type === 'grass';

    if (canInteract) {
      const [tl, tr, br, bl] = h.tileScreenCorners(col, row);
      const fill   = tileEditMode ? TILE_EDIT_FILL   : HOVER_FILL;
      const stroke = tileEditMode ? TILE_EDIT_STROKE : HOVER_STROKE;

      ctx.fillStyle = fill;
      ctx.beginPath();
      traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
      ctx.fill();

      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
      ctx.stroke();
    }
  }

  // ── Layer 5: path direction arrows ────────────────────────────────────────
  for (const [key, dir] of flowMap) {
    const [c, r] = key.split(',').map(Number);
    const [cx, cy] = h.perspCenter(c, r);
    drawArrow(ctx, cx, cy, dir);
  }

  // ── Layer 6: entrance / base labels ──────────────────────────────────────
  const entry = waypoints[0];
  const base  = waypoints[waypoints.length - 1];
  const [eCx, eCy] = h.perspCenter(entry.col, entry.row);
  const [bCx, bCy] = h.perspCenter(base.col,  base.row);
  drawLabel(ctx, eCx, eCy, 'ENTRANCE');
  drawLabel(ctx, bCx, bCy, 'BASE');

  // ── Layer 7: placed towers ────────────────────────────────────────────────
  for (const tower of towers) {
    drawTowerPlaceholder(ctx, tower.col, tower.row, tower.type, h);
  }
}

// ── Enemy rendering ───────────────────────────────────────────────────────────

const ENEMY_HALF = 32;   // half-size of rendered enemy (screen px) ≈ one tile width
const HP_BAR_W   = 56;   // total HP bar width  (screen px)
const HP_BAR_H   = 6;    // HP bar height       (screen px)
const HP_BAR_GAP = 4;    // gap between HP bar bottom and sprite top

// Sprite sheet: 384×48 px | 8 frames | each frame 48×48 px
const FRAME_W  = 48;     // source px per frame
const FRAME_H  = 48;     // source frame height
const FRAME_MS = 125;    // ms per frame = 1 000 / 8 fps

/**
 * Map an enemy's current movement segment directly to a sprite-sheet base frame.
 * Frame layout (0-indexed columns in the 384×48 sheet, each frame 48 px wide):
 *   0-1  walking south (down, toward camera)
 *   2-3  walking west  (left)
 *   4-5  walking east  (right)
 *   6-7  walking north (up, away from camera)
 */
function enemyBaseFrame(enemy: Enemy, waypoints: readonly Waypoint[]): number {
  const a = waypoints[enemy.waypointIndex];
  const b = waypoints[Math.min(enemy.waypointIndex + 1, waypoints.length - 1)];
  if (!a || !b) return 0;

  const dc = b.col - a.col;   // positive = east, negative = west
  const dr = b.row - a.row;   // positive = south, negative = north

  if (dc < 0) return 2;       // moving left  → west  frames
  if (dc > 0) return 4;       // moving right → east  frames
  if (dr < 0) return 6;       // moving up    → north frames
  return 0;                   // moving down (or stationary) → south frames
}

/**
 * Draw all living enemies onto the canvas.
 * Call this AFTER renderMap so enemies render on top of all map layers.
 * @param timestamp  performance.now() value from the rAF tick — drives animation
 */
export function drawEnemies(
  ctx:        CanvasRenderingContext2D,
  enemies:    readonly Enemy[],
  waypoints:  readonly Waypoint[],
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  spriteImg:  HTMLImageElement | null = null,
  timestamp:  number = performance.now(),
): void {
  if (enemies.length === 0) return;
  const { perspPoint } = makeHelpers(gridConfig);

  // Y-sort: draw back-to-front so enemies closer to the camera (higher row)
  // always render on top of enemies further away (lower row).
  const sorted = enemies
    .filter(e => e.alive)
    .sort((a, b) => {
      const posA = enemyGridPos(a, waypoints);
      const posB = enemyGridPos(b, waypoints);
      return posA.row - posB.row;   // ascending → furthest drawn first
    });

  // Global animation offset: 0 or 1, toggling at 8 fps
  const animOffset = Math.floor(timestamp / FRAME_MS) % 2;

  for (const enemy of sorted) {
    // Centre the sprite in the path tile (+0.5 shifts from corner to tile centre)
    const gPos     = enemyGridPos(enemy, waypoints);
    const [cx, cy] = perspPoint(gPos.col + 0.5, gPos.row + 0.5);

    // Sprite-sheet column: base frame for direction + 0/1 animation toggle
    const frameIdx = enemyBaseFrame(enemy, waypoints) + animOffset;
    const srcX     = frameIdx * FRAME_W;

    // ── Sprite or placeholder ──────────────────────────────────────────────
    if (spriteImg) {
      ctx.drawImage(
        spriteImg,
        srcX, 0, FRAME_W, FRAME_H,                      // source rect
        cx - ENEMY_HALF, cy - ENEMY_HALF,                // dest position
        ENEMY_HALF * 2,  ENEMY_HALF * 2,                 // dest size
      );
    } else {
      // ── Placeholder skull (shown until skeleton.png is provided) ─────────
      ctx.fillStyle = 'rgba(18, 12, 8, 0.90)';
      ctx.beginPath();
      ctx.arc(cx, cy, ENEMY_HALF, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(155, 135, 95, 0.80)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ENEMY_HALF, 0, Math.PI * 2);
      ctx.stroke();

      // Eye sockets
      ctx.fillStyle = 'rgba(210, 190, 145, 0.92)';
      ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 9, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(4, 2, 0, 1)';
      ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 9, cy - 6, 4, 0, Math.PI * 2); ctx.fill();

      // Nose
      ctx.fillStyle = 'rgba(4, 2, 0, 0.88)';
      ctx.beginPath(); ctx.arc(cx, cy + 3, 3, 0, Math.PI * 2); ctx.fill();

      // Teeth
      ctx.fillStyle = 'rgba(210, 190, 145, 0.88)';
      ctx.fillRect(cx - 13, cy + 13, 6, 8);
      ctx.fillRect(cx -  4, cy + 13, 6, 8);
      ctx.fillRect(cx +  5, cy + 13, 6, 8);

      ctx.fillStyle    = 'rgba(255, 160, 0, 0.70)';
      ctx.font         = '8px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('AWAITING ASSET: skeleton.png', cx, cy + ENEMY_HALF + 3);
    }

    // ── HP bar ─────────────────────────────────────────────────────────────
    const pct  = Math.max(0, enemy.hp / enemy.maxHp);
    const barX = cx - HP_BAR_W / 2;
    const barY = cy - ENEMY_HALF - HP_BAR_GAP - HP_BAR_H;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, HP_BAR_W + 2, HP_BAR_H + 2, 3);
    ctx.fill();

    // Track
    ctx.fillStyle = 'rgba(45,45,45,0.95)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, HP_BAR_W, HP_BAR_H, 2);
    ctx.fill();

    // Fill
    if (pct > 0) {
      ctx.fillStyle = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(barX, barY, HP_BAR_W * pct, HP_BAR_H, 2);
      ctx.fill();
    }
  }
}
