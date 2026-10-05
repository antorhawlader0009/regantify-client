import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { HomeHighlight } from '../../../../lib/designSettingsApi';
import { HIGHLIGHT_ICONS, highlightIcon } from '../../../../lib/highlightIcons';
import {
  COMFORTABLE_HIGHLIGHTS,
  DEFAULT_HIGHLIGHTS,
  HIGHLIGHT_PRESETS,
  MAX_HIGHLIGHTS,
  newHighlightId,
} from '../../../../lib/homeSections';
import { inputClass } from './designShared';

const iconButtonClass =
  'rounded p-1 text-regantify-text-muted hover:bg-black/5 hover:text-regantify-text disabled:opacity-30 disabled:hover:bg-transparent';

/** How the band will look: a small stand-in for the storefront (its colours follow the store's theme). */
function HighlightsPreview({ items, heading }: { items: HomeHighlight[]; heading: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-regantify-text-muted">Preview</p>
      <div className="rounded-xl border border-black/5 bg-neutral-50 px-4 py-5">
        {heading.trim() && <p className="mb-4 text-center text-sm font-semibold text-regantify-text">{heading.trim()}</p>}
        {items.length === 0 ? (
          <p className="text-center text-xs text-regantify-text-muted">Nothing to show. This section stays hidden on your store.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-5">
            {items.map((item) => {
              const Icon = highlightIcon(item.icon);
              return (
                <div key={item.id} className="flex w-[150px] flex-col items-center gap-1.5 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-regantify-text">
                    <Icon size={18} />
                  </span>
                  <p className="text-[13px] font-semibold text-regantify-text">{item.title.trim() || 'Untitled'}</p>
                  {item.text.trim() && <p className="text-xs leading-relaxed text-regantify-text-muted">{item.text.trim()}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Store highlights for the StorePal home page: up to 9 short points, each with
 * an icon, a title and a line of text (free delivery, easy returns, handmade...).
 * The vendor adds, removes and reorders them, and can start from one-tap
 * suggestions that suit different kinds of shop. The list here is exactly what
 * gets saved; Customize decides what an empty list means.
 */
export function HighlightsEditor({
  items,
  onChange,
  heading,
  onHeadingChange,
}: {
  items: HomeHighlight[];
  onChange: (items: HomeHighlight[]) => void;
  heading: string;
  onHeadingChange: (heading: string) => void;
}) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const full = items.length >= MAX_HIGHLIGHTS;

  // The icon picker closes on a tap elsewhere or Esc.
  useEffect(() => {
    if (!pickerFor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-icon-picker]')) setPickerFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerFor(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerFor]);

  // A newly added highlight takes focus so the vendor can type right away.
  useEffect(() => {
    if (!focusId) return;
    listRef.current?.querySelector<HTMLInputElement>(`[data-title-for="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [focusId, items]);

  const update = (id: string, patch: Partial<HomeHighlight>) =>
    onChange(items.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = (preset?: Omit<HomeHighlight, 'id'>) => {
    if (full) return;
    const item: HomeHighlight = { id: newHighlightId(), ...(preset ?? { icon: 'SPARKLES', title: '', text: '' }) };
    onChange([...items, item]);
    setFocusId(item.id);
  };

  const usedTitles = new Set(items.map((h) => h.title.trim().toLowerCase()));
  const suggestions = HIGHLIGHT_PRESETS.filter((p) => !usedTitles.has(p.title.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="highlights-heading" className="mb-1.5 block text-xs font-medium text-regantify-text-muted">
          Heading (optional)
        </label>
        <input
          id="highlights-heading"
          className={inputClass}
          value={heading}
          maxLength={60}
          placeholder="For example: Why shop with us"
          onChange={(e) => onHeadingChange(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-sm text-regantify-text-muted">
          No highlights yet. Add one below, or pick a suggestion. With none, this section stays hidden on your store.
        </p>
      ) : (
        <ul ref={listRef} className="space-y-3">
          {items.map((item, index) => {
            const Icon = highlightIcon(item.icon);
            return (
              <li key={item.id} className="flex gap-3 rounded-xl border border-black/10 bg-white p-3.5">
                <div className="relative shrink-0" data-icon-picker>
                  <button
                    type="button"
                    onClick={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                    aria-haspopup="true"
                    aria-expanded={pickerFor === item.id}
                    aria-label={`Icon for ${item.title.trim() || 'this highlight'}. Change icon`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/5 text-regantify-text transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <Icon size={20} />
                  </button>
                  {pickerFor === item.id && (
                    <div
                      role="group"
                      aria-label="Choose an icon"
                      className="absolute left-0 top-[calc(100%+6px)] z-20 grid w-[212px] grid-cols-4 gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-lg"
                    >
                      {HIGHLIGHT_ICONS.map(({ key, label, Icon: Option }) => (
                        <button
                          key={key}
                          type="button"
                          title={label}
                          aria-label={label}
                          aria-pressed={key === item.icon}
                          onClick={() => {
                            update(item.id, { icon: key });
                            setPickerFor(null);
                          }}
                          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                            key === item.icon ? 'bg-regantify-cta text-white' : 'text-regantify-text hover:bg-black/5'
                          }`}
                        >
                          <Option size={18} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    data-title-for={item.id}
                    aria-label="Highlight title"
                    className={inputClass}
                    value={item.title}
                    maxLength={40}
                    placeholder="Title, for example: Easy returns"
                    onChange={(e) => update(item.id, { title: e.target.value })}
                  />
                  <textarea
                    aria-label="Highlight text"
                    className={`${inputClass} min-h-[64px] resize-y`}
                    value={item.text}
                    maxLength={140}
                    placeholder="One short line that backs it up"
                    onChange={(e) => update(item.id, { text: e.target.value })}
                  />
                </div>

                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.title.trim() || 'highlight'} up`}
                    className={iconButtonClass}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.title.trim() || 'highlight'} down`}
                    className={iconButtonClass}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((h) => h.id !== item.id))}
                    aria-label={`Delete ${item.title.trim() || 'highlight'}`}
                    className="rounded p-1 text-regantify-text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => add()}
          disabled={full}
          className="flex items-center gap-1.5 rounded-xl border border-black/15 px-4 py-2 text-sm font-medium text-regantify-text transition-colors hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Plus size={15} />
          Add highlight
        </button>
        <span className="text-xs text-regantify-text-muted" aria-live="polite">
          {items.length} of {MAX_HIGHLIGHTS}
          {full ? ' (that is the most you can add)' : ''}
        </span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_HIGHLIGHTS)}
          className="text-xs font-medium text-regantify-text-muted underline underline-offset-2 hover:text-regantify-text"
        >
          Use the default highlights
        </button>
      </div>

      {items.length > COMFORTABLE_HIGHLIGHTS && (
        <p className="text-xs text-regantify-text-muted">
          {COMFORTABLE_HIGHLIGHTS} or fewer read best. A long row gets crowded, most of all on phones.
        </p>
      )}

      {suggestions.length > 0 && !full && (
        <div>
          <p className="mb-2 text-xs font-medium text-regantify-text-muted">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((preset) => {
              const Icon = highlightIcon(preset.icon);
              return (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => add(preset)}
                  className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-regantify-text transition-colors hover:bg-black/5"
                >
                  <Icon size={13} />
                  {preset.title}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-regantify-text-muted">Each one is only a starting point. Edit the words so they are true for your store.</p>
        </div>
      )}

      <HighlightsPreview items={items} heading={heading} />
    </div>
  );
}
