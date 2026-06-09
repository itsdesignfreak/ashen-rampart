import { useState } from 'react';
import type { ReactNode } from 'react';

interface Props {
  onClose: () => void;
}

interface Slide {
  icon:  string;       // path to a header icon
  title: string;
  body:  ReactNode;
}

const SLIDES: Slide[] = [
  {
    icon:  '/assets/ui/icons/heart.svg',
    title: 'Defend the Village',
    body: (
      <>
        Enemies march along the path toward your base. Stop them before they
        break through. You lose a <strong>life</strong> for every enemy that
        reaches the end — when lives hit <strong>0</strong>, it&rsquo;s game over.
      </>
    ),
  },
  {
    icon:  '/assets/ui/icons/coins.svg',
    title: 'Build Towers',
    body: (
      <>
        Pick a tower from the bar at the bottom, then click a grass tile to place
        it. Each tower costs <strong>gold</strong>. Towers automatically attack
        any enemy that wanders into range.
      </>
    ),
  },
  {
    icon:  '/assets/ui/icons/sword.svg',
    title: 'Know Your Towers',
    body: (
      <ul className="flex flex-col gap-2 text-left">
        <li className="flex items-center gap-2">
          <img src="/assets/ui/icons/archer.svg" alt="" className="size-4 invert" />
          <span><strong>Archer</strong> — fast, single-target damage.</span>
        </li>
        <li className="flex items-center gap-2">
          <img src="/assets/ui/icons/mage.svg" alt="" className="size-4 invert" />
          <span><strong>Mage</strong> — slows enemies with a magic beam.</span>
        </li>
        <li className="flex items-center gap-2">
          <img src="/assets/ui/icons/cannon.svg" alt="" className="size-4 invert" />
          <span><strong>Cannon</strong> — slow, but heavy splash damage.</span>
        </li>
      </ul>
    ),
  },
  {
    icon:  '/assets/ui/icons/sword.svg',
    title: 'Start the Wave',
    body: (
      <>
        When you&rsquo;re ready, press <strong>Start Wave</strong>. Enemies spawn
        and follow the path while your towers fire on their own. You can keep
        building during a wave — place towers wherever the gold allows.
      </>
    ),
  },
  {
    icon:  '/assets/ui/icons/coins.svg',
    title: 'Earn & Survive',
    body: (
      <>
        Every enemy you defeat rewards <strong>gold</strong> to spend on more
        towers. Hold the line through all <strong>3 waves</strong> to claim
        victory. Good luck, commander!
      </>
    ),
  },
];

/** How-to-play tutorial — a carousel (next / prev), never scrolls. */
export function HowToPlay({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const last  = SLIDES.length - 1;
  const slide = SLIDES[index];
  const isLast = index === last;

  const next = () => (isLast ? onClose() : setIndex(i => Math.min(last, i + 1)));
  const prev = () => setIndex(i => Math.max(0, i - 1));

  return (
    /* backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 font-ui"
      onMouseDown={onClose}
    >
      <div
        className="flex w-[460px] flex-col rounded-xl border border-black/10 bg-white p-6 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-black">How to Play</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-black/40 transition-colors hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Slide — fixed height so the card never resizes or scrolls */}
        <div className="flex h-48 flex-col items-center justify-center gap-3 px-2 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-full"
            style={{ backgroundColor: '#cc6026' }}
          >
            <img src={slide.icon} alt="" className="size-6" />
          </span>
          <h3 className="text-lg font-semibold text-black">{slide.title}</h3>
          <div className="text-sm leading-relaxed text-black/70">{slide.body}</div>
        </div>

        {/* Dots */}
        <div className="my-4 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className="size-2 rounded-full transition-colors"
              style={{ backgroundColor: i === index ? '#cc6026' : 'rgba(0,0,0,0.15)' }}
            />
          ))}
        </div>

        {/* Footer nav — 3-col grid keeps the counter truly centered */}
        <div className="grid grid-cols-3 items-center">
          <button
            onClick={prev}
            disabled={index === 0}
            className="justify-self-start rounded-md px-4 py-2 text-sm text-black/60 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-0"
          >
            Back
          </button>
          <span className="justify-self-center text-xs text-black/40">{index + 1} / {SLIDES.length}</span>
          <button
            onClick={next}
            className="justify-self-end rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#cc6026' }}
          >
            {isLast ? "Let's Play" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
