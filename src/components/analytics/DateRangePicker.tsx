import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { CalendarDays, ChevronDown } from 'lucide-react';
import {
  earliestDay,
  formatRange,
  isValidDay,
  parseDay,
  presetLabel,
  presetRange,
  PRESETS,
  RETENTION_YEARS,
  type DateRange,
  type PresetId,
} from './dateRanges';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Every month from `first` to `last` ("YYYY-MM"), oldest first. */
function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  for (let month = first; month <= last; ) {
    months.push(month);
    const [y, m] = month.split('-').map(Number);
    month = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  }
  return months;
}

/** The month's days, with nulls before the 1st so it lines up under Sunday-first weekdays. */
function monthGrid(month: string): (string | null)[] {
  const first = parseDay(`${month}-01`);
  const blanks = first.getUTCDay();
  const [y, m] = month.split('-').map(Number);
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array<null>(blanks).fill(null), ...Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
}

/**
 * Analytics > the date range: a preset list (Today, Last 28 days, Last
 * month, ...) beside start/end fields and a scrolling calendar, applied
 * with Apply, discarded with Cancel. Nothing changes until Apply. Days
 * before the retention limit (RETENTION_YEARS) and after today can't be
 * picked. Picking a day on the calendar or typing a date makes it a
 * custom range.
 */
