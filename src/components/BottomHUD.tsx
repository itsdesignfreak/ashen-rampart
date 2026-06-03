import type { TowerType } from '../types';
import { TOWER_STATS } from '../engine/towerData';

interface Props {
  gold:  number;
  lives: number;
  wave:  number;
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType) => void;
  canAfford:     (type: TowerType) => boolean;
  waveActive:    boolean;
  onStartWave:   () => void;
  onOpenSettings: () => void;
}

// Tower sprite thumbnails (reuse the in-game tower art)
const TOWER_THUMB: Record<TowerType, string> = {
  arrow:  '/assets/towers/archer.png',
  mage:   '/assets/towers/mage.png',
  cannon: '/assets/towers/cannon.png',
};

const TOWER_ORDER: TowerType[] = ['arrow', 'mage', 'cannon'];

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex flex-col items-center min-w-[64px]">
      <span className="text-[10px] uppercase tracking-widest text-stone-500">{label}</span>
      <span className={`font-medieval text-2xl leading-tight ${valueClass}`}>{value}</span>
    </div>
  );
}

export function BottomHUD({
  gold, lives, wave,
  selectedTower, onSelectTower, canAfford,
  waveActive, onStartWave, onOpenSettings,
}: Props) {
  const livesClass = lives <= 5 ? 'text-red-500' : 'text-stone-100';

  return (
    <footer className="relative shrink-0 h-[96px] w-full bg-gradient-to-b from-stone-900 via-stone-950 to-black border-t-2 border-amber-700/60 flex items-center justify-between px-8 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">

      {/* ── Left: stats ── */}
      <div className="flex items-center gap-6">
        <Stat label="Gold"  value={`${gold}`}  valueClass="text-amber-400" />
        <div className="h-10 w-px bg-amber-900/40" />
        <Stat label="Lives" value={`${lives}`} valueClass={livesClass} />
        <div className="h-10 w-px bg-amber-900/40" />
        <Stat label="Wave"  value={`${wave}`}  valueClass="text-stone-300" />
      </div>

      {/* ── Center: tower buttons ── */}
      <div className="flex items-end gap-3">
        {TOWER_ORDER.map(type => {
          const stats      = TOWER_STATS[type];
          const selected   = selectedTower === type;
          const affordable = canAfford(type);
          return (
            <button
              key={type}
              onClick={() => onSelectTower(type)}
              disabled={!affordable}
              title={`${stats.label} — ${stats.cost}g`}
              className={[
                'relative flex flex-col items-center w-[78px] pt-1 pb-1.5 rounded-md border transition-all duration-150',
                selected
                  ? 'bg-amber-800/40 border-amber-400 scale-105 shadow-[0_0_12px_rgba(217,119,6,0.6)]'
                  : affordable
                    ? 'bg-stone-800/80 border-stone-600 hover:border-amber-600 hover:-translate-y-0.5'
                    : 'bg-stone-800/60 border-stone-700 opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              <img
                src={TOWER_THUMB[type]}
                alt={stats.label}
                className="w-11 h-11 object-contain drop-shadow"
                draggable={false}
              />
              <span className="font-medieval text-xs text-stone-200 leading-none">{stats.label}</span>
              <span className={[
                'absolute -top-2 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                affordable
                  ? 'bg-amber-500 text-stone-900 border-amber-300'
                  : 'bg-stone-700 text-stone-400 border-stone-600',
              ].join(' ')}>
                {stats.cost}g
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onStartWave}
          disabled={waveActive || lives === 0}
          className={[
            'font-medieval tracking-wide px-6 py-3 rounded-md border-2 transition-all duration-150',
            waveActive || lives === 0
              ? 'bg-amber-950 border-amber-900 text-amber-700/60 cursor-not-allowed'
              : 'bg-amber-700 border-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-[0_0_14px_rgba(217,119,6,0.5)]',
          ].join(' ')}
        >
          {waveActive
            ? <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Wave {wave} — Fighting
              </span>
            : <>⚔️ Start Wave {wave + 1}</>}
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-11 h-11 flex items-center justify-center rounded-md border border-stone-600 bg-stone-800/80 text-lg hover:border-amber-600 hover:text-white transition-colors"
        >
          ⚙️
        </button>
      </div>
    </footer>
  );
}
