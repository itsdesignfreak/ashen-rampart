import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_BG_SRC, WAVE_SPAWN_INTERVAL, WAVE_ENEMY_COUNT, TOWER_FOOTPRINT } from '../constants';
import {
  renderMap, perspHitTest,
  drawTowerSprite, drawSingleEnemy,
  drawSellHoverOverlay, drawGhostTowerOverlay,
  drawProjectiles, drawHitEffects, createHitEffect,
} from '../engine/mapRenderer';
import type { HoveredTile, GridConfig, GhostTower, HitEffect } from '../engine/mapRenderer';
import { DEFAULT_GRID_CONFIG } from '../engine/mapRenderer';
import { TOWER_STATS, towerOccupies } from '../engine/towerData';
import type { Tower, TowerType, TileOverrides, Projectile } from '../types';
// Tower sprite filenames keyed by TowerType
const TOWER_SPRITE_FILE: Record<TowerType, string> = {
  arrow:  'archer.png',
  mage:   'mage.png',
  cannon: 'cannon.png',
};
import { LEVEL1 } from '../data/level1';
import type { Enemy } from '../engine/enemy';
import { createEnemy, updateEnemy, enemyGridPos } from '../engine/enemy';
import { createProjectile, updateProjectiles } from '../engine/projectile';

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
  const projImagesRef      = useRef<Partial<Record<TowerType, HTMLImageElement>>>({});
  const effectImagesRef    = useRef<Partial<Record<TowerType, HTMLImageElement>>>({});
  const hitEffectsRef      = useRef<HitEffect[]>([]);
  const launchAudioRef     = useRef<Partial<Record<TowerType, HTMLAudioElement>>>({});
  const hitAudioRef        = useRef<Partial<Record<TowerType, HTMLAudioElement>>>({});

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

  // ── Projectile state ───────────────────────────────────────────────────────
  const projectilesRef   = useRef<Projectile[]>([]);
  const nextProjIdRef    = useRef(0);
  // Per-tower last-fire timestamp: key = "col,row"
  const towerLastFireRef = useRef<Record<string, number>>({});

  // ── Render ─────────────────────────────────────────────────────────────────
  const redraw = useCallback((timestamp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute ghost tower: valid only when the full FP×FP footprint is free grass
    let ghost: GhostTower | null = null;
    if (!tileEditModeRef.current && hoveredRef.current && selectedTowerRef.current) {
      const { col, row } = hoveredRef.current;
      const FP = TOWER_FOOTPRINT;
      let canPlace = true;
      outer: for (let dr = 0; dr < FP; dr++) {
        for (let dc = 0; dc < FP; dc++) {
          const c = col + dc, r = row + dr;
          const t = tileOverridesRef.current[`${c},${r}`] ?? LEVEL1.grid[r]?.[c] ?? 'grass';
          if (t !== 'grass' || towersRef.current.some(tw => towerOccupies(tw, c, r))) {
            canPlace = false; break outer;
          }
        }
      }
      if (canPlace) ghost = { col, row, type: selectedTowerRef.current };
    }

    // ── Base map (background, grid, obstacles, hover highlight, range rings) ──
    renderMap(
      ctx, LEVEL1, bgImageRef.current,
      hoveredRef.current, towersRef.current,
      gridConfigRef.current, tileOverridesRef.current,
      tileEditModeRef.current, showObstaclesRef.current,
      ghost,
    );

    // ── Y-sorted entity pass: towers + enemies drawn back-to-front together ──
    const ts = timestamp ?? performance.now();
    type Entity = { sortRow: number; draw: () => void };
    const entities: Entity[] = [];

    for (const tower of towersRef.current) {
      entities.push({
        sortRow: tower.row + TOWER_FOOTPRINT / 2,
        draw: () => drawTowerSprite(ctx, tower, gridConfigRef.current, towerImagesRef.current[tower.type]),
      });
    }
    for (const enemy of enemiesRef.current) {
      if (!enemy.alive) continue;
      const pos = enemyGridPos(enemy, LEVEL1.waypoints);
      entities.push({
        sortRow: pos.row,
        draw: () => drawSingleEnemy(ctx, enemy, LEVEL1.waypoints, gridConfigRef.current, skeletonImgRef.current, ts),
      });
    }
    entities.sort((a, b) => a.sortRow - b.sortRow);
    for (const e of entities) e.draw();

    // ── Projectiles (above entities, below UI overlays) ───────────────────────
    drawProjectiles(ctx, projectilesRef.current, gridConfigRef.current, projImagesRef.current);
    drawHitEffects(ctx, hitEffectsRef.current, ts, gridConfigRef.current, effectImagesRef.current, enemiesRef.current, LEVEL1.waypoints);

    // ── Overlays (always on top of all sprites) ───────────────────────────────
    drawSellHoverOverlay(ctx, towersRef.current, hoveredRef.current, tileEditModeRef.current, gridConfigRef.current);
    drawGhostTowerOverlay(ctx, ghost, gridConfigRef.current, ghost ? towerImagesRef.current[ghost.type] : undefined);
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
      projectilesRef.current       = [];
      towerLastFireRef.current     = {};
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

    // Advance every living enemy (pass timestamp for slow check)
    for (const enemy of enemiesRef.current) {
      if (!enemy.alive) continue;
      updateEnemy(enemy, LEVEL1.waypoints, dt, timestamp);
      if (!enemy.alive && enemy.reached) {
        onEnemyReachedBaseRef.current?.();
      }
    }

    // Tower firing: each tower finds the nearest in-range living enemy and fires
    const FP = TOWER_FOOTPRINT;
    for (const tower of towersRef.current) {
      const stats   = TOWER_STATS[tower.type];
      const key     = `${tower.col},${tower.row}`;
      const lastFire = towerLastFireRef.current[key] ?? 0;
      if (timestamp - lastFire < stats.fireRate) continue;

      // Tower fires from the centre of its footprint
      const tCx = tower.col + FP / 2;
      const tCy = tower.row + FP / 2 - 2;

      // Find nearest living enemy within range
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const enemy of enemiesRef.current) {
        if (!enemy.alive) continue;
        const pos  = enemyGridPos(enemy, LEVEL1.waypoints);
        const dx   = pos.col + 0.5 - tCx;
        const dy   = pos.row + 0.5 - tCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= stats.range && dist < nearestDist) {
          nearest     = enemy;
          nearestDist = dist;
        }
      }

      if (nearest) {
        projectilesRef.current.push(
          createProjectile(nextProjIdRef.current++, tower.type, tCx, tCy, nearest, LEVEL1.waypoints)
        );
        towerLastFireRef.current[key] = timestamp;
        playSfx(launchAudioRef.current[tower.type]);
      }
    }

    // Advance projectiles and resolve hits
    updateProjectiles(
      projectilesRef.current, enemiesRef.current, LEVEL1.waypoints, dt, timestamp,
      (type, x, y, targetId) => {
        playSfx(hitAudioRef.current[type]);
        // Arrow effect follows the enemy; cannon/mage stay at impact point
        const followId = type === 'arrow' ? targetId : undefined;
        hitEffectsRef.current.push(createHitEffect(type, x, y, timestamp, followId));
      },
    );

    // Prune expired hit effects
    hitEffectsRef.current = hitEffectsRef.current.filter(
      fx => timestamp - fx.startMs < fx.durationMs,
    );

    // Fire kill callbacks for enemies that just died from projectile damage
    for (const enemy of enemiesRef.current) {
      if (!enemy.alive && !enemy.reached && !enemy.killedFired) {
        enemy.killedFired = true;
        onEnemyKilledRef.current?.();
      }
    }

    // Cull dead projectiles (keep array bounded)
    if (projectilesRef.current.length > 200) {
      projectilesRef.current = projectilesRef.current.filter(p => p.alive);
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

  useEffect(() => {
    const img = new Image();
    img.onload = () => { projImagesRef.current = { ...projImagesRef.current, arrow: img }; };
    // on error: leave undefined → circle placeholder is used
    img.src = '/assets/projectiles/arrow.png';
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { effectImagesRef.current = { ...effectImagesRef.current, arrow: img }; };
    img.src = '/assets/projectiles/arrow-hit-effect.png';
  }, []);

  useEffect(() => {
    const launch = new Audio('/assets/audio/arrow-launch.mp3');
    launch.volume = 0.4;
    const hit = new Audio('/assets/audio/arrow-hit.mp3');
    hit.volume = 0.5;
    launchAudioRef.current = { arrow: launch };
    hitAudioRef.current    = { arrow: hit };
  }, []);

  // Clones the audio element so overlapping sounds play simultaneously
  const playSfx = useCallback((audio: HTMLAudioElement | undefined) => {
    if (!audio) return;
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = audio.volume;
    clone.play().catch(() => {});
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
    const hasTower = towersRef.current.some(t => towerOccupies(t, col, row));
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
    const tower = towersRef.current.find(t => towerOccupies(t, col, row));
    if (tower) onSellTowerRef.current?.(tower.col, tower.row);
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
    const FP = TOWER_FOOTPRINT;
    for (let dr = 0; dr < FP; dr++) {
      for (let dc = 0; dc < FP; dc++) {
        const c = col + dc, r = row + dr;
        const t = tileOverridesRef.current[`${c},${r}`] ?? LEVEL1.grid[r]?.[c] ?? 'grass';
        if (t !== 'grass' || towersRef.current.some(tw => towerOccupies(tw, c, r))) return;
      }
    }
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
