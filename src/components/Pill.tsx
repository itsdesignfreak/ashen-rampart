import type { ReactNode } from 'react';

// Exact shadow stacks from the Figma design (node 1197:61).
const SHEEN =
  'inset 0px 0.5px 0.5px 0px rgba(255,255,255,0.1),' +
  'inset 0px -0.5px 0.5px 0px rgba(0,0,0,0.1),' +
  'inset 0px 0px 0px 0.5px rgba(255,255,255,0.25)';
const RING_DARK   = '0px 0px 0px 0.5px rgba(0,0,0,0.8)';
const RING_ACCENT = '0px 0px 0px 0.5px rgba(204,96,38,0.8)';
const ACCENT_TOP  = 'inset 0px 4px 4px 0px rgba(255,255,255,0.15)';

interface Props {
  children?:  ReactNode;
  icon?:      string;          // path to a 16px svg icon
  onClick?:   () => void;
  active?:    boolean;
  disabled?:  boolean;
  variant?:   'default' | 'accent';
  square?:    boolean;         // tower buttons: rounded-4px, icon stacked over label
  title?:     string;
  ariaLabel?: string;
}

/**
 * Shared control surface for the UI — matches the Figma pill styling
 * (charcoal #333 / accent #cc6026, ring + inner sheen).
 */
export function Pill({
  children, icon, onClick, active = false, disabled = false,
  variant = 'default', square = false, title, ariaLabel,
}: Props) {
  const accent = variant === 'accent';
  const bg     = accent ? '#cc6026' : '#333';
  const ring   = accent ? RING_ACCENT : RING_DARK;
  const boxShadow = [ring, SHEEN, accent ? ACCENT_TOP : '']
    .filter(Boolean)
    .join(',');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={[
        'relative flex items-center justify-center px-2 py-1.5 overflow-hidden transition-all duration-150',
        square ? 'flex-col gap-1 rounded-[4px]' : 'gap-1 rounded-full',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-110',
        active ? 'ring-2 ring-[#cc6026] ring-offset-0' : '',
      ].join(' ')}
      style={{ backgroundColor: bg, boxShadow }}
    >
      {icon && <img src={icon} alt="" draggable={false} className="block size-4 shrink-0" />}
      {children != null && (
        <span className="font-ui text-[14px] leading-none text-white whitespace-nowrap">
          {children}
        </span>
      )}
    </button>
  );
}
