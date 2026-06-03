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

/** Reusable on/off toggle switch (accent = #cc6026) */
function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-black/80">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={[
          'relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
          on ? 'bg-[#cc6026]' : 'bg-black/20',
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
          ? 'bg-[#333] text-white'
          : 'bg-black/5 text-black/50 hover:text-black',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    /* backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 font-ui"
      onMouseDown={onClose}
    >
      <div
        className="bg-white border border-black/10 rounded-xl p-6 w-80 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-black">
            <img src="/assets/ui/icons/gear.svg" alt="" className="size-4 invert" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-black/40 hover:text-black text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabBtn('display', 'Display')}
          {tabBtn('audio',   'Audio')}
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
                <span className="text-black/40 text-xs">🔇</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={bgmVolume}
                  disabled={!bgmEnabled}
                  onChange={e => onBgmVolume(Number(e.target.value))}
                  className="flex-1 accent-[#cc6026] disabled:opacity-30"
                />
                <span className="text-black/40 text-xs">🔊</span>
                <span className="text-xs text-black/60 w-7 text-right">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>
            </div>

            {/* SFX */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-black/80">Sound Effects</span>
                <span className="text-xs text-black/60">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-black/40 text-xs">🔇</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={sfxVolume}
                  onChange={e => onSfxVolume(Number(e.target.value))}
                  className="flex-1 accent-[#cc6026]"
                />
                <span className="text-black/40 text-xs">🔊</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
