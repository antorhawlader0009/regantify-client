import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courierApi, type RedxArea } from '../../lib/courierApi';

// RedX has ≈2,800 delivery areas; the list only ever shows this many
// matches so the dropdown stays usable — typing narrows it down.
const MAX_SHOWN = 300;

function matches(area: RedxArea, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return area.name.toLowerCase().includes(t) || String(area.postCode ?? '').startsWith(t) || (area.divisionName ?? '').toLowerCase().includes(t);
}

interface RedxAreaSelectProps {
  value: number | null;
  onChange: (area: RedxArea | null) => void;
  disabled?: boolean;
}

/**
 * One RedX delivery area out of RedX's flat list (no city/zone cascade),
 * with a search box that filters by area name, post code or division.
 * Needs a connected RedX account (the list comes through the vendor's token).
 */
export function RedxAreaSelect({ value, onChange, disabled }: RedxAreaSelectProps) {
  const [term, setTerm] = useState('');
  const { data: areas, isLoading, isError } = useQuery({
    queryKey: ['redx-areas'],
    queryFn: courierApi.getRedxAreas,
    staleTime: 60 * 60_000,
  });

  const selected = areas?.find((a) => a.id === value) ?? null;
  const shown = useMemo(() => {
    const list = (areas ?? []).filter((a) => matches(a, term.trim())).slice(0, MAX_SHOWN);
    // Keep the current pick selectable even when the search hides it.
    return selected && !list.some((a) => a.id === selected.id) ? [selected, ...list] : list;
  }, [areas, term, selected]);

  if (isError) return <p className="text-xs text-red-500">Could not load RedX delivery areas. Please refresh the page.</p>;

  return (
    <div className="space-y-1.5">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        disabled={disabled || isLoading}
        placeholder={isLoading ? 'Loading RedX areas…' : 'Search area, post code or division'}
        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none disabled:opacity-60"
      />
      <select
        value={value ?? ''}
        disabled={disabled || isLoading}
        onChange={(e) => onChange(areas?.find((a) => a.id === Number(e.target.value)) ?? null)}
        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60"
      >
        <option value="" disabled>
          {shown.length === 0 && term ? 'No area matches your search' : 'Select a delivery area'}
        </option>
        {shown.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.postCode ? ` · ${a.postCode}` : ''}
            {a.divisionName ? ` · ${a.divisionName}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
