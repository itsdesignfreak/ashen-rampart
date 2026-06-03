import type { Direction, LevelData, Tower, TowerType, TileOverrides, Waypoint, Projectile, ActiveBeam } from '../types';
import type { Enemy } from './enemy';
import { enemyGridPos } from './enemy';
import { TOWER_STATS, towerOccupies } from './towerData';
import type { CatNpc } from './catNpc';
import { CAT_FRAME_W, CAT_FRAME_H, catFrameSx, IDLE_FRAME_W, IDLE_FRAME_H, catIdleFrameSx } from './catNpc';
import type { BirdNpc } from './birdNpc';
import { BIRD_FRAME_W, BIRD_FRAME_H, BIRD_DRAW_SIZE, birdFrameSx } from './birdNpc';
import {
  TILE_W, TILE_H, CANVAS_WIDTH, CANVAS_HEIGHT,
  GRID_COLS, GRID_ROWS, GRID_PERSPECTIVE_MAX_DEG,
  GRID_ROTATE_X_DEG, GRID_PERSP_D,
  TILE_GAP, TILE_RADIUS,
  GRID_OFFSET_X, GRID_OFFSET_Y,
  TOWER_FOOTPRINT,
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

/** Map a fractional grid coordinate to canvas-internal pixels (1448×1086 space). */
export function gridToCanvasPx(
  col: number, row: number,
  cfg: GridConfig = DEFAULT_GRID_CONFIG,
): [number, number] {
  return makeHelpers(cfg).perspPoint(col, row);
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
const SELL_STROKE      = 'rgba(239,68,68,0.90)';

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

/**
 * Draw a perspective-correct range ring around tile (col, row).
 * Uses perspPoint to trace a circle of radius `range` tiles in grid-space.
 */
function drawRangeRing(
  ctx:         CanvasRenderingContext2D,
  col:         number,
  row:         number,
  range:       number,
  fillStyle:   string,
  strokeStyle: string,
  h:           ReturnType<typeof makeHelpers>,
  steps =      72,
) {
  const cx = col + 0.5;
  const cy = row + 0.5;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const gx = cx + Math.cos(angle) * range;
    const gy = cy + Math.sin(angle) * range;
    const [sx, sy] = h.perspPoint(gx, gy);
    if (i === 0) ctx.moveTo(sx, sy);
    else         ctx.lineTo(sx, sy);
  }
  ctx.closePath();

  ctx.fillStyle = fillStyle;
  ctx.fill();

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

const TOWER_W = 64;   // sprite width  (px) — drawn at TOWER_W × TOWER_FOOTPRINT
const TOWER_H = 376;  // sprite height (px) — bottom-anchored at tile perspCenter (like enemies)

function drawTowerPlaceholder(
  ctx:  CanvasRenderingContext2D,
  col:  number,
  row:  number,
  type: TowerType,
  h:    ReturnType<typeof makeHelpers>,
  img?: HTMLImageElement,
) {
  const FP = TOWER_FOOTPRINT;
  // Centre of the FP×FP footprint block
  const [cx, cy] = h.perspPoint(col + FP / 2, row + FP / 2);
  const drawW = TOWER_W * FP;

  if (img) {
    // Bottom of sprite sits slightly below the footprint centre
    ctx.drawImage(img, cx - drawW / 2, cy - TOWER_H + 50, drawW, TOWER_H);
    return;
  }

  // ── Placeholder (shown until sprite is provided) ──────────────────────────
  const stats = TOWER_STATS[type];

  // Dark overlay over every tile in the footprint
  for (let dr = 0; dr < FP; dr++) {
    for (let dc = 0; dc < FP; dc++) {
      const [tl, tr, br, bl] = h.tileScreenCorners(col + dc, row + dr);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
      ctx.fill();
    }
  }

  ctx.fillStyle = stats.color;
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stats.abbrev, cx, cy - 5);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '8px monospace';
  ctx.fillText(stats.label.toUpperCase(), cx, cy + 10);
}

// ── Public render entry-point ─────────────────────────────────────────────────

export interface HoveredTile { col: number; row: number }

/** A tower that hasn't been placed yet — shown as a semi-transparent preview. */
export interface GhostTower { col: number; row: number; type: TowerType }

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
  ghostTower: GhostTower | null = null,
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
    const type     = tileType(col, row);
    const hasTower = towers.some(t => towerOccupies(t, col, row));

    if (tileEditMode && type !== 'path') {
      // Tile-edit mode: single-tile red highlight
      const [tl, tr, br, bl] = h.tileScreenCorners(col, row);
      ctx.fillStyle   = TILE_EDIT_FILL;   ctx.beginPath(); traceRoundedQuad(ctx, tl, tr, br, bl, h.radius); ctx.fill();
      ctx.strokeStyle = TILE_EDIT_STROKE; ctx.lineWidth = 2; ctx.beginPath(); traceRoundedQuad(ctx, tl, tr, br, bl, h.radius); ctx.stroke();
    } else if (!tileEditMode && !hasTower && ghostTower) {
      // Placement mode: green highlight over the full FP×FP ghost footprint
      const FP = TOWER_FOOTPRINT;
      for (let dr = 0; dr < FP; dr++) {
        for (let dc = 0; dc < FP; dc++) {
          const [tl, tr, br, bl] = h.tileScreenCorners(ghostTower.col + dc, ghostTower.row + dr);
          ctx.fillStyle   = HOVER_FILL;   ctx.beginPath(); traceRoundedQuad(ctx, tl, tr, br, bl, h.radius); ctx.fill();
          ctx.strokeStyle = HOVER_STROKE; ctx.lineWidth = 2; ctx.beginPath(); traceRoundedQuad(ctx, tl, tr, br, bl, h.radius); ctx.stroke();
        }
      }
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

  // ── Layer 6.5: range rings (drawn behind placed towers) ──────────────────
  const FP = TOWER_FOOTPRINT;
  // Ghost range ring — centred on the FP×FP footprint
  if (ghostTower) {
    const gs = TOWER_STATS[ghostTower.type];
    drawRangeRing(ctx, ghostTower.col + FP / 2 - 0.5, ghostTower.row + FP / 2 - 0.5,
                  gs.range, gs.ringFill, gs.ringStroke, h);
  }
  // Sell-hover range ring
  if (hoveredTile && !tileEditMode) {
    const ht = towers.find(t => towerOccupies(t, hoveredTile.col, hoveredTile.row));
    if (ht) {
      const hs = TOWER_STATS[ht.type];
      drawRangeRing(ctx, ht.col + FP / 2 - 0.5, ht.row + FP / 2 - 0.5,
                    hs.range, hs.ringFill, hs.ringStroke, h);
    }
  }

}

// ── Per-entity draw exports — used by GameCanvas for the combined Y-sort ──────

/** Draw a single tower sprite (or placeholder). */
export function drawTowerSprite(
  ctx:        CanvasRenderingContext2D,
  tower:      Tower,
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  img?:       HTMLImageElement,
): void {
  drawTowerPlaceholder(ctx, tower.col, tower.row, tower.type, makeHelpers(gridConfig), img);
}

/** Draw the sell-hover outline over a tower's footprint. Call after all entity sprites. */
export function drawSellHoverOverlay(
  ctx:          CanvasRenderingContext2D,
  towers:       Tower[],
  hoveredTile:  HoveredTile | null,
  tileEditMode: boolean,
  gridConfig:   GridConfig = DEFAULT_GRID_CONFIG,
): void {
  if (!hoveredTile || tileEditMode) return;
  const FP = TOWER_FOOTPRINT;
  const h  = makeHelpers(gridConfig);
  const ht = towers.find(t => towerOccupies(t, hoveredTile.col, hoveredTile.row));
  if (!ht) return;

  const [tl]     = h.tileScreenCorners(ht.col,          ht.row);
  const [, tr]   = h.tileScreenCorners(ht.col + FP - 1, ht.row);
  const [,, br]  = h.tileScreenCorners(ht.col + FP - 1, ht.row + FP - 1);
  const [,,, bl] = h.tileScreenCorners(ht.col,           ht.row + FP - 1);

  ctx.strokeStyle = SELL_STROKE;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  traceRoundedQuad(ctx, tl, tr, br, bl, h.radius);
  ctx.stroke();

  const [cx, cy] = h.perspPoint(ht.col + FP / 2, ht.row + FP / 2);
  drawLabel(ctx, cx, cy + 16, 'SELL');
}

/** Draw the ghost tower placement preview. Call after all entity sprites. */
export function drawGhostTowerOverlay(
  ctx:        CanvasRenderingContext2D,
  ghost:      GhostTower | null,
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  img?:       HTMLImageElement,
): void {
  if (!ghost) return;
  const h = makeHelpers(gridConfig);
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawTowerPlaceholder(ctx, ghost.col, ghost.row, ghost.type, h, img);
  ctx.restore();
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

// Internal: draw one alive enemy given a pre-built perspPoint fn.
function drawOneEnemy(
  ctx:        CanvasRenderingContext2D,
  enemy:      Enemy,
  waypoints:  readonly Waypoint[],
  perspPoint: (col: number, row: number) => [number, number],
  spriteImg:  HTMLImageElement | null,
  timestamp:  number,
): void {
  const animOffset = Math.floor(timestamp / FRAME_MS) % 2;
  const gPos       = enemyGridPos(enemy, waypoints);
  const [cx, cy]   = perspPoint(gPos.col + 0.5, gPos.row + 0.5);
  const frameIdx   = enemyBaseFrame(enemy, waypoints) + animOffset;
  const srcX       = frameIdx * FRAME_W;

  if (spriteImg) {
    ctx.drawImage(spriteImg, srcX, 0, FRAME_W, FRAME_H, cx - ENEMY_HALF, cy - ENEMY_HALF, ENEMY_HALF * 2, ENEMY_HALF * 2);
  } else {
    ctx.fillStyle = 'rgba(18, 12, 8, 0.90)';
    ctx.beginPath(); ctx.arc(cx, cy, ENEMY_HALF, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(155, 135, 95, 0.80)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, ENEMY_HALF, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(210, 190, 145, 0.92)';
    ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 9, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(4, 2, 0, 1)';
    ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 9, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(4, 2, 0, 0.88)';
    ctx.beginPath(); ctx.arc(cx, cy + 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(210, 190, 145, 0.88)';
    ctx.fillRect(cx - 13, cy + 13, 6, 8); ctx.fillRect(cx - 4, cy + 13, 6, 8); ctx.fillRect(cx + 5, cy + 13, 6, 8);
    ctx.fillStyle = 'rgba(255, 160, 0, 0.70)'; ctx.font = '8px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('AWAITING ASSET: skeleton.png', cx, cy + ENEMY_HALF + 3);
  }

  const pct  = Math.max(0, enemy.hp / enemy.maxHp);
  const barX = cx - HP_BAR_W / 2;
  const barY = cy - ENEMY_HALF - HP_BAR_GAP - HP_BAR_H;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath(); ctx.roundRect(barX - 1, barY - 1, HP_BAR_W + 2, HP_BAR_H + 2, 3); ctx.fill();
  ctx.fillStyle = 'rgba(45,45,45,0.95)';
  ctx.beginPath(); ctx.roundRect(barX, barY, HP_BAR_W, HP_BAR_H, 2); ctx.fill();
  if (pct > 0) {
    ctx.fillStyle = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444';
    ctx.beginPath(); ctx.roundRect(barX, barY, HP_BAR_W * pct, HP_BAR_H, 2); ctx.fill();
  }
}

/** Draw a single alive enemy. Used in the combined entity Y-sort pass. */
export function drawSingleEnemy(
  ctx:        CanvasRenderingContext2D,
  enemy:      Enemy,
  waypoints:  readonly Waypoint[],
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  spriteImg:  HTMLImageElement | null = null,
  timestamp:  number = performance.now(),
): void {
  const { perspPoint } = makeHelpers(gridConfig);
  drawOneEnemy(ctx, enemy, waypoints, perspPoint, spriteImg, timestamp);
}

/** Draw all living enemies (legacy batch call — still used if needed). */
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
  const sorted = [...enemies]
    .filter(e => e.alive)
    .sort((a, b) => enemyGridPos(a, waypoints).row - enemyGridPos(b, waypoints).row);
  for (const enemy of sorted) drawOneEnemy(ctx, enemy, waypoints, perspPoint, spriteImg, timestamp);
}

// ── Projectile rendering ──────────────────────────────────────────────────────

const PROJ_COLORS: Record<string, string> = {
  arrow:  'rgba(255,255,220,0.95)',
  mage:   'rgba(200,100,255,0.95)',
  cannon: 'rgba(80,70,60,0.95)',
};

const PROJ_GLOW: Record<string, string> = {
  arrow:  'rgba(255,255,180,0.35)',
  mage:   'rgba(180,50,255,0.45)',
  cannon: 'rgba(120,100,80,0.25)',
};

const PROJ_RADIUS: Record<string, number> = {
  arrow:  3,
  mage:   5,
  cannon: 6,
};

const ARROW_SPRITE_SIZE  = 40;  // screen px — square draw size for arrow.png
const CANNON_SPRITE_SIZE = 20;  // screen px — cannon-ball is smaller and doesn't rotate
// Per-type base sizes for hit effects (screen px)
const HIT_EFFECT_BASE_PX: Partial<Record<TowerType, number>> = {
  arrow:  24,
  cannon: 200,
};
const HIT_EFFECT_DURATION = 500; // ms — how long the effect plays

// Number of horizontal frames in a hit-effect sprite sheet (1 = single image)
const HIT_EFFECT_FRAMES: Partial<Record<TowerType, number>> = {
  cannon: 4,
};

// If set, locks the effect to a specific frame (0-indexed) instead of animating.
// Remove the entry to revert to full animation.
const HIT_EFFECT_PINNED_FRAME: Partial<Record<TowerType, number>> = {
  cannon: 1, // frame 2 (0-indexed)
};

export interface HitEffect {
  type:       TowerType;
  x:          number;       // grid col (fractional, impact point)
  y:          number;       // grid row (fractional, impact point)
  startMs:    number;
  durationMs: number;
  followId?:  number;       // if set, effect tracks this enemy's live position
}

/** Convenience factory — call from GameCanvas when onHit fires. */
export function createHitEffect(
  type:      TowerType,
  x:         number,
  y:         number,
  now:       number,
  followId?: number,   // pass enemy id to make effect track the enemy
): HitEffect {
  return { type, x, y, startMs: now, durationMs: HIT_EFFECT_DURATION, followId };
}

/** Draw all active hit effects. Call after drawProjectiles. */
export function drawHitEffects(
  ctx:          CanvasRenderingContext2D,
  effects:      readonly HitEffect[],
  now:          number,
  gridConfig:   GridConfig = DEFAULT_GRID_CONFIG,
  effectImages: Partial<Record<TowerType, HTMLImageElement>> = {},
  enemies:      readonly Enemy[] = [],
  waypoints:    readonly Waypoint[] = [],
): void {
  if (effects.length === 0) return;
  const { perspPoint } = makeHelpers(gridConfig);

  for (const fx of effects) {
    const elapsed = now - fx.startMs;
    const t       = Math.min(elapsed / fx.durationMs, 1); // 0 → 1
    if (t >= 1) continue;

    // Resolve position — follow the enemy if alive, else fall back to stored x/y
    let drawX = fx.x;
    let drawY = fx.y;
    if (fx.followId !== undefined) {
      const target = enemies.find(e => e.id === fx.followId && e.alive);
      if (target) {
        const pos = enemyGridPos(target, waypoints);
        drawX = pos.col + 0.5;
        drawY = pos.row + 0.5;
      }
    }

    const [sx, sy] = perspPoint(drawX, drawY);
    const basePx   = HIT_EFFECT_BASE_PX[fx.type] ?? 32;
    const alpha    = 1 - t;          // fade out
    const scale    = 1 + t * 1;     // grow from 1× → 2×
    const size     = basePx * scale;
    const img      = effectImages[fx.type];

    ctx.save();
    ctx.globalAlpha = alpha;

    if (img) {
      const frameCount   = HIT_EFFECT_FRAMES[fx.type] ?? 1;
      const pinnedFrame  = HIT_EFFECT_PINNED_FRAME[fx.type];
      const isPinned     = pinnedFrame !== undefined;

      // Pinned mode uses the same grow animation, just locked to one frame
      const drawSize     = size;
      const frameIndex   = isPinned
        ? pinnedFrame!
        : Math.min(Math.floor(t * frameCount), frameCount - 1);

      if (frameCount > 1) {
        const frameW = img.naturalWidth  / frameCount;
        const frameH = img.naturalHeight;
        ctx.drawImage(img, frameIndex * frameW, 0, frameW, frameH, sx - drawSize / 2, sy - drawSize / 2, drawSize, drawSize);
      } else {
        ctx.drawImage(img, sx - drawSize / 2, sy - drawSize / 2, drawSize, drawSize);
      }
    } else {
      // Fallback: bright ring
      ctx.strokeStyle = fx.type === 'mage' ? '#c084fc' : fx.type === 'cannon' ? '#fb923c' : '#fef08a';
      ctx.lineWidth   = 3 * (1 - t);
      ctx.beginPath();
      ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/** Draw all living projectiles. Call after the entity Y-sort pass. */
export function drawProjectiles(
  ctx:         CanvasRenderingContext2D,
  projectiles: readonly Projectile[],
  gridConfig:  GridConfig = DEFAULT_GRID_CONFIG,
  projImages:  Partial<Record<TowerType, HTMLImageElement>> = {},
): void {
  if (projectiles.length === 0) return;
  const { perspPoint } = makeHelpers(gridConfig);

  for (const proj of projectiles) {
    if (!proj.alive) continue;

    const [sx, sy] = perspPoint(proj.x, proj.y);
    const img      = projImages[proj.type];

    if (img) {
      if (proj.type === 'cannon') {
        // Cannonball is spherical — draw centred, no rotation
        const half = CANNON_SPRITE_SIZE / 2;
        ctx.drawImage(img, sx - half, sy - half, CANNON_SPRITE_SIZE, CANNON_SPRITE_SIZE);
      } else {
        // Arrow (and future directional projectiles) — rotate toward target
        const [tx, ty] = perspPoint(proj.targetX, proj.targetY);
        const angle    = Math.atan2(ty - sy, tx - sx);
        const half     = ARROW_SPRITE_SIZE / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.drawImage(img, -half, -half, ARROW_SPRITE_SIZE, ARROW_SPRITE_SIZE);
        ctx.restore();
      }
      continue;
    }

    // ── Placeholder circles (fallback when no sprite is provided) ─────────────
    const r     = PROJ_RADIUS[proj.type]  ?? 4;
    const color = PROJ_COLORS[proj.type]  ?? '#fff';
    const glow  = PROJ_GLOW[proj.type];

    if (glow) {
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ── Mage beam rendering ───────────────────────────────────────────────────────

function drawLaserBeam(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
) {
  ctx.save();
  ctx.lineCap = 'round';

  const makeGrad = (nearAlpha: number, farColor: string) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0,    `rgba(220,30,30,${nearAlpha})`);
    g.addColorStop(0.35, farColor);
    g.addColorStop(1,    farColor);
    return g;
  };

  ctx.strokeStyle = makeGrad(0,    'rgba(220,30,30,0.18)'); ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = makeGrad(0,    'rgba(255,60,60,0.45)'); ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = makeGrad(0.05, 'rgba(255,140,140,0.85)'); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = makeGrad(0.1,  'rgba(255,240,240,0.95)'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

  ctx.restore();
}

// ── Cat NPC rendering ─────────────────────────────────────────────────────────

const CAT_DRAW_SIZE = 56;  // rendered px for walk sprite (source 48×48)
const CAT_ANCHOR_Y  = -CAT_DRAW_SIZE / 2; // vertical offset from tile centre

// Idle sprite rendered at same visual size for a smooth transition
const IDLE_DRAW_SIZE = CAT_DRAW_SIZE;

/**
 * Draw the cat NPC.  Automatically switches between walk and idle sprite
 * sheets based on cat.state.  Call inside the Y-sort entity pass.
 */
export function drawCatNpc(
  ctx:        CanvasRenderingContext2D,
  cat:        CatNpc,
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
  walkImg?:   HTMLImageElement | null,
  idleImg?:   HTMLImageElement | null,
): void {
  const { perspPoint } = makeHelpers(gridConfig);
  const [sx, sy] = perspPoint(cat.x, cat.y);

  ctx.save();
  ctx.translate(sx, sy);

  if (cat.state === 'idle' && idleImg) {
    // ── Bathing idle animation ──────────────────────────────────────────────
    ctx.drawImage(
      idleImg,
      catIdleFrameSx(cat), 0,          // source x, y
      IDLE_FRAME_W, IDLE_FRAME_H,       // source w, h
      -IDLE_DRAW_SIZE / 2, CAT_ANCHOR_Y, // dest x, y
      IDLE_DRAW_SIZE, IDLE_DRAW_SIZE,    // dest w, h
    );
  } else if (walkImg) {
    // ── Walk animation ──────────────────────────────────────────────────────
    ctx.drawImage(
      walkImg,
      catFrameSx(cat), 0,              // source x, y
      CAT_FRAME_W, CAT_FRAME_H,         // source w, h
      -CAT_DRAW_SIZE / 2, CAT_ANCHOR_Y, // dest x, y
      CAT_DRAW_SIZE, CAT_DRAW_SIZE,      // dest w, h
    );
  } else {
    // Placeholder (no image loaded yet)
    ctx.fillStyle = 'rgba(255,200,100,0.85)';
    ctx.fillRect(-CAT_DRAW_SIZE / 2, CAT_ANCHOR_Y, CAT_DRAW_SIZE, CAT_DRAW_SIZE);
    ctx.fillStyle = '#333';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat.state === 'idle' ? 'CAT~' : 'CAT', 0, CAT_ANCHOR_Y + CAT_DRAW_SIZE / 2);
  }

  ctx.restore();
}

// ── Bird NPC rendering ────────────────────────────────────────────────────────
// Birds use raw canvas-pixel coordinates and are drawn on top of everything.

/**
 * Draw a single bird at its canvas-pixel position.
 * Call AFTER the Y-sort pass so birds render above all other entities.
 */
export function drawBirdNpc(
  ctx: CanvasRenderingContext2D,
  bird: BirdNpc,
  img?: HTMLImageElement | null,
): void {
  ctx.save();
  ctx.translate(bird.x, bird.y);

  // Flip horizontally when flying right-to-left
  if (bird.dir === -1) ctx.scale(-1, 1);

  if (img) {
    ctx.drawImage(
      img,
      birdFrameSx(bird), 0,                    // source x, y
      BIRD_FRAME_W, BIRD_FRAME_H,               // source w, h
      -BIRD_DRAW_SIZE / 2, -BIRD_DRAW_SIZE / 2, // dest x, y (centred)
      BIRD_DRAW_SIZE, BIRD_DRAW_SIZE,            // dest w, h
    );
  } else {
    ctx.fillStyle = 'rgba(120,180,255,0.8)';
    ctx.fillRect(-BIRD_DRAW_SIZE / 2, -BIRD_DRAW_SIZE / 2, BIRD_DRAW_SIZE, BIRD_DRAW_SIZE);
    ctx.fillStyle = '#000';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIRD', 0, 4);
  }

  ctx.restore();
}

/** Draw all active mage beams. Add each beam to the Y-sort pass in GameCanvas. */
export function drawBeam(
  ctx:        CanvasRenderingContext2D,
  beam:       ActiveBeam,
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
): void {
  const { perspPoint } = makeHelpers(gridConfig);
  const [x1, y1] = perspPoint(beam.fromX, beam.fromY);
  const [x2, y2] = perspPoint(beam.targetX, beam.targetY);
  drawLaserBeam(ctx, x1, y1, x2, y2);
}

// ── Floating numbers (+/- gold feedback) ──────────────────────────────────────

export interface FloatingNumber {
  id:      number;
  text:    string;
  color:   string;   // canvas fillStyle
  col:     number;   // fractional grid col
  row:     number;   // fractional grid row
  startMs: number;   // performance.now() at spawn
}

const FLOAT_DURATION = 850;  // ms — must match the prune timeout in App
const FLOAT_RISE_PX  = 60;   // canvas px the number drifts upward

/** Draw all active floating numbers. Call last so they sit above everything. */
export function drawFloatingNumbers(
  ctx:        CanvasRenderingContext2D,
  numbers:    FloatingNumber[],
  now:        number,
  gridConfig: GridConfig = DEFAULT_GRID_CONFIG,
): void {
  const { perspPoint } = makeHelpers(gridConfig);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px Cinzel, Georgia, serif';

  for (const n of numbers) {
    const t = (now - n.startMs) / FLOAT_DURATION;
    if (t < 0 || t > 1) continue;

    const [px, py] = perspPoint(n.col, n.row);
    const y = py - t * FLOAT_RISE_PX;
    // Pop in fast, fade out toward the end
    const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.lineWidth   = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(n.text, px, y);
    ctx.fillStyle   = n.color;
    ctx.fillText(n.text, px, y);
  }

  ctx.restore();
}
