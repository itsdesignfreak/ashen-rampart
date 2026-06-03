import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_BG_SRC, WAVE_SPAWN_INTERVAL, WAVE_ENEMY_COUNT, TOWER_FOOTPRINT, GRID_COLS, GRID_ROWS } from '../constants';
import {
  renderMap, perspHitTest,
  drawTowerSprite, drawSingleEnemy,
  drawSellHoverOverlay, drawGhostTowerOverlay,
  drawProjectiles, drawHitEffects, createHitEffect, drawBeam, drawCatNpc, drawBirdNpc,
  drawFloatingNumbers,
} from '../engine/mapRenderer';
import type { HoveredTile, GridConfig, GhostTower, HitEffect, FloatingNumber } from '../engine/mapRenderer';
import { DEFAULT_GRID_CONFIG } from '../engine/mapRenderer';
import { TOWER_STATS, towerOccupies } from '../engine/towerData';
import type { Tower, TowerType, TileOverrides, Projectile, ActiveBeam } from '../types';
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
import { MAGE_DPS } from '../constants';
import type { CatNpc } from '../engine/catNpc';
import { createCatNpc, updateCatNpc } from '../engine/catNpc';
import type { BirdNpc } from '../engine/birdNpc';
import {
  createBird, updateBird, isBirdOffScreen,
  MAX_BIRDS, BIRD_SPAWN_MIN_MS, BIRD_SPAWN_MAX_MS,
} from '../engine/birdNpc';

interface Props {
  selectedTower:        TowerType | null;
  towers:               Tower[];
  onPlaceTower:         (col: number, row: number) => void;
  gridConfig?:          GridConfig;
  tileOverrides?:       TileOverrides;
  tileEditMode?:        boolean;
  onToggleTile?:        (col: number, row: number) => void;
  showObstacles?:       boolean;
  showNPC?:             boolean;
  // Wave / enemy
  waveActive?:          boolean;
  onEnemyReachedBase?:  () => void;
  onEnemyKilled?:       (col?: number, row?: number) => void;
  onWaveComplete?:      () => void;
  // Tower sell
  onSellTower?:         (col: number, row: number) => void;
  // Audio
  sfxVolume?:           number;  // 0–1 multiplier applied to all SFX
  // Floating gold numbers (drawn on canvas, owned by App)
  floatingNumbers?:     FloatingNumber[];
}

