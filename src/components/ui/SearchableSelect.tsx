import { useMemo, useRef, useState } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  id: number;
  label: string;
  /** Muted text after the label, e.g. "(pickup only)". Not searched. */
  suffix?: string;
}

interface SearchableSelectProps {
  value: number | null;
  options: SearchableOption[] | undefined;
  onChange: (id: number) => void;
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  /** Tailwind classes for the trigger button — callers match their own form's input style. */
  className?: string;
  ariaLabel?: string;
}

// Rendering a few hundred rows is fine; Pathao's biggest list (areas in
// one zone) tops out around 450, so this cap only guards against misuse.
const MAX_VISIBLE = 300;

/** "Mirpur-10" / "mirpur10" / "MIRPUR 10" all become "mirpur 10". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]+/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim();
}

/**
 * A select you can type into — click, type "mirpur 10", Enter. Every word
 * typed must appear somewhere in the option (any order), and options
 * starting with the query sort first. Keyboard: ↑/↓ to move, Enter to
 * pick, Esc to close. Portalled (Radix Popover), so it isn't clipped when
 * used inside a scrolling Dialog.
 */
export function SearchableSelect({ value, options, onChange, placeholder, loading, disabled, className, ariaLabel }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options?.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const list = options ?? [];
    const q = normalize(query);
    if (!q) return list.slice(0, MAX_VISIBLE);
    const words = q.split(' ');
    return list
      .map((o) => ({ o, n: normalize(o.label) }))
      .filter(({ n }) => words.every((w) => n.includes(w)))
      .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)))
      .slice(0, MAX_VISIBLE)
      .map(({ o }) => o);
  }, [options, query]);

  function pick(id: number) {
    onChange(id);
    setOpen(false);
  }

  function moveHighlight(next: number) {
    const clamped = Math.max(0, Math.min(filtered.length - 1, next));
    setHighlight(clamped);
    listRef.current?.children[clamped]?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery('');
          const index = options?.findIndex((o) => o.id === value) ?? -1;
          setHighlight(Math.max(0, index));
        }
      }}
    >
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          disabled={disabled || loading}
          aria-label={ariaLabel}
          className={`${className ?? ''} flex items-center justify-between gap-2 text-left`}
        >
          <span className={`truncate ${selected ? '' : 'text-regantify-text-muted'}`}>
            {loading ? 'Loading…' : selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={14} className="shrink-0 text-regantify-text-muted" />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[220px] bg-white rounded-xl shadow-lg border border-black/10 p-1.5 focus:outline-none"
          onOpenAutoFocus={(e) => {
            // Focus the search box, not the first list item.
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector('input')?.focus();
          }}
        >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
              listRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveHighlight(highlight + 1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveHighlight(highlight - 1);
              } else if (e.key === 'Enter') {
                e.preventDefault(); // never submit the surrounding form
                const option = filtered[highlight];
                if (option) pick(option.id);
              }
            }}
            placeholder="Type to search…"
            className="w-full px-2.5 py-1.5 mb-1.5 rounded-lg border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
          />
          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2.5 py-2 text-xs text-regantify-text-muted">No matches</li>
            ) : (
              filtered.map((option, i) => (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={option.id === value}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the search box
                  onClick={() => pick(option.id)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer ${
                    i === highlight ? 'bg-regantify-content' : ''
                  } text-regantify-text`}
                >
                  <span className="truncate">
                    {option.label}
                    {option.suffix && <span className="text-regantify-text-muted"> {option.suffix}</span>}
                  </span>
                  {option.id === value && <Check size={14} className="shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
