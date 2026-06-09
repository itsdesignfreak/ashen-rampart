import { Pill } from './Pill';

interface Props {
  onPlayAgain: () => void;
}

/** Four-pointed star ornament (matches the wave banner). */
function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" />
    </svg>
  );
}

/** End-of-game screen shown after the final wave is cleared. */
export function VictoryScreen({ onPlayAgain }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 font-ui">
      <div className="animate-overlay-in flex flex-col items-center px-8 text-center">
        <div className="mb-5 flex items-center gap-4 text-amber-200/70">
          <Ornament className="size-6" />
          <Ornament className="size-8" />
          <Ornament className="size-6" />
        </div>
        <h1 className="font-medieval text-5xl font-bold tracking-wide text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
          Stage 2 is under development!
        </h1>
        <p className="mt-4 font-ui text-lg tracking-wide text-white/75 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          Thanks for playing!
        </p>
        <div className="mt-9 scale-[1.15]">
          <Pill variant="accent" icon="/assets/ui/icons/sword.svg" onClick={onPlayAgain}>
            Play Again
          </Pill>
        </div>
      </div>
    </div>
  );
}
