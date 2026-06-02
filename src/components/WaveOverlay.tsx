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

const HOLD_MS    = 1400;  // time fully visible
const FADE_OUT_MS = 400;

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

  const isStart = data.kind === 'start';
  const title    = isStart ? `Wave ${data.wave}` : `Wave ${data.wave} Complete`;
  const subtitle = isStart ? 'Prepare your defenses' : 'Enemies vanquished';
  const accent   = isStart ? 'text-amber-400' : 'text-emerald-400';
  const icon     = isStart ? '⚔️' : '🛡️';

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div
        key={data.id}
        className={phase === 'in' ? 'animate-overlay-in text-center' : 'animate-overlay-out text-center'}
      >
        <div className={`font-medieval font-black tracking-wider drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] text-6xl ${accent}`}>
          <span className="mr-3">{icon}</span>{title}<span className="ml-3">{icon}</span>
        </div>
        <div className="mt-3 font-medieval text-lg text-stone-300 tracking-widest uppercase">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