export function GameCanvas({
  selectedTower, towers, onPlaceTower,
  gridConfig, tileOverrides, tileEditMode, onToggleTile, showObstacles,
  showNPC = true,
  waveActive, onEnemyReachedBase, onEnemyKilled, onWaveComplete,
  onSellTower, sfxVolume = 1, floatingNumbers,
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
  const sellAudioRef        = useRef<HTMLAudioElement | null>(null);
  const placedAudioRef      = useRef<HTMLAudioElement | null>(null);
  const sfxVolumeRef        = useRef(sfxVolume);

  // ── Cat NPC ────────────────────────────────────────────────────────────────
  const catImgRef     = useRef<HTMLImageElement | null>(null);
  const catIdleImgRef = useRef<HTMLImageElement | null>(null);
  const catNpcRef     = useRef<CatNpc>(createCatNpc(4, 5));

  // ── Bird NPCs ──────────────────────────────────────────────────────────────
  const birdImgRef        = useRef<HTMLImageElement | null>(null);
  const birdsRef          = useRef<BirdNpc[]>([]);
  const nextBirdSpawnRef  = useRef<number>(-1); // set on first tick

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
  const showNPCRef            = useRef(showNPC);
  const floatingNumbersRef    = useRef<FloatingNumber[]>(floatingNumbers ?? []);
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
  showNPCRef.current            = showNPC;
  floatingNumbersRef.current    = floatingNumbers ?? [];
  waveActiveRef.current         = waveActive ?? false;
  onEnemyReachedBaseRef.current = onEnemyReachedBase;
  onEnemyKilledRef.current      = onEnemyKilled;
  onWaveCompleteRef.current     = onWaveComplete;
  onSellTowerRef.current        = onSellTower;
  sfxVolumeRef.current          = sfxVolume;

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

  // ── Mage beam state ────────────────────────────────────────────────────────
  const beamsRef            = useRef<Map<string, ActiveBeam>>(new Map());
  const beamAudioPlayingRef = useRef(false);

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

    // Hit effects join the Y-sort so they layer correctly with towers
    for (const fx of hitEffectsRef.current) {
      if (ts - fx.startMs >= fx.durationMs) continue;
      const sortRow = fx.y + 0.5; // slight bias so the effect renders in front at its row
      entities.push({
        sortRow,
        draw: () => drawHitEffects(ctx, [fx], ts, gridConfigRef.current, effectImagesRef.current, enemiesRef.current, LEVEL1.waypoints),
      });
    }

    // Cat NPC — Y-sorted with towers and enemies
    if (showNPCRef.current) {
      const cat = catNpcRef.current;
      entities.push({
        sortRow: cat.y + 0.5,
        draw: () => drawCatNpc(ctx, cat, gridConfigRef.current, catImgRef.current, catIdleImgRef.current),
      });
    }

    // Mage beams — drawn at target row so they layer with entities
    for (const beam of beamsRef.current.values()) {
      entities.push({
        sortRow: beam.targetY,
        draw: () => drawBeam(ctx, beam, gridConfigRef.current),
      });
    }

    entities.sort((a, b) => a.sortRow - b.sortRow);
    for (const e of entities) e.draw();

    // ── Projectiles (above entities, below UI overlays) ───────────────────────
    drawProjectiles(ctx, projectilesRef.current, gridConfigRef.current, projImagesRef.current);

    // ── Overlays (always on top of all sprites) ───────────────────────────────
    drawSellHoverOverlay(ctx, towersRef.current, hoveredRef.current, tileEditModeRef.current, gridConfigRef.current);
    drawGhostTowerOverlay(ctx, ghost, gridConfigRef.current, ghost ? towerImagesRef.current[ghost.type] : undefined);

    // ── Birds — highest z-order, drawn in canvas-pixel space ─────────────────
    if (showNPCRef.current) {
      for (const bird of birdsRef.current) {
        drawBirdNpc(ctx, bird, birdImgRef.current);
      }
    }

    // ── Floating gold numbers — drawn above everything ───────────────────────
    drawFloatingNumbers(ctx, floatingNumbersRef.current, ts, gridConfigRef.current);
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
      beamsRef.current             = new Map();
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

    // ── Mage beam tick — continuous DPS, no projectiles ──────────────────────
    const FP = TOWER_FOOTPRINT;
    const newBeams = new Map<string, ActiveBeam>();
    // Track which enemy IDs are actively being hit this frame
    const beamedIds = new Set<number>();

    for (const tower of towersRef.current) {
      if (tower.type !== 'mage') continue;
      const key  = `${tower.col},${tower.row}`;
      const tCx  = tower.col + FP / 2;
      const tCy  = tower.row + FP / 2;
      const fromY = tCy - 3; // mage visual launch offset (3 tiles up)

      // Find nearest living enemy in range
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const enemy of enemiesRef.current) {
        if (!enemy.alive) continue;
        const pos  = enemyGridPos(enemy, LEVEL1.waypoints);
        const dx   = pos.col + 0.5 - tCx;
        const dy   = pos.row + 0.5 - tCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= TOWER_STATS.mage.range && dist < nearestDist) {
          nearest = enemy; nearestDist = dist;
        }
      }

      if (nearest) {
        // Apply DPS damage this frame
        nearest.hp -= MAGE_DPS * dt;
        if (nearest.hp <= 0 && nearest.alive) {
          nearest.alive   = false;
          nearest.reached = false;
        }
        // Slow only while actively in the beam
        nearest.slowUntil = timestamp + 100;
        beamedIds.add(nearest.id);

        const pos = enemyGridPos(nearest, LEVEL1.waypoints);
        newBeams.set(key, {
          towerKey: key,
          fromX:    tCx,
          fromY,
          targetId: nearest.id,
          targetX:  pos.col + 0.5,
          targetY:  pos.row + 0.5,
        });
      }
    }

    // Immediately clear the slow on any enemy NOT currently under a beam
    for (const enemy of enemiesRef.current) {
      if (enemy.alive && !beamedIds.has(enemy.id)) {
        enemy.slowUntil = 0;
      }
    }

    beamsRef.current = newBeams;

    // Beam audio — single looping instance, on while any beam is active
    const anyBeam   = newBeams.size > 0;
    const beamAudio = launchAudioRef.current.mage;
    if (beamAudio) {
      // Keep volume in sync with sfxVolume (base volume 0.4)
      beamAudio.volume = Math.min(1, 0.4 * sfxVolumeRef.current);
      if (anyBeam && !beamAudioPlayingRef.current) {
        beamAudio.loop        = true;
        beamAudio.currentTime = 0;
        beamAudio.play().catch(() => {});
        beamAudioPlayingRef.current = true;
      } else if (!anyBeam && beamAudioPlayingRef.current) {
        beamAudio.pause();
        beamAudio.currentTime = 0;
        beamAudioPlayingRef.current = false;
      }
    }

    // ── Tower firing: arrow & cannon only (mage uses beam above) ─────────────
    for (const tower of towersRef.current) {
      if (tower.type === 'mage') continue;  // handled above
      const stats   = TOWER_STATS[tower.type];
      const key     = `${tower.col},${tower.row}`;
      const lastFire = towerLastFireRef.current[key] ?? 0;
      if (timestamp - lastFire < stats.fireRate) continue;

      // Range centre — footprint centre (used for enemy detection)
      const tCx = tower.col + FP / 2;
      const tCy = tower.row + FP / 2;
      // Visual launch origin — offset per tower type
      const launchOffsetY: Partial<Record<TowerType, number>> = { arrow: -2, cannon: -2 };
      const fromY = tCy + (launchOffsetY[tower.type] ?? -2);

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
          createProjectile(nextProjIdRef.current++, tower.type, tCx, fromY, nearest, LEVEL1.waypoints, key)
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
        const pos = enemyGridPos(enemy, LEVEL1.waypoints);
        onEnemyKilledRef.current?.(pos.col + 0.5, pos.row + 0.5);
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

    // ── Bird NPC tick ─────────────────────────────────────────────────────────
    // Initialise spawn timer on the very first tick
    if (nextBirdSpawnRef.current < 0) {
      nextBirdSpawnRef.current = timestamp + BIRD_SPAWN_MIN_MS
        + Math.random() * (BIRD_SPAWN_MAX_MS - BIRD_SPAWN_MIN_MS);
    }
    // Update & prune off-screen birds
    for (const bird of birdsRef.current) updateBird(bird, dt);
    birdsRef.current = birdsRef.current.filter(b => !isBirdOffScreen(b, CANVAS_WIDTH));
    // Spawn a new bird when the timer fires and slots are available
    if (timestamp >= nextBirdSpawnRef.current && birdsRef.current.length < MAX_BIRDS) {
      birdsRef.current.push(createBird(CANVAS_WIDTH, CANVAS_HEIGHT));
      nextBirdSpawnRef.current = timestamp + BIRD_SPAWN_MIN_MS
        + Math.random() * (BIRD_SPAWN_MAX_MS - BIRD_SPAWN_MIN_MS);
    }

    // Advance cat NPC — only wanders on grass tiles
    updateCatNpc(catNpcRef.current, dt, (col, row) => {
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
      const tile = tileOverridesRef.current[`${col},${row}`] ?? LEVEL1.grid[row]?.[col] ?? 'grass';
      return tile === 'grass';
    });

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
    const img = new Image();
    img.onload  = () => { catImgRef.current = img; };
    img.onerror = () => { catImgRef.current = null; };
    img.src = '/assets/npc/cat.png';
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => { catIdleImgRef.current = img; };
    img.onerror = () => { catIdleImgRef.current = null; };
    img.src = '/assets/npc/cat-idle.png';
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => { birdImgRef.current = img; };
    img.onerror = () => { birdImgRef.current = null; };
    img.src = '/assets/npc/bird.png';
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
    const sources: [TowerType, string][] = [
      ['arrow',  '/assets/projectiles/arrow.png'],
      ['cannon', '/assets/projectiles/cannon-ball.png'],
    ];
    sources.forEach(([type, src]) => {
      const img = new Image();
      img.onload = () => { projImagesRef.current = { ...projImagesRef.current, [type]: img }; };
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const sources: [TowerType, string][] = [
      ['arrow',  '/assets/projectiles/arrow-hit-effect.png'],
      ['cannon', '/assets/projectiles/cannon-hit.png'],
    ];
    sources.forEach(([type, src]) => {
      const img = new Image();
      img.onload = () => { effectImagesRef.current = { ...effectImagesRef.current, [type]: img }; };
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const arrowLaunch = new Audio('/assets/audio/arrow-launch.mp3');
    arrowLaunch.volume = 0.4;
    const arrowHit = new Audio('/assets/audio/arrow-hit.mp3');
    arrowHit.volume = 0.5;

    const cannonLaunch = new Audio('/assets/audio/cannon-launch.mp3');
    cannonLaunch.volume = 0.6;
    const cannonHit = new Audio('/assets/audio/cannon-hit.mp3');
    cannonHit.volume = 0.7;

    const mageLaser = new Audio('/assets/audio/mage-laser.mp3');
    mageLaser.volume = 0.4;

    const sellSfx = new Audio('/assets/audio/sell-tower.mp3');
    sellSfx.volume = 0.6;

    const placedSfx = new Audio('/assets/audio/tower-placed.mp3');
    placedSfx.volume = 0.7;

    launchAudioRef.current  = { arrow: arrowLaunch, cannon: cannonLaunch, mage: mageLaser };
    hitAudioRef.current     = { arrow: arrowHit,    cannon: cannonHit };
    sellAudioRef.current    = sellSfx;
    placedAudioRef.current  = placedSfx;
  }, []);

  // Clones the audio element so overlapping sounds play simultaneously.
  // Scales by sfxVolumeRef so the setting is always current.
  const playSfx = useCallback((audio: HTMLAudioElement | undefined) => {
    if (!audio) return;
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = Math.min(1, audio.volume * sfxVolumeRef.current);
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
    if (tower) {
      playSfx(sellAudioRef.current ?? undefined);
      onSellTowerRef.current?.(tower.col, tower.row);
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
    const FP = TOWER_FOOTPRINT;
    for (let dr = 0; dr < FP; dr++) {
      for (let dc = 0; dc < FP; dc++) {
        const c = col + dc, r = row + dr;
        const t = tileOverridesRef.current[`${c},${r}`] ?? LEVEL1.grid[r]?.[c] ?? 'grass';
        if (t !== 'grass' || towersRef.current.some(tw => towerOccupies(tw, c, r))) return;
      }
    }
    playSfx(placedAudioRef.current ?? undefined);
    onPlaceTowerRef.current(col, row);
  }, [tileAt]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block w-full h-full"
      aria-label="The Last Ward game canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  );
}
