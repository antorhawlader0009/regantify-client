import {
  PERMISSION_LABELS,
  STAFF_PERMISSION_AREAS,
  STAFF_ROLE_PRESETS,
  STAFF_ROLES,
  expandImplied,
  type PresetRoleKey,
  type StaffPermission,
  type StaffPermissionArea,
} from '../../lib/staffPermissions';

const COLUMNS: ReadonlyArray<readonly ['view' | 'edit' | 'delete' | 'export', string]> = [
  ['view', 'View'],
  ['edit', 'Add & edit'],
  ['delete', 'Delete'],
  ['export', 'Export'],
];

const PRESET_KEYS = Object.keys(STAFF_ROLE_PRESETS) as PresetRoleKey[];

/** Ticking adds what it needs (edit → view); unticking also drops what needed it. */
export function togglePermission(current: readonly StaffPermission[], p: StaffPermission, on: boolean): StaffPermission[] {
  if (on) return expandImplied([...current, p]);
  return current.filter((q) => q !== p && !expandImplied([q]).includes(p));
}

function Box({ p, checked, onToggle, label }: { p: StaffPermission; checked: boolean; onToggle: (p: StaffPermission, on: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-regantify-text">
      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand" checked={checked} onChange={(e) => onToggle(p, e.target.checked)} />
      <span className={label === '' ? 'sr-only' : undefined}>{label || PERMISSION_LABELS[p]}</span>
    </label>
  );
}

/**
 * The custom role table (rule-plan.md 5.8): one row per dashboard area, a
 * column per kind of action, and the area's special actions under "Extra".
 * On phones each area becomes a block with its boxes labelled.
 */
export function PermissionMatrix({ value, onChange }: { value: StaffPermission[]; onChange: (next: StaffPermission[]) => void }) {
  const has = new Set(value);
  const toggle = (p: StaffPermission, on: boolean) => onChange(togglePermission(value, p, on));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="matrix-start" className="text-neutral-600">
          Start from
        </label>
        <select
          id="matrix-start"
          value=""
          onChange={(e) => e.target.value && onChange(expandImplied(STAFF_ROLE_PRESETS[e.target.value as PresetRoleKey]))}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          <option value="">Pick a ready-made role…</option>
          {PRESET_KEYS.map((k) => (
            <option key={k} value={k}>
              {STAFF_ROLES[k].name}
            </option>
          ))}
        </select>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-neutral-500 underline-offset-2 hover:text-regantify-text hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="hidden grid-cols-[minmax(130px,1.1fr)_repeat(4,minmax(64px,0.6fr))_minmax(160px,2fr)] gap-3 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 sm:grid">
          <span>Area</span>
          {COLUMNS.map(([, title]) => (
            <span key={title}>{title}</span>
          ))}
          <span>Extra</span>
        </div>
        {STAFF_PERMISSION_AREAS.map((area: StaffPermissionArea) => (
          <div
            key={area.key}
            className="grid grid-cols-1 gap-2 border-t border-line px-3 py-2.5 first:border-t-0 sm:grid-cols-[minmax(130px,1.1fr)_repeat(4,minmax(64px,0.6fr))_minmax(160px,2fr)] sm:items-center sm:gap-3 sm:first:border-t"
          >
            <span className="text-sm font-medium text-regantify-text">{area.label}</span>
            {COLUMNS.map(([col, title]) => {
              const p = area[col];
              return (
                <span key={col} className={p ? '' : 'hidden sm:block'}>
                  {p ? (
                    <>
                      <span className="sm:hidden">
                        <Box p={p} checked={has.has(p)} onToggle={toggle} label={title} />
                      </span>
                      <span className="hidden sm:inline-flex">
                        {/* The column says what it is; the hidden label names the action for screen readers. */}
                        <Box p={p} checked={has.has(p)} onToggle={toggle} label="" />
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-300" aria-hidden>
                      —
                    </span>
                  )}
                </span>
              );
            })}
            <span className="flex flex-wrap gap-x-4 gap-y-1.5">
              {(area.extras ?? []).map((p) => (
                <Box key={p} p={p} checked={has.has(p)} onToggle={toggle} label={PERMISSION_LABELS[p]} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
