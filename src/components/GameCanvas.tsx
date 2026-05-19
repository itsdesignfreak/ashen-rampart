import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_BG_SRC, WAVE_SPAWN_INTERVAL, WAVE_ENEMY_COUNT } from '../constants';
import { renderMap, drawEnemies, perspHitTest } from '../engine/mapRenderer';
import type { HoveredTile, GridConfig, GhostTower } from '../engine/mapRenderer';
import { DEFAULT_GRID_CONFIG } from '../engine/mapRenderer';
import { TOWER_STATS } from '../engine/towerData';
import type { Tower, TowerType, TileOverrides } from '../types';
// Tower sprite filenames keyed by TowerType
const TOWER_SPRITE_FILE: Record<TowerType, string> = {
  arrow:  'archer.png',
  mage:   'mage.png',
  cannon: 'cannon.png',
};
import { LEVEL1 } from '../data/level1';
import type { Enemy } from '../engine/enemy';
import { createEnemy, updateEnemy } from '../engine/enemy';

interface Props {
  selectedTower:        TowerType | null;
  towers:               Tower[];
  onPlaceTower:         (col: number, row: number) => void;
  gridConfig?:          GridConfig;
  tileOverrides?:       TileOverrides;
  tileEditMode?:        boolean;
  onToggleTile?:        (col: number, row: number) => void;
  showObstacles?:       boolean;
  // Wave / enemy
  waveActive?:          boolean;
  onEnemyReachedBase?:  () => void;
  onEnemyKilled?:       () => void;
  onWaveComplete?:      () => void;
  // Tower sell
  onSellTower?:         (col: number, row: number) => void;
}

