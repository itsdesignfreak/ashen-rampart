import { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import {
  STARTING_GOLD, LIVES_START,
  TOWER_COST_ARROW, TOWER_COST_CANNON,
} from './constants';
import type { Tower, TowerType } from './types';

const TOWER_COST: Record<TowerType, number> = {
  arrow:  TOWER_COST_ARROW,
  cannon: TOWER_COST_CANNON,
};

export default function App() {
  const [gold,          setGold]          = useState(STARTING_GOLD);
  const [lives]                           = useState(LIVES_START);
  const [wave]                            = useState(0);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [towers,        setTowers]        = useState<Tower[]>([]);

  const handleSelectTower = (type: TowerType) => {
    setSelectedTower(prev => prev === type ? null : type);
  };

  const handlePlaceTower = useCallback((col: number, row: number) => {
    if (!selectedTower) return;
    const cost = TOWER_COST[selectedTower];
    if (gold < cost) return;
    setTowers(prev => [...prev, { col, row, type: selectedTower }]);
    setGold(prev => prev - cost);
  }, [selectedTower, gold]);

  const canAfford = (type: TowerType) => gold >= TOWER_COST[type];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-stone-900 border-b border-stone-700">
        <h1 className="text-xl font-bold tracking-widest uppercase text-amber-400">
          Ashen Rampart
        </h1>
        <div className="flex gap-6 text-sm font-mono">
          <span className="text-yellow-400">Gold: {gold}</span>
          <span className="text-red-400">Lives: {lives}</span>
          <span className="text-stone-400">Wave: {wave}</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <GameCanvas
            selectedTower={selectedTower}
            towers={towers}
            onPlaceTower={handlePlaceTower}
          />
        </div>

        <aside className="w-56 bg-stone-900 border-l border-stone-700 p-4 flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 mb-1">Towers</h2>

          {(['arrow', 'cannon'] as TowerType[]).map(type => {
            const cost      = TOWER_COST[type];
            const selected  = selectedTower === type;
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
                {type === 'arrow' ? 'Arrow' : 'Cannon'} Tower — {cost}g
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
              disabled
              className="w-full py-2 bg-amber-700 hover:bg-amber-600 rounded text-sm font-semibold opacity-50 cursor-not-allowed"
            >
              Start Wave
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