export function DateRangePicker({
  value,
  preset,
  today,
  onApply,
}: {
  value: DateRange;
  /** The preset the current range came from; null for a custom range. */
  preset: PresetId | null;
  today: string;
  onApply: (range: DateRange, preset: PresetId | null) => void;
}) {
  const min = earliestDay(today);
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(value.from);
  const [draftTo, setDraftTo] = useState<string | null>(value.to);
  const [draftPreset, setDraftPreset] = useState<PresetId | null>(preset);
  const [hover, setHover] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef(new Map<string, HTMLDivElement>());
  const months = useMemo(() => monthsBetween(min.slice(0, 7), today.slice(0, 7)), [min, today]);

  const reset = () => {
    setDraftFrom(value.from);
    setDraftTo(value.to);
    setDraftPreset(preset);
    setHover(null);
  };

  // Open on the month of the range's end, like the reference picker.
  const scrollToMonth = (day: string) => {
    const el = monthRefs.current.get(day.slice(0, 7));
    const box = scrollRef.current;
    if (el && box) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
  };
  useLayoutEffect(() => {
    if (open) requestAnimationFrame(() => scrollToMonth(value.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choosePreset = (id: PresetId) => {
    const range = presetRange(id, today);
    const from = range.from < min ? min : range.from;
    setDraftFrom(from);
    setDraftTo(range.to);
    setDraftPreset(id);
    scrollToMonth(range.to);
  };

  const pickDay = (day: string) => {
    setDraftPreset(null);
    if (!draftFrom || draftTo) {
      setDraftFrom(day);
      setDraftTo(null);
    } else if (day < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(day);
    } else {
      setDraftTo(day);
    }
  };

  const typeDay = (which: 'from' | 'to', day: string) => {
    if (!isValidDay(day)) return;
    const clamped = day < min ? min : day > today ? today : day;
    setDraftPreset(null);
    if (which === 'from') {
      setDraftFrom(clamped);
      if (draftTo && clamped > draftTo) setDraftTo(clamped);
    } else {
      setDraftTo(clamped);
      if (draftFrom && clamped < draftFrom) setDraftFrom(clamped);
    }
    scrollToMonth(clamped);
  };

  // While choosing the end, the band follows the pointer.
  const bandEnd = draftFrom && !draftTo && hover && hover >= draftFrom ? hover : draftTo;
  const canApply = !!draftFrom && !!draftTo;

  useEffect(() => {
    if (!open) setHover(null);
  }, [open]);

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm text-regantify-text hover:bg-regantify-content/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-regantify-cta/40"
        >
          <CalendarDays size={15} className="shrink-0 text-regantify-text-muted" aria-hidden />
          {preset && <span className="hidden sm:inline shrink-0 rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[12px] text-regantify-text-muted">{presetLabel(preset)}</span>}
          <span className="truncate font-medium tabular-nums">{formatRange(value)}</span>
          <ChevronDown size={15} className="shrink-0 text-regantify-text-muted" aria-hidden />
        </button>
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-40 w-[min(calc(100vw-32px),600px)] overflow-hidden rounded-2xl border border-black/[0.1] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.16)] focus:outline-none"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Presets */}
            <ul className="flex sm:block gap-1 overflow-x-auto sm:overflow-y-auto sm:max-h-[440px] border-b sm:border-b-0 sm:border-r border-black/[0.08] p-2 sm:w-[220px] shrink-0" role="listbox" aria-label="Date presets">
              {[{ id: null as PresetId | null, label: 'Custom' }, ...PRESETS].map((p) => {
                const selected = draftPreset === p.id;
                return (
                  <li key={p.id ?? 'custom'} className="shrink-0">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => (p.id ? choosePreset(p.id) : setDraftPreset(null))}
                      className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selected ? 'bg-regantify-content font-medium text-regantify-text' : 'text-regantify-text-muted hover:bg-black/[0.03] hover:text-regantify-text'
                      }`}
                    >
                      {p.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Custom dates */}
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-2 px-4 pt-4">
                <DateField label="Start date" value={draftFrom} min={min} max={today} onChange={(d) => typeDay('from', d)} />
                <span className="pb-2 text-regantify-text-muted" aria-hidden>
                  –
                </span>
                <DateField label="End date" value={draftTo} min={min} max={today} onChange={(d) => typeDay('to', d)} />
              </div>

              <div className="grid grid-cols-7 px-4 pt-3 pb-1 text-center text-[12px] text-regantify-text-muted" aria-hidden>
                {WEEKDAYS.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              <div ref={scrollRef} className="relative h-[300px] overflow-y-auto px-4 pb-3" onMouseLeave={() => setHover(null)}>
                {months.map((month) => (
                  <div
                    key={month}
                    ref={(el) => {
                      if (el) monthRefs.current.set(month, el);
                      else monthRefs.current.delete(month);
                    }}
                    className="pt-3"
                  >
                    <p className="mb-1.5 text-[13px] font-semibold text-regantify-text">
                      {parseDay(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </p>
                    <div className="grid grid-cols-7 gap-y-0.5">
                      {monthGrid(month).map((day, i) => {
                        if (!day) return <span key={`b${i}`} />;
                        const disabled = day < min || day > today;
                        const isStart = day === draftFrom;
                        const isEnd = day === bandEnd;
                        const inBand = !!draftFrom && !!bandEnd && day > draftFrom && day < bandEnd;
                        const edge = isStart || isEnd;
                        const band = inBand || (edge && draftFrom !== bandEnd && !!bandEnd);
                        return (
                          <div
                            key={day}
                            className={`flex justify-center ${band ? 'bg-black/[0.06]' : ''} ${isStart && band ? 'rounded-l-full' : ''} ${isEnd && band ? 'rounded-r-full' : ''}`}
                          >
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => pickDay(day)}
                              onMouseEnter={() => setHover(day)}
                              aria-pressed={edge}
                              aria-label={parseDay(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                              className={`h-9 w-9 rounded-full text-[13px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-regantify-cta/40 ${
                                edge
                                  ? 'bg-regantify-black font-semibold text-white'
                                  : disabled
                                    ? 'cursor-default text-black/20'
                                    : `text-regantify-text hover:bg-black/[0.08] ${day === today ? 'ring-1 ring-inset ring-regantify-black/60' : ''}`
                              }`}
                            >
                              {Number(day.slice(8))}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.08] px-4 py-3">
            <p className="text-[12px] text-regantify-text-muted">
              Visitor data is kept for {RETENTION_YEARS} years. Orders are always kept.
            </p>
            <div className="flex items-center gap-2">
              <RadixPopover.Close asChild>
                <button type="button" className="rounded-lg px-3.5 py-2 text-sm font-medium text-regantify-text hover:bg-black/[0.04]">
                  Cancel
                </button>
              </RadixPopover.Close>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => {
                  if (!draftFrom || !draftTo) return;
                  onApply({ from: draftFrom, to: draftTo }, draftPreset);
                  setOpen(false);
                }}
                className="rounded-lg bg-regantify-black px-4 py-2 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

function DateField({ label, value, min, max, onChange }: { label: string; value: string | null; min: string; max: string; onChange: (day: string) => void }) {
  return (
    <label className="flex-1 min-w-0">
      <span className="mb-1 block text-[12px] text-regantify-text-muted">{label}</span>
      <input
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/[0.12] px-2.5 py-1.5 text-sm tabular-nums text-regantify-text focus:border-regantify-black focus:outline-none"
      />
    </label>
  );
}
