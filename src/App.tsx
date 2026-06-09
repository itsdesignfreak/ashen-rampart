import { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GridDebugPanel } from './components/GridDebugPanel';
import { TileEditorPanel } from './components/TileEditorPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { BottomHUD } from './components/BottomHUD';
import { Pill } from './components/Pill';
import { WaveOverlay } from './components/WaveOverlay';
import type { WaveOverlayData } from './components/WaveOverlay';
import { HowToPlay } from './components/HowToPlay';
import { VictoryScreen } from './components/VictoryScreen';
import {
  STARTING_GOLD, LIVES_START,
  GOLD_PER_KILL,
  TOWER_SELL_REFUND,
  TOWER_FOOTPRINT,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  MAX_WAVES,
  INTRO_FADE_IN_MS, INTRO_HOLD_MS,
  INTRO_MAP_EXPAND_MS, INTRO_UI_IN_MS, INTRO_MAP_EASE,
  INTRO_MAP_MAX_SIZE,
  SHOW_DEV_TOOLS, APP_VERSION,
} from './constants';
import type { Tower, TowerType, TileOverrides } from './types';
import { TOWER_STATS } from './engine/towerData';
import { DEFAULT_GRID_CONFIG } from './engine/mapRenderer';
import type { GridConfig, FloatingNumber } from './engine/mapRenderer';
import { LEVEL1 } from './data/level1';

