interface Props {
  bgmEnabled: boolean;
  bgmVolume:  number;   // 0–1
  sfxVolume:  number;   // 0–1
  onBgmToggle: (on: boolean) => void;
  onBgmVolume: (v: number)   => void;
  onSfxVolume: (v: number)   => void;
  onClose: () => void;
}

export function SettingsPanel({
  bgmEnabled, bgmVolume, sfxVolume,
  onBgmToggle, onBgmVolume, onSfxVolume,
  onClose,
}: Props) {
  return (
    /* backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-600 rounded-xl p-6 w-72 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
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

        {/* BGM row */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-200">Background Music</span>
            {/* Toggle switch */}
            <button
              onClick={() => onBgmToggle(!bgmEnabled)}
              className={[
                'relative w-11 h-6 rounded-full transition-colors focus:outline-none',
                bgmEnabled ? 'bg-amber-600' : 'bg-stone-600',
              ].join(' ')}
              aria-label="Toggle BGM"
            >
              <span
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  bgmEnabled ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
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

        {/* SFX row */}
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
    </div>
  );
}
