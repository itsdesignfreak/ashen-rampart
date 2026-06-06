import type { TowerType } from '../types';
import { TOWER_STATS } from '../engine/towerData';
import { MAX_WAVES } from '../constants';
import { Pill } from './Pill';

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

const ICON = {
  coins:  '/assets/ui/icons/coins.svg',
  heart:  '/assets/ui/icons/heart.svg',
  sword:  '/assets/ui/icons/sword.svg',
  gear:   '/assets/ui/icons/gear.svg',
  archer: '/assets/ui/icons/archer.svg',
  mage:   '/assets/ui/icons/mage.svg',
  cannon: '/assets/ui/icons/cannon.svg',
} as const;

const TOWER_ORDER: TowerType[] = ['arrow', 'mage', 'cannon'];
const TOWER_ICON: Record<TowerType, string> = {
  arrow:  ICON.archer,
  mage:   ICON.mage,
  cannon: ICON.cannon,
};

export function BottomHUD({
  gold, lives, wave,
  selectedTower, onSelectTower, canAfford,
  waveActive, onStartWave, onOpenSettings,
}: Props) {
  return (
    <footer className="shrink-0 w-full flex items-center justify-between px-6 py-4 border-t border-black/10">
      {/* ── Left: stats ── */}
      <div className="flex items-center gap-3">
        <Pill icon={ICON.coins} ariaLabel="Gold"  tooltip={`Gold: ${gold}`}>{gold}</Pill>
        <Pill icon={ICON.heart} ariaLabel="Lives" tooltip={`Life: ${lives}`}>{lives}</Pill>
        <Pill icon={ICON.sword} ariaLabel="Wave"  tooltip={`Wave: ${wave}`}>{wave}</Pill>
      </div>

      {/* ── Center: tower picker ── */}
      <div className="flex items-center gap-4">
        {TOWER_ORDER.map(type => {
          const stats = TOWER_STATS[type];
          return (
            <Pill
              key={type}
              square
              icon={TOWER_ICON[type]}
              active={selectedTower === type}
              disabled={!canAfford(type)}
              onClick={() => onSelectTower(type)}
              title={`${stats.label} — ${stats.cost}g`}
            >
              <span className="inline-flex items-center gap-1">
                <img
                  src={ICON.coins}
                  alt=""
                  draggable={false}
                  className="block size-3 shrink-0"
                />
                {stats.cost}
              </span>
            </Pill>
          );
        })}
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-3">
        {(() => {
          const allWavesDone = !waveActive && wave >= MAX_WAVES;
          return (
            <Pill
              variant="accent"
              icon={ICON.sword}
              onClick={onStartWave}
              disabled={waveActive || lives === 0 || allWavesDone}
            >
              {waveActive
                ? `Wave ${wave} — Fighting`
                : allWavesDone
                  ? 'All Waves Cleared'
                  : `Start Wave ${wave + 1}`}
            </Pill>
          );
        })()}
        <Pill icon={ICON.gear} onClick={onOpenSettings}>Settings</Pill>
      </div>
    </footer>
  );
}
