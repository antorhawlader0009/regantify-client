import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/**
 * The "Advanced" button used across the vendor dashboard. A page keeps the
 * everyday fields visible and puts the rarely-needed ones behind this button,
 * so a new seller isn't faced with every option at once. The state lives in the
 * page (hidden fields keep their values and are still saved); `inUse` is how
 * many advanced options currently hold a value, so nothing set is ever hidden
 * without a hint.
 */
export function AdvancedToggle({
  open,
  onToggle,
  inUse = 0,
  label = 'Advanced',
  className = '',
}: {
  open: boolean;
  onToggle: () => void;
  inUse?: number;
  /** Button text, e.g. "More filters and tools". */
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? 'Hide the advanced options' : 'Show the advanced options'}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
        open ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-white text-regantify-text hover:bg-neutral-50'
      } ${className}`}
    >
      <SlidersHorizontal size={15} />
      {label}
      {inUse > 0 && !open && (
        <span className="rounded-full bg-brand px-1.5 py-px text-[11px] font-semibold leading-tight text-white">{inUse} in use</span>
      )}
      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

/** A small bar at the foot of a form: "Looking for more options?" with the same toggle. */
export function AdvancedHint({
  open,
  onToggle,
  inUse = 0,
  what,
}: {
  open: boolean;
  onToggle: () => void;
  inUse?: number;
  /** What the hidden options cover, e.g. "bundles, quantity prices, barcode, SEO". */
  what: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line bg-neutral-50/60 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-neutral-500">
        {open ? 'Advanced options are showing.' : 'More options are hidden to keep this simple:'} <span className="text-neutral-400">{what}</span>
      </p>
      <AdvancedToggle open={open} onToggle={onToggle} inUse={inUse} />
    </div>
  );
}

const PANEL_KEY = 'regantify.advancedPanel.';

function readPanel(key: string): boolean | null {
  try {
    const v = localStorage.getItem(PANEL_KEY + key);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

/**
 * For settings pages: the everyday settings sit on top, and the rarely-used ones go inside this panel under one
 * "Advanced settings" button. It remembers (per browser) that you opened it, and starts open when something inside is
 * already switched on (`inUse`), so a running feature is never out of sight. Children stay unmounted while closed;
 * each settings block here saves on its own, so nothing is lost by hiding it.
 */
export function AdvancedPanel({
  id,
  title = 'Advanced settings',
  what,
  inUse = 0,
  spaced = false,
  children,
}: {
  /** Storage key for "opened once", unique per page. */
  id: string;
  title?: string;
  /** What is inside, in plain words: "Express delivery, pickup, delivery day…". */
  what: string;
  /** How many of the hidden settings are switched on right now. */
  inUse?: number;
  /** Stack the children with a gap (cards); settings blocks that carry their own spacing leave it off. */
  spaced?: boolean;
  children: ReactNode;
}) {
  const [pick, setPick] = useState<boolean | null>(() => readPanel(id));
  if (pick === null && inUse > 0) setPick(true);
  const open = pick ?? false;
  const toggle = () => {
    const next = !open;
    setPick(next);
    try {
      localStorage.setItem(PANEL_KEY + id, next ? '1' : '0');
    } catch {
      // storage blocked: it just closes again next visit
    }
  };
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line bg-neutral-50/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-regantify-text">{title}</p>
          <p className="text-sm text-neutral-500">{what}</p>
        </div>
        <AdvancedToggle open={open} onToggle={toggle} inUse={inUse} />
      </div>
      {open && <div className={spaced ? 'mt-4 space-y-4' : 'mt-2'}>{children}</div>}
    </div>
  );
}
