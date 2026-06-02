import { useState } from 'react';

interface Props {
  // Display
  showObstacles: boolean;
  showNPC:       boolean;
  onToggleObstacles: (on: boolean) => void;
  onToggleNPC:       (on: boolean) => void;
  // Audio
  bgmEnabled: boolean;
  bgmVolume:  number;   // 0–1
  sfxVolume:  number;   // 0–1
  onBgmToggle: (on: boolean) => void;
  onBgmVolume: (v: number)   => void;
  onSfxVolume: (v: number)   => void;
  // Panel
  onClose: () => void;
}

type Tab = 'display' | 'audio';

/** Reusable on/off toggle switch */
function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-200">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={[
          'relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
          on ? 'bg-amber-600' : 'bg-stone-600',
        ].join(' ')}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            on ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({
  showObstacles, showNPC, onToggleObstacles, onToggleNPC,
  bgmEnabled, bgmVolume, sfxVolume,
  onBgmToggle, onBgmVolume, onSfxVolume,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('display');

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={[
        'flex-1 text-xs uppercase tracking-wider py-2 rounded-md transition-colors',
        tab === id
          ? 'bg-amber-700 text-white'
          : 'bg-stone-800 text-stone-400 hover:text-white',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    /* backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-600 rounded-xl p-6 w-80 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400">
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabBtn('display', '👁️ Display')}
          {tabBtn('audio',   '🔊 Audio')}
        </div>

        {/* ── Display tab ── */}
        {tab === 'display' && (
          <div className="flex flex-col gap-4">
            <ToggleSwitch
              on={showObstacles}
              onChange={onToggleObstacles}
              label="Show Blocked Tiles"
            />
            <ToggleSwitch
              on={showNPC}
              onChange={onToggleNPC}
              label="Show NPCs"
            />
          </div>
        )}

        {/* ── Audio tab ── */}
        {tab === 'audio' && (
          <div className="flex flex-col gap-5">
            {/* BGM */}
            <div>
              <div className="mb-2">
                <ToggleSwitch
                  on={bgmEnabled}
                  onChange={onBgmToggle}
                  label="Background Music"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-500 text-xs">🔇</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={bgmVolume}
                  disabled={!bgmEnabled}
                  onChange={e => onBgmVolume(Number(e.target.value))}
                  className="flex-1 accent-amber-500 disabled:opacity-30"
                />
                <span className="text-stone-500 text-xs">🔊</span>
                <span className="text-xs text-stone-400 w-7 text-right">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>
            </div>

            {/* SFX */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-200">Sound Effects</span>
                <span className="text-xs text-stone-400">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-500 text-xs">🔇</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={sfxVolume}
                  onChange={e => onSfxVolume(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-stone-500 text-xs">🔊</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