export function GameCanvas({
  selectedTower, towers, onPlaceTower,
  gridConfig, tileOverrides, tileEditMode, onToggleTile, showObstacles,
  waveActive, onEnemyReachedBase, onEnemyKilled, onWaveComplete,
  onSellTower,
}: Props) {

  // ── Canvas / image refs ────────────────────────────────────────────────────
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const bgImageRef       = useRef<HTMLImageElement | null>(null);
  const skeletonImgRef   = useRef<HTMLImageElement | null>(null);
  const towerImagesRef   = useRef<Partial<Record<TowerType, HTMLImageElement>>>({});

  // ── Prop mirrors (stable refs, no stale-closure risk) ─────────────────────
  const hoveredRef            = useRef<HoveredTile | null>(null);
  const selectedTowerRef      = useRef<TowerType | null>(null);
  const towersRef             = useRef<Tower[]>([]);
  const onPlaceTowerRef       = useRef(onPlaceTower);
  const gridConfigRef         = useRef<GridConfig>(gridConfig ?? DEFAULT_GRID_CONFIG);
  const tileOverridesRef      = useRef<TileOverrides>(tileOverrides ?? {});
  const tileEditModeRef       = useRef(tileEditMode ?? false);
  const onToggleTileRef       = useRef(onToggleTile);
  const showObstaclesRef      = useRef(showObstacles ?? true);
  const waveActiveRef         = useRef(waveActive ?? false);
  const onEnemyReachedBaseRef = useRef(onEnemyReachedBase);
  const onEnemyKilledRef      = useRef(onEnemyKilled);
  const onWaveCompleteRef     = useRef(onWaveComplete);
  const onSellTowerRef        = useRef(onSellTower);

  // Sync every render
  selectedTowerRef.current      = selectedTower;
  towersRef.current             = towers;
  onPlaceTowerRef.current       = onPlaceTower;
  gridConfigRef.current         = gridConfig ?? DEFAULT_GRID_CONFIG;
  tileOverridesRef.current      = tileOverrides ?? {};
  tileEditModeRef.current       = tileEditMode ?? false;
  onToggleTileRef.current       = onToggleTile;
  showObstaclesRef.current      = showObstacles ?? true;
  waveActiveRef.current         = waveActive ?? false;
  onEnemyReachedBaseRef.current = onEnemyReachedBase;
  onEnemyKilledRef.current      = onEnemyKilled;
  onWaveCompleteRef.current     = onWaveComplete;
  onSellTowerRef.current        = onSellTower;

  // ── Wave / enemy state (canvas-only — no React re-renders) ────────────────
  const enemiesRef           = useRef<Enemy[]>([]);
  const prevWaveActiveRef    = useRef(false);
  const spawnedCountRef      = useRef(0);
  const lastSpawnMsRef       = useRef(0);
  const nextEnemyIdRef       = useRef(0);
  const waveCompleteFiredRef = useRef(false);
  const lastTimestampRef     = useRef<number | null>(null);
  const rafRef               = useRef<number | null>(null);

  // ── Render ─────────────────────────────────────────────────────────────────
  const redraw = useCallback((timestamp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute ghost tower: show when hovering an empty grass tile with a tower selected
    let ghost: GhostTower | null = null;
    if (!tileEditModeRef.current && hoveredRef.current && selectedTowerRef.current) {
      const { col, row } = hoveredRef.current;
      const effectiveType = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row]?.[col] ?? 'grass';
      const hasTower = towersRef.current.some(t => t.col === col && t.row === row);
      if (effectiveType === 'grass' && !hasTower) {
        ghost = { col, row, type: selectedTowerRef.current };
      }
    }

    renderMap(
      ctx, LEVEL1, bgImageRef.current,
      hoveredRef.current, towersRef.current,
      gridConfigRef.current, tileOverridesRef.current,
      tileEditModeRef.current, showObstaclesRef.current,
      ghost,
      towerImagesRef.current,
    );

    drawEnemies(
      ctx,
      enemiesRef.current,
      LEVEL1.waypoints,
      gridConfigRef.current,
      skeletonImgRef.current,
      timestamp,                // undefined → drawEnemies falls back to performance.now()
    );
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  const tick = useCallback((timestamp: number) => {
    const dt = lastTimestampRef.current !== null
      ? Math.min((timestamp - lastTimestampRef.current) / 1000, 0.1) // cap at 100 ms
      : 0;
    lastTimestampRef.current = timestamp;

    const isActive  = waveActiveRef.current;
    const wasActive = prevWaveActiveRef.current;

    // Detect wave start (false → true transition) — reset all wave state
    if (isActive && !wasActive) {
      enemiesRef.current           = [];
      spawnedCountRef.current      = 0;
      lastSpawnMsRef.current       = timestamp;
      nextEnemyIdRef.current       = 0;
      waveCompleteFiredRef.current = false;
    }
    prevWaveActiveRef.current = isActive;

    // Spawn next enemy when the interval has elapsed
    if (isActive && spawnedCountRef.current < WAVE_ENEMY_COUNT) {
      if (timestamp - lastSpawnMsRef.current >= WAVE_SPAWN_INTERVAL) {
        enemiesRef.current.push(createEnemy(nextEnemyIdRef.current++));
        spawnedCountRef.current++;
        lastSpawnMsRef.current = timestamp;
      }
    }

    // Advance every living enemy
    for (const enemy of enemiesRef.current) {
      if (!enemy.alive) continue;
      updateEnemy(enemy, LEVEL1.waypoints, dt);
      if (!enemy.alive) {
        if (enemy.reached) {
          onEnemyReachedBaseRef.current?.();
        } else {
          // hp ≤ 0 — killed by a tower (towers fire in a future step)
          onEnemyKilledRef.current?.();
        }
      }
    }

    // Wave complete: all spawned and all dead / reached
    if (
      isActive &&
      spawnedCountRef.current >= WAVE_ENEMY_COUNT &&
      enemiesRef.current.length > 0 &&
      enemiesRef.current.every(e => !e.alive) &&
      !waveCompleteFiredRef.current
    ) {
      waveCompleteFiredRef.current = true;
      onWaveCompleteRef.current?.();
    }

    redraw(timestamp);
    rafRef.current = requestAnimationFrame(tick);
  }, [redraw]);

  // ── Asset loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => { bgImageRef.current = img; };
    img.src    = MAP_BG_SRC;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => { skeletonImgRef.current = img; };
    img.onerror = () => { skeletonImgRef.current = null; };
    img.src = '/assets/enemies/skeleton.png';
  }, []);

  useEffect(() => {
    (Object.entries(TOWER_SPRITE_FILE) as [TowerType, string][]).forEach(([type, file]) => {
      const img = new Image();
      img.onload = () => {
        towerImagesRef.current = { ...towerImagesRef.current, [type]: img };
      };
      // on error: leave undefined → drawTowerPlaceholder falls back to the circle placeholder
      img.src = `/assets/towers/${file}`;
    });
  }, []);

  // ── Start / stop game loop ─────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  // ── Hit-testing helper ─────────────────────────────────────────────────────
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

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const tile   = tileAt(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!tile) {
      if (hoveredRef.current !== null) {
        hoveredRef.current      = null;
        canvas.style.cursor = 'default';
      }
      return;
    }

    const { col, row } = tile;
    const prev = hoveredRef.current;
    if (prev?.col === col && prev?.row === row) return;

    hoveredRef.current = { col, row };

    const effectiveType = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row][col];
    const hasTower = towersRef.current.some(t => t.col === col && t.row === row);
    if (tileEditModeRef.current) {
      canvas.style.cursor = effectiveType !== 'path' ? 'crosshair' : 'default';
    } else if (hasTower) {
      canvas.style.cursor = 'pointer'; // right-click to sell
    } else {
      const canPlace = effectiveType === 'grass' && selectedTowerRef.current !== null;
      canvas.style.cursor = canPlace ? 'pointer' : 'default';
    }
  }, [tileAt]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (tileEditModeRef.current) return;
    const tile = tileAt(e);
    if (!tile) return;
    const { col, row } = tile;
    if (towersRef.current.some(t => t.col === col && t.row === row)) {
      onSellTowerRef.current?.(col, row);
    }
  }, [tileAt]);

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
      onContextMenu={handleContextMenu}
    />
  );
}