export default function App() {
  const [gold,          setGold]          = useState(STARTING_GOLD);
  const [lives,         setLives]         = useState(LIVES_START);
  const [wave,          setWave]          = useState(0);
  const [waveActive,    setWaveActive]    = useState(false);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [towers,        setTowers]        = useState<Tower[]>([]);
  const [showDebug,       setShowDebug]       = useState(false);
  const [gridConfig,      setGridConfig]      = useState<GridConfig>(DEFAULT_GRID_CONFIG);
  const [savedGridConfig, setSavedGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG);
  const [showTileEditor,    setShowTileEditor]    = useState(false);
  const [tileOverrides,     setTileOverrides]     = useState<TileOverrides>({});
  const [showObstacles,     setShowObstacles]     = useState(false);
  const [showNPC,           setShowNPC]           = useState(true);
  const [showHowToPlay,     setShowHowToPlay]     = useState(false);
  const [showVictory,       setShowVictory]       = useState(false);

  // ── Intro animation (map → game) ─────────────────────────────────────────────
  // Phase 0 start (bg only) · 1 map fades in (small, centered) & holds
  // · 2 map expands to fill · 3 HUD/UI fades in · 4 done.
  const [introPhase, setIntroPhase] = useState(0);
  useEffect(() => {
    const expandAt = INTRO_FADE_IN_MS + INTRO_HOLD_MS;
    const uiAt     = expandAt + INTRO_MAP_EXPAND_MS;
    const doneAt   = uiAt + INTRO_UI_IN_MS;

    const raf = requestAnimationFrame(() => setIntroPhase(1)); // trigger fade-in
    const timers = [
      setTimeout(() => setIntroPhase(2), expandAt),
      setTimeout(() => setIntroPhase(3), uiAt),
      setTimeout(() => setIntroPhase(4), doneAt),
    ];
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, []);

  // Derived intro flags
  const introMapVisible = introPhase >= 1;
  const introMapFull    = introPhase >= 2;
  const introUiVisible  = introPhase >= 3;

  // ── Wave overlay ────────────────────────────────────────────────────────────
  const [waveOverlay, setWaveOverlay] = useState<WaveOverlayData | null>(null);
  const overlayIdRef = useRef(0);

  // ── Lives-lost red flash ───────────────────────────────────────────────────
  const [livesFlashId, setLivesFlashId] = useState(0);

  // ── Floating gold numbers (drawn on canvas) ───────────────────────────────
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const floatIdRef = useRef(0);

  /** Spawn a floating number at a fractional grid coordinate. */
  const spawnFloat = useCallback((col: number, row: number, text: string, color: string) => {
    const id = ++floatIdRef.current;
    setFloatingNumbers(prev => [
      ...prev,
      { id, text, color, col, row, startMs: performance.now() },
    ]);
    // Auto-prune after the animation finishes
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== id));
    }, 900);
  }, []);

  // ── Audio settings ────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [bgmEnabled,   setBgmEnabled]   = useState(true);
  const [bgmVolume,    setBgmVolume]    = useState(0.4);
  const [sfxVolume,    setSfxVolume]    = useState(1.0);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Load BGM once; start on first user interaction if autoplay is blocked
  useEffect(() => {
    const bgm = new Audio('/assets/audio/medieval-bgm.mp3');
    bgm.loop   = true;
    bgm.volume = bgmVolume;
    bgmRef.current = bgm;

    const tryPlay = () => {
      if (bgmRef.current && bgmEnabled) {
        bgmRef.current.play().catch(() => {});
      }
    };
    // Attempt immediate play (works if user already interacted)
    bgm.play().catch(() => {
      // Autoplay blocked — unlock on first click
      document.addEventListener('click', tryPlay, { once: true });
    });

    return () => {
      bgm.pause();
      bgm.src = '';
      document.removeEventListener('click', tryPlay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // React to BGM toggle
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;
    if (bgmEnabled) {
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
  }, [bgmEnabled]);

  // React to BGM volume change
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  const handleSelectTower = (type: TowerType) => {
    setSelectedTower(prev => prev === type ? null : type);
  };

  const handlePlaceTower = useCallback((col: number, row: number) => {
    if (!selectedTower) return;
    const cost = TOWER_STATS[selectedTower].cost;
    if (gold < cost) return;
    setTowers(prev => [...prev, { col, row, type: selectedTower }]);
    setGold(prev => prev - cost);
    const c = TOWER_FOOTPRINT / 2;
    spawnFloat(col + c, row + c, `-${cost}g`, '#f87171');
  }, [selectedTower, gold, spawnFloat]);

  const canAfford = (type: TowerType) => gold >= TOWER_STATS[type].cost;

  const handleSellTower = useCallback((col: number, row: number) => {
    setTowers(prev => {
      const tower = prev.find(t => t.col === col && t.row === row);
      if (!tower) return prev;
      const refund = Math.floor(TOWER_STATS[tower.type].cost * TOWER_SELL_REFUND);
      setGold(g => g + refund);
      const c = TOWER_FOOTPRINT / 2;
      spawnFloat(col + c, row + c, `+${refund}g`, '#34d399');
      return prev.filter(t => !(t.col === col && t.row === row));
    });
  }, [spawnFloat]);

  const handleStartWave = () => {
    if (waveActive) return;
    if (wave >= MAX_WAVES) return; // V1 ends after wave 3
    const next = wave + 1;
    setWave(next);
    setWaveActive(true);
    setWaveOverlay({ id: ++overlayIdRef.current, kind: 'start', wave: next });
  };

  const handleEnemyReachedBase = useCallback(() => {
    setLives(prev => Math.max(0, prev - 1));
    setLivesFlashId(n => n + 1);
  }, []);

  const handleEnemyKilled = useCallback((col?: number, row?: number) => {
    setGold(prev => prev + GOLD_PER_KILL);
    if (col !== undefined && row !== undefined) {
      spawnFloat(col, row, `+${GOLD_PER_KILL}g`, '#fcd34d');
    }
  }, [spawnFloat]);

  const handleWaveComplete = useCallback(() => {
    setWaveActive(false);
    setWave(w => {
      if (w >= MAX_WAVES) {
        setShowVictory(true);        // final wave cleared → end screen
      } else {
        setWaveOverlay({ id: ++overlayIdRef.current, kind: 'complete', wave: w });
      }
      return w;
    });
  }, []);

  const handleToggleTile = useCallback((col: number, row: number) => {
    const key = `${col},${row}`;
    const current = tileOverrides[key] ?? LEVEL1.grid[row][col];
    setTileOverrides(prev => ({
      ...prev,
      [key]: current === 'obstacle' ? 'grass' : 'obstacle',
    }));
  }, [tileOverrides]);

  return (
    <div className="h-screen bg-[#f0efea] text-black flex flex-col overflow-hidden font-ui">
      {/* ── Top bar: logo + title (left), dev tools (right) ── */}
      <header
        className={`shrink-0 flex items-center justify-between p-6 border-b border-black/10 transition-opacity ${introUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ transitionDuration: `${INTRO_UI_IN_MS}ms` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center p-1.5 rounded-full"
            style={{
              backgroundColor: '#333',
              boxShadow: '0px 0px 0px 0.5px rgba(0,0,0,0.8), inset 0px 0px 0px 0.5px rgba(255,255,255,0.25)',
            }}
          >
            <img src="/assets/ui/icons/logo.svg" alt="" className="block size-4" draggable={false} />
          </span>
          <span className="font-ui text-[16px] text-black">The Last Ward</span>
        </div>
        <div className="flex items-center gap-3">
          {SHOW_DEV_TOOLS && (
            <>
              <Pill
                icon="/assets/ui/icons/grid.svg"
                active={showDebug}
                onClick={() => setShowDebug(v => !v)}
              >
                Grid
              </Pill>
              <Pill
                icon="/assets/ui/icons/tiles.svg"
                active={showTileEditor}
                onClick={() => setShowTileEditor(v => !v)}
              >
                Tiles
              </Pill>
            </>
          )}
          <Pill onClick={() => setShowHowToPlay(true)}>How to Play</Pill>
          <span className="font-ui text-[13px] tabular-nums text-black/40">v{APP_VERSION}</span>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel
          showObstacles={showObstacles}
          showNPC={showNPC}
          onToggleObstacles={setShowObstacles}
          onToggleNPC={setShowNPC}
          bgmEnabled={bgmEnabled}
          bgmVolume={bgmVolume}
          sfxVolume={sfxVolume}
          onBgmToggle={setBgmEnabled}
          onBgmVolume={setBgmVolume}
          onSfxVolume={setSfxVolume}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}

      {showVictory && <VictoryScreen onPlayAgain={() => window.location.reload()} />}

      {/* Lives-lost red vignette flash */}
      {livesFlashId > 0 && (
        <div
          key={livesFlashId}
          className="animate-lives-flash pointer-events-none fixed inset-0 z-30"
          style={{ boxShadow: 'inset 0 0 120px 36px rgba(220,38,38,0.55)' }}
        />
      )}

      {/* ── Main play area ── */}
      <main className="flex flex-1 overflow-hidden">
        {showDebug && (
          <GridDebugPanel
            config={gridConfig}
            savedConfig={savedGridConfig}
            onChange={setGridConfig}
            onSave={() => setSavedGridConfig(gridConfig)}
          />
        )}
        {showTileEditor && (
          <TileEditorPanel
            overrides={tileOverrides}
            onClear={() => setTileOverrides({})}
          />
        )}
        <div className="relative flex-1 min-h-0 flex items-center justify-center p-8 overflow-hidden">
          {/* Wooden picture-frame around the map (border-image from the Figma asset) */}
          <div
            className="relative"
            style={{
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              maxWidth: introMapFull ? '100%' : INTRO_MAP_MAX_SIZE,
              maxHeight: introMapFull ? '100%' : INTRO_MAP_MAX_SIZE,
              borderStyle: 'solid',
              borderWidth: '18px',
              borderImageSource: 'url(/assets/ui/map-frame.png)',
              borderImageSlice: 26,
              borderImageWidth: '18px',
              filter: 'drop-shadow(0 11px 6.5px rgba(0,0,0,0.5))',
              opacity: introMapVisible ? 1 : 0,
              transition: `opacity ${INTRO_FADE_IN_MS}ms ease-out, max-width ${INTRO_MAP_EXPAND_MS}ms ${INTRO_MAP_EASE}, max-height ${INTRO_MAP_EXPAND_MS}ms ${INTRO_MAP_EASE}`,
            }}
          >
            <GameCanvas
              selectedTower={selectedTower}
              towers={towers}
              onPlaceTower={handlePlaceTower}
              gridConfig={gridConfig}
              tileOverrides={tileOverrides}
              tileEditMode={showTileEditor}
              onToggleTile={handleToggleTile}
              showObstacles={showObstacles}
              showNPC={showNPC}
              waveActive={waveActive}
              wave={wave}
              onEnemyReachedBase={handleEnemyReachedBase}
              onEnemyKilled={handleEnemyKilled}
              onWaveComplete={handleWaveComplete}
              onSellTower={handleSellTower}
              sfxVolume={sfxVolume}
              floatingNumbers={floatingNumbers}
            />

            {/* Wave start/complete banner — anchored to the map */}
            <WaveOverlay data={waveOverlay} onDone={() => setWaveOverlay(null)} />
          </div>
        </div>
      </main>

      {/* ── Bottom HUD ── */}
      <div
        className={`shrink-0 transition-opacity ${introUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ transitionDuration: `${INTRO_UI_IN_MS}ms` }}
      >
        <BottomHUD
          gold={gold}
          lives={lives}
          wave={wave}
          selectedTower={selectedTower}
          onSelectTower={handleSelectTower}
          canAfford={canAfford}
          waveActive={waveActive}
          onStartWave={handleStartWave}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>
    </div>
  );
}
