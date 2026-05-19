import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_BG_SRC } from '../constants';
import { renderMap, perspHitTest } from '../engine/mapRenderer';
import type { HoveredTile, GridConfig } from '../engine/mapRenderer';
import { DEFAULT_GRID_CONFIG } from '../engine/mapRenderer';
import type { Tower, TowerType, TileOverrides } from '../types';
import { LEVEL1 } from '../data/level1';

interface Props {
  selectedTower: TowerType | null;
  towers: Tower[];
  onPlaceTower: (col: number, row: number) => void;
  gridConfig?: GridConfig;
  tileOverrides?: TileOverrides;
  tileEditMode?: boolean;
  onToggleTile?: (col: number, row: number) => void;
}

export function GameCanvas({ selectedTower, towers, onPlaceTower, gridConfig, tileOverrides, tileEditMode, onToggleTile }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const bgImageRef       = useRef<HTMLImageElement | null>(null);
  const hoveredRef       = useRef<HoveredTile | null>(null);
  const selectedTowerRef = useRef<TowerType | null>(null);
  const towersRef        = useRef<Tower[]>([]);
  const onPlaceTowerRef  = useRef(onPlaceTower);
  const gridConfigRef    = useRef<GridConfig>(gridConfig ?? DEFAULT_GRID_CONFIG);
  const tileOverridesRef = useRef<TileOverrides>(tileOverrides ?? {});
  const tileEditModeRef  = useRef(tileEditMode ?? false);
  const onToggleTileRef  = useRef(onToggleTile);

  // Keep refs in sync with latest props — no stale closures in canvas callbacks
  selectedTowerRef.current  = selectedTower;
  towersRef.current         = towers;
  onPlaceTowerRef.current   = onPlaceTower;
  gridConfigRef.current     = gridConfig ?? DEFAULT_GRID_CONFIG;
  tileOverridesRef.current  = tileOverrides ?? {};
  tileEditModeRef.current   = tileEditMode ?? false;
  onToggleTileRef.current   = onToggleTile;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderMap(
      ctx, LEVEL1, bgImageRef.current,
      hoveredRef.current, towersRef.current,
      gridConfigRef.current, tileOverridesRef.current, tileEditModeRef.current,
    );
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => { bgImageRef.current = img; redraw(); };
    img.onerror = () => redraw();
    img.src = MAP_BG_SRC;
  }, [redraw]);

  // Redraw when towers, gridConfig, overrides, or edit mode change
  useEffect(() => { redraw(); }, [towers, gridConfig, tileOverrides, tileEditMode, redraw]);

  /** Convert a mouse event to grid (col, row) using the perspective hit-test. */
  const tileAt = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH  / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const sx     = (e.clientX - rect.left) * scaleX;
    const sy     = (e.clientY - rect.top)  * scaleY;
    return perspHitTest(sx, sy, gridConfigRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const tile = tileAt(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!tile) {
      if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        canvas.style.cursor = 'default';
        redraw();
      }
      return;
    }

    const { col, row } = tile;
    const prev = hoveredRef.current;
    if (prev?.col === col && prev?.row === row) return;

    hoveredRef.current = { col, row };

    const effectiveType = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row][col];
    if (tileEditModeRef.current) {
      canvas.style.cursor = effectiveType !== 'path' ? 'crosshair' : 'default';
    } else {
      const hasTower = towersRef.current.some(t => t.col === col && t.row === row);
      const canPlace = effectiveType === 'grass' && !hasTower && selectedTowerRef.current !== null;
      canvas.style.cursor = canPlace ? 'pointer' : 'default';
    }

    redraw();
  }, [tileAt, redraw]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
    redraw();
  }, [redraw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const tile = tileAt(e);
    if (!tile) return;
    const { col, row } = tile;

    if (tileEditModeRef.current) {
      const effectiveType = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row][col];
      if (effectiveType !== 'path') onToggleTileRef.current?.(col, row);
      return;
    }

    if (!selectedTowerRef.current) return;
    const effectiveType = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row][col];
    if (effectiveType !== 'grass') return;
    if (towersRef.current.some(t => t.col === col && t.row === row)) return;
    onPlaceTowerRef.current(col, row);
  }, [tileAt]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block border border-stone-700"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
      aria-label="Ashen Rampart game canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}
