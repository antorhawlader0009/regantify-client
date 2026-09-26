import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { courierApi, PATHAO_SUGGESTION_AUTO_APPLY, type PathaoLocationSuggestion } from '../../lib/courierApi';
import { SearchableSelect } from '../ui/SearchableSelect';

export interface PathaoLocationValue {
  cityId: number | null;
  zoneId: number | null;
  areaId: number | null;
}

/** The order's free-text address, for the "Suggested from address" pre-fill. */
export interface PathaoSuggestSource {
  address?: string | null;
  city?: string | null;
  district?: string | null;
}

interface PathaoLocationSelectsProps {
  value: PathaoLocationValue;
  onChange: (next: PathaoLocationValue) => void;
  disabled?: boolean;
  /** Tailwind classes for each picker — callers match their own form's input style. */
  selectClassName?: string;
  /**
   * When given, the address is matched to a Pathao location
   * (GET …/locations/suggest). A confident match is pre-selected while
   * the picker is still empty — and keeps following the address as it's
   * edited, until the vendor picks or clears something themselves. A
   * weaker match is only offered ("Use it").
   */
  suggestFrom?: PathaoSuggestSource;
}

const DEFAULT_SELECT_CLASS =
  'w-full px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60';

// Pathao's lists barely change, and the server caches them for a day too.
const LOCATION_STALE_MS = 24 * 60 * 60_000;

const EMPTY: PathaoLocationValue = { cityId: null, zoneId: null, areaId: null };

function sameLocation(a: PathaoLocationValue, b: PathaoLocationValue) {
  return a.cityId === b.cityId && a.zoneId === b.zoneId && a.areaId === b.areaId;
}

function toValue(s: PathaoLocationSuggestion): PathaoLocationValue {
  return { cityId: s.cityId, zoneId: s.zoneId, areaId: s.zoneId ? s.areaId : null };
}

function describe(s: PathaoLocationSuggestion) {
  return [s.cityName, s.zoneName, s.areaName].filter(Boolean).join(' › ');
}

/** `value`, but only after it has stopped changing for `delayMs`. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Controlled City → Zone → Area cascade for Pathao's numeric location
 * ids — the one place these pickers live (booking popup, create-store
 * dialog, Order Detail's PathaoLocationPicker, Add Order). Each level is
 * a type-to-search SearchableSelect. Picking a parent clears its
 * children. Query keys are shared app-wide (['pathao-cities'],
 * ['pathao-zones', cityId], ['pathao-areas', zoneId]), so every picker
 * reuses the same cached lists. Needs a connected Pathao account (the
 * location endpoints use its token).
 */
export function PathaoLocationSelects({ value, onChange, disabled, selectClassName = DEFAULT_SELECT_CLASS, suggestFrom }: PathaoLocationSelectsProps) {
  const { cityId, zoneId, areaId } = value;

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['pathao-cities'],
    queryFn: courierApi.getPathaoCities,
    staleTime: LOCATION_STALE_MS,
  });
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ['pathao-zones', cityId],
    queryFn: () => courierApi.getPathaoZones(cityId!),
    enabled: cityId != null,
    staleTime: LOCATION_STALE_MS,
  });
  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ['pathao-areas', zoneId],
    queryFn: () => courierApi.getPathaoAreas(zoneId!),
    enabled: zoneId != null,
    staleTime: LOCATION_STALE_MS,
  });

  // ── Address suggestion ──
  // `autoApplied` is the location this component last filled in by
  // itself. While the value still equals it, the vendor hasn't touched
  // the pickers, so a newer suggestion may replace it. Any other change
  // (a pick, or the parent's "Clear") turns suggestions off for good.
  const autoApplied = useRef<PathaoLocationValue | null>(null);
  const [manual, setManual] = useState(false);
  const isEmpty = sameLocation(value, EMPTY);
  const followingSuggestion = autoApplied.current != null && sameLocation(value, autoApplied.current);

  useEffect(() => {
    if (autoApplied.current && !sameLocation(value, autoApplied.current)) setManual(true);
  }, [value]);

  // Debounced as a string: an object literal is a new value every render
  // and would never settle.
  const sourceKey = useDebounced(
    JSON.stringify({
      address: suggestFrom?.address?.trim() || undefined,
      city: suggestFrom?.city?.trim() || undefined,
      district: suggestFrom?.district?.trim() || undefined,
    }),
    500,
  );
  const source = JSON.parse(sourceKey) as { address?: string; city?: string; district?: string };
  const { data: suggestion } = useQuery({
    queryKey: ['pathao-location-suggest', sourceKey],
    queryFn: () => courierApi.suggestPathaoLocation(source),
    enabled: suggestFrom != null && !manual && !disabled && (isEmpty || followingSuggestion) && Boolean(source.address || source.city || source.district),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (manual || !suggestion || suggestion.confidence < PATHAO_SUGGESTION_AUTO_APPLY) return;
    if (!isEmpty && !followingSuggestion) return;
    const next = toValue(suggestion);
    if (sameLocation(next, value)) return;
    autoApplied.current = next;
    onChange(next);
  }, [suggestion, manual, isEmpty, followingSuggestion, value, onChange]);

  function pick(next: PathaoLocationValue) {
    setManual(true);
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SearchableSelect
          value={cityId}
          options={cities?.map((c) => ({ id: c.id, label: c.name }))}
          onChange={(id) => pick({ cityId: id, zoneId: null, areaId: null })}
          placeholder="City"
          loading={citiesLoading}
          disabled={disabled}
          className={selectClassName}
          ariaLabel="City"
        />
        <SearchableSelect
          value={zoneId}
          options={zones?.map((z) => ({ id: z.id, label: z.name }))}
          onChange={(id) => pick({ cityId, zoneId: id, areaId: null })}
          placeholder="Zone"
          loading={cityId != null && zonesLoading}
          disabled={disabled || cityId == null}
          className={selectClassName}
          ariaLabel="Zone"
        />
        <SearchableSelect
          value={areaId}
          options={areas?.map((a) => ({ id: a.id, label: a.name, suffix: a.homeDeliveryAvailable === false ? '(pickup only)' : undefined }))}
          onChange={(id) => pick({ cityId, zoneId, areaId: id })}
          placeholder="Area"
          loading={zoneId != null && areasLoading}
          disabled={disabled || zoneId == null}
          className={selectClassName}
          ariaLabel="Area"
        />
      </div>

      {suggestFrom && followingSuggestion && !manual && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-regantify-text-muted">
          <Sparkles size={12} /> Suggested from the address — please check it.
        </p>
      )}
      {suggestFrom && isEmpty && !manual && suggestion && suggestion.confidence < PATHAO_SUGGESTION_AUTO_APPLY && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-regantify-text-muted">
          <Sparkles size={12} /> From the address: {describe(suggestion)}
          <button type="button" onClick={() => pick(toValue(suggestion))} className="underline text-regantify-text hover:text-regantify-cta">
            Use it
          </button>
        </p>
      )}
    </div>
  );
}
