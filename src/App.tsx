import { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GridDebugPanel } from './components/GridDebugPanel';
import { TileEditorPanel } from './components/TileEditorPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { BottomHUD } from './components/BottomHUD';
import { WaveOverlay } from './components/WaveOverlay';
import type { WaveOverlayData } from './components/WaveOverlay';
import {
  STARTING_GOLD, LIVES_START,
  GOLD_PER_KILL,
  TOWER_SELL_REFUND,
  TOWER_FOOTPRINT,
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
      setWaveOverlay({ id: ++overlayIdRef.current, kind: 'complete', wave: w });
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
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      {/* ── Minimal top bar: title + dev tools ── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-2 bg-stone-950/80 border-b border-amber-900/30">
        <h1 className="font-medieval text-lg font-bold tracking-[0.3em] uppercase text-amber-400">
          Ashen Rampart
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(v => !v)}
            className={[
              'text-[10px] px-2 py-1 rounded border transition-colors',
              showDebug
                ? 'bg-amber-700 border-amber-500 text-white'
                : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-white',
            ].join(' ')}
          >
            🔧 Grid
          </button>
          <button
            onClick={() => setShowTileEditor(v => !v)}
            className={[
              'text-[10px] px-2 py-1 rounded border transition-colors',
              showTileEditor
                ? 'bg-red-900 border-red-600 text-white'
                : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-white',
            ].join(' ')}
          >
            🖌️ Tiles
          </button>
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

      <WaveOverlay data={waveOverlay} onDone={() => setWaveOverlay(null)} />

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
        <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
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
            onEnemyReachedBase={handleEnemyReachedBase}
            onEnemyKilled={handleEnemyKilled}
            onWaveComplete={handleWaveComplete}
            onSellTower={handleSellTower}
            sfxVolume={sfxVolume}
            floatingNumbers={floatingNumbers}
          />
        </div>
      </main>

      {/* ── Bottom HUD ── */}
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
  );
}
