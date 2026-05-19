import type { TileOverrides } from '../types';
import { GRID_COLS, GRID_ROWS } from '../constants';
import { LEVEL1 } from '../data/level1';

interface Props {
  overrides: TileOverrides;
  onClear: () => void;
}

export function TileEditorPanel({ overrides, onClear }: Props) {
  // Count obstacles: base grid obstacles + user-added - user-cleared
  let obstacleCount = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const key = `${col},${row}`;
      const effective = overrides[key] ?? LEVEL1.grid[row][col];
      if (effective === 'obstacle') obstacleCount++;
    }
  }

  // Build export: only the overrides (delta from base grid)
  const lines = Object.entries(overrides)
    .sort(([a], [b]) => {
      const [ac, ar] = a.split(',').map(Number);
      const [bc, br] = b.split(',').map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map(([key, type]) => {
      const [col, row] = key.split(',').map(Number);
      return `grid[${row}][${col}] = '${type}';`;
    });

  return (
    <aside className="w-52 bg-stone-900 border-r border-stone-700 p-4 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-amber-400">Tile Editor</h2>
        <button
          onClick={onClear}
          className="text-xs text-stone-400 hover:text-white border border-stone-600 px-2 py-0.5 rounded"
        >
          Clear All
        </button>
      </div>

      <div className="text-xs font-mono space-y-1">
        <div className="flex justify-between text-stone-400">
          <span>Obstacle tiles</span>
          <span className="text-amber-300">{obstacleCount}</span>
        </div>
        <div className="flex justify-between text-stone-400">
          <span>Overrides</span>
          <span className="text-amber-300">{Object.keys(overrides).length}</span>
        </div>
      </div>

      <div className="text-xs text-stone-500 bg-stone-800 rounded p-2 leading-4">
        <span className="text-red-400">■</span> Click tile → obstacle<br />
        <span className="text-green-400">■</span> Click obstacle → grass<br />
        Path tiles are locked.
      </div>

      <div className="mt-1 pt-3 border-t border-stone-700 flex flex-col gap-2">
        <p className="text-xs text-stone-500">Paste into buildGrid():</p>
        {lines.length === 0 ? (
          <p className="text-xs text-stone-600 italic">No overrides yet</p>
        ) : (
          <pre className="text-xs text-stone-300 bg-stone-800 p-2 rounded leading-5 overflow-x-auto select-all">
            {lines.join('\n')}
          </pre>
        )}
      </div>
    </aside>
  );
}
