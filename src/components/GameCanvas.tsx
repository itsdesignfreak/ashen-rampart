import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_BG_SRC } from '../constants';
import { renderMap, perspHitTest } from '../engine/mapRenderer';
import type { HoveredTile } from '../engine/mapRenderer';
import type { Tower, TowerType } from '../types';
import { LEVEL1 } from '../data/level1';

interface Props {
  selectedTower: TowerType | null;
  towers: Tower[];
  onPlaceTower: (col: number, row: number) => void;
}

export function GameCanvas({ selectedTower, towers, onPlaceTower }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const bgImageRef       = useRef<HTMLImageElement | null>(null);
  const hoveredRef       = useRef<HoveredTile | null>(null);
  const selectedTowerRef = useRef<TowerType | null>(null);
  const towersRef        = useRef<Tower[]>([]);
  const onPlaceTowerRef  = useRef(onPlaceTower);

  // Keep refs in sync with latest props — no stale closures in canvas callbacks
  selectedTowerRef.current = selectedTower;
  towersRef.current        = towers;
  onPlaceTowerRef.current  = onPlaceTower;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderMap(ctx, LEVEL1, bgImageRef.current, hoveredRef.current, towersRef.current);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => { bgImageRef.current = img; redraw(); };
    img.onerror = () => redraw();
    img.src = MAP_BG_SRC;
  }, [redraw]);

  // Redraw when towers change
  useEffect(() => { redraw(); }, [towers, redraw]);

  /** Convert a mouse event to grid (col, row) using the perspective hit-test. */
  const tileAt = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH  / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const sx     = (e.clientX - rect.left) * scaleX;
    const sy     = (e.clientY - rect.top)  * scaleY;
    return perspHitTest(sx, sy);
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

    const isGrass  = LEVEL1.grid[row][col] === 'grass';
    const hasTower = towersRef.current.some(t => t.col === col && t.row === row);
    const canPlace = isGrass && !hasTower && selectedTowerRef.current !== null;
    canvas.style.cursor = canPlace ? 'pointer' : 'default';

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
    if (!selectedTowerRef.current) return;
    if (LEVEL1.grid[row][col] !== 'grass') return;
    if (towersRef.current.some(t => t.col === col && t.row === row)) return;
    onPlaceTowerRef.current(col, row);
  }, [tileAt]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block border border-stone-700"
      aria-label="Ashen Rampart game canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}
