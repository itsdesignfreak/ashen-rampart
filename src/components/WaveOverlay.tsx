import { useEffect, useState } from 'react';

export type WaveOverlayKind = 'start' | 'complete';

export interface WaveOverlayData {
  id:   number;          // unique so repeated waves re-trigger the animation
  kind: WaveOverlayKind;
  wave: number;
}

interface Props {
  data: WaveOverlayData | null;
  onDone: () => void;
}

const HOLD_MS    = 1600;  // time fully visible
const FADE_OUT_MS = 400;

/** Four-pointed star ornament that flanks the wave title. */
function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" />
    </svg>
  );
}

export function WaveOverlay({ data, onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!data) return;
    setPhase('in');
    const holdTimer = setTimeout(() => setPhase('out'), HOLD_MS);
    const doneTimer = setTimeout(onDone, HOLD_MS + FADE_OUT_MS);
    return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
  }, [data, onDone]);

  if (!data) return null;

  const isStart  = data.kind === 'start';
  const title    = isStart ? `Wave ${data.wave}` : `Wave ${data.wave} Complete`;
  const subtitle = isStart ? 'Prepare your defenses' : 'Enemies vanquished';
  const ornColor = isStart ? 'text-amber-200/70' : 'text-emerald-200/70';

  return (
    /* Covers (and dims) the map only — rendered inside the map frame.        */
    /* Banner sits in the lower-center of the map.                            */
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-end pb-[12%]
                    bg-gradient-to-t from-black/55 via-black/25 to-black/10">
      <div
        key={data.id}
        className={`flex flex-col items-center text-center ${phase === 'in' ? 'animate-overlay-in' : 'animate-overlay-out'}`}
      >
        <div className="flex items-center gap-5">
          <Ornament className={`size-5 shrink-0 ${ornColor}`} />
          <h2 className="font-medieval text-6xl font-bold tracking-wide text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
            {title}
          </h2>
          <Ornament className={`size-5 shrink-0 ${ornColor}`} />
        </div>
        <p className="mt-2 font-ui text-base tracking-wide text-white/75 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
