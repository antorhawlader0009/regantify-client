/**
 * The period switch at the top right of a card (admin-panel-new-theme.md Step 3): plain words, the selected one an orange gradient pill.
 * Each page passes its own options (the Dashboard's are Today / 7 days / 30 days / This month).
 */
export function RangeTabs<T extends string>({
  options,
  value,
  onChange,
  label = 'Period',
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-nowrap items-center gap-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`h-7 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium transition ${
              on ? 'bg-[image:var(--console-accent-gradient)] text-white shadow-[0_4px_10px_rgba(245,87,108,0.25)]' : 'text-regantify-text-muted hover:bg-regantify-search hover:text-regantify-text'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
