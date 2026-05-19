import { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GridDebugPanel } from './components/GridDebugPanel';
import { TileEditorPanel } from './components/TileEditorPanel';
import {
  STARTING_GOLD, LIVES_START,
  GOLD_PER_KILL,
  TOWER_SELL_REFUND,
} from './constants';
import type { Tower, TowerType, TileOverrides } from './types';
import { TOWER_STATS } from './engine/towerData';
import { DEFAULT_GRID_CONFIG } from './engine/mapRenderer';
import type { GridConfig } from './engine/mapRenderer';
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
  const [showObstacles,     setShowObstacles]     = useState(true);

  const handleSelectTower = (type: TowerType) => {
    setSelectedTower(prev => prev === type ? null : type);
  };

  const handlePlaceTower = useCallback((col: number, row: number) => {
    if (!selectedTower) return;
    const cost = TOWER_STATS[selectedTower].cost;
    if (gold < cost) return;
    setTowers(prev => [...prev, { col, row, type: selectedTower }]);
    setGold(prev => prev - cost);
  }, [selectedTower, gold]);

  const canAfford = (type: TowerType) => gold >= TOWER_STATS[type].cost;

  const handleSellTower = useCallback((col: number, row: number) => {
    setTowers(prev => {
      const tower = prev.find(t => t.col === col && t.row === row);
      if (!tower) return prev;
      const refund = Math.floor(TOWER_STATS[tower.type].cost * TOWER_SELL_REFUND);
      setGold(g => g + refund);
      return prev.filter(t => !(t.col === col && t.row === row));
    });
  }, []);

  const handleStartWave = () => {
    if (waveActive) return;
    setWave(prev => prev + 1);
    setWaveActive(true);
  };

  const handleEnemyReachedBase = useCallback(() => {
    setLives(prev => Math.max(0, prev - 1));
  }, []);

  const handleEnemyKilled = useCallback(() => {
    setGold(prev => prev + GOLD_PER_KILL);
  }, []);

  const handleWaveComplete = useCallback(() => {
    setWaveActive(false);
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
      <header className="flex items-center justify-between px-6 py-3 bg-stone-900 border-b border-stone-700">
        <h1 className="text-xl font-bold tracking-widest uppercase text-amber-400">
          Ashen Rampart
        </h1>
        <div className="flex items-center gap-6 text-sm font-mono">
          <span className="text-yellow-400">Gold: {gold}</span>
          <span className="text-red-400">Lives: {lives}</span>
          <span className="text-stone-400">Wave: {wave}</span>
          <button
            onClick={() => setShowDebug(v => !v)}
            className={[
              'text-xs px-2 py-1 rounded border transition-colors',
              showDebug
                ? 'bg-amber-700 border-amber-500 text-white'
                : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-white',
            ].join(' ')}
          >
            🔧 Grid
          </button>
          <button
            onClick={() => setShowTileEditor(v => !v)}
            className={[
              'text-xs px-2 py-1 rounded border transition-colors',
              showTileEditor
                ? 'bg-red-900 border-red-600 text-white'
                : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-white',
            ].join(' ')}
          >
            🖌️ Tiles
          </button>
          <button
            onClick={() => setShowObstacles(v => !v)}
            className={[
              'text-xs px-2 py-1 rounded border transition-colors',
              showObstacles
                ? 'bg-stone-700 border-stone-500 text-white'
                : 'bg-stone-800 border-stone-600 text-stone-500 hover:text-white',
            ].join(' ')}
          >
            {showObstacles ? '🚫 Hide Blocked' : '🚫 Show Blocked'}
          </button>
        </div>
      </header>

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
            waveActive={waveActive}
            onEnemyReachedBase={handleEnemyReachedBase}
            onEnemyKilled={handleEnemyKilled}
            onWaveComplete={handleWaveComplete}
            onSellTower={handleSellTower}
          />
        </div>

        <aside className="w-56 bg-stone-900 border-l border-stone-700 p-4 flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 mb-1">Towers</h2>

          {(['arrow', 'mage', 'cannon'] as TowerType[]).map(type => {
            const stats      = TOWER_STATS[type];
            const selected   = selectedTower === type;
            const affordable = canAfford(type);
            return (
              <button
                key={type}
                onClick={() => handleSelectTower(type)}
                disabled={!affordable}
                className={[
                  'w-full py-2 px-3 rounded text-left text-sm border transition-colors',
                  selected
                    ? 'bg-amber-700 border-amber-500 text-white'
                    : affordable
                      ? 'bg-stone-800 border-stone-600 hover:bg-stone-700 hover:border-stone-500'
                      : 'bg-stone-800 border-stone-700 opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                {stats.label} Tower — {stats.cost}g
              </button>
            );
          })}

          {selectedTower && (
            <p className="text-xs text-amber-300 mt-1">
              Click a grass tile to place
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-stone-700">
            <button
              onClick={handleStartWave}
              disabled={waveActive || lives === 0}
              className={[
                'w-full py-2 rounded text-sm font-semibold transition-colors',
                waveActive || lives === 0
                  ? 'bg-amber-900 opacity-50 cursor-not-allowed'
                  : 'bg-amber-700 hover:bg-amber-600 cursor-pointer',
              ].join(' ')}
            >
              {waveActive ? `Wave ${wave} — in progress` : `Start Wave ${wave + 1}`}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
