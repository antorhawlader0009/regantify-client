import { useState } from 'react';
import { Calendar } from 'lucide-react';
import * as RadixPopover from '@radix-ui/react-popover';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}

/** Today in Dhaka as YYYY-MM-DD, shifted by `days`. */
function dhakaDay(days = 0) {
  const t = Date.now() + 6 * 60 * 60_000 + days * 24 * 60 * 60_000;
  return new Date(t).toISOString().slice(0, 10);
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: 'Today', range: () => [dhakaDay(), dhakaDay()] },
  { label: 'Yesterday', range: () => [dhakaDay(-1), dhakaDay(-1)] },
  { label: 'Last 7 days', range: () => [dhakaDay(-6), dhakaDay()] },
  { label: 'Last 30 days', range: () => [dhakaDay(-29), dhakaDay()] },
  { label: 'This month', range: () => [`${dhakaDay().slice(0, 8)}01`, dhakaDay()] },
];

function formatLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return 'All dates';
  const preset = PRESETS.find((p) => {
    const [from, to] = p.range();
    return from === dateFrom && to === dateTo;
  });
  if (preset) return preset.label;
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (dateFrom && dateTo) return dateFrom === dateTo ? fmt(dateFrom) : `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  return `Until ${fmt(dateTo)}`;
}

const dateInput =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

/** "All dates" button that opens shortcuts (Today, Last 7 days, ...) and a from/to picker. Days are YYYY-MM-DD. */
export function DateRangeFilter({ dateFrom, dateTo, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const active = Boolean(dateFrom || dateTo);

  const apply = (from: string, to: string) => {
    onChange(from, to);
    setOpen(false);
  };

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraftFrom(dateFrom);
          setDraftTo(dateTo);
        }
      }}
    >
      <RadixPopover.Trigger asChild>
        <button
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm text-regantify-text transition-colors hover:bg-neutral-50 ${
            active ? 'border-brand bg-brand-lime/20' : 'border-line bg-white'
          }`}
        >
          <Calendar size={15} aria-hidden />
          {formatLabel(dateFrom, dateTo)}
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          align="start"
          className="z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-3 shadow-lg focus:outline-none"
        >
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const [from, to] = p.range();
              const on = from === dateFrom && to === dateTo;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => apply(from, to)}
                  className={`h-8 rounded-full border px-3 text-xs transition-colors ${
                    on ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">From</span>
              <input type="date" value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} className={dateInput} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">To</span>
              <input type="date" value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} className={dateInput} />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftFrom('');
                setDraftTo('');
                apply('', '');
              }}
              className="h-9 rounded-lg px-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-regantify-text"
            >
              All dates
            </button>
            <button
              type="button"
              onClick={() => apply(draftFrom, draftTo)}
              className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              Apply
            </button>
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
