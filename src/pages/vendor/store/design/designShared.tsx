import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { DESIGN_SETTINGS_KEY, designSettingsApi, type StoreMenuItem } from '../../../../lib/designSettingsApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';

/**
 * Shared load/save for the Store > Design pages backed by
 * StoreDesignSettings. Every page saves through one PATCH with only its
 * own fields, so the cached row is simply replaced with the response.
 */
export function useDesignSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: DESIGN_SETTINGS_KEY, queryFn: designSettingsApi.get });
  const save = useMutation({
    mutationFn: designSettingsApi.update,
    onSuccess: (updated) => {
      queryClient.setQueryData(DESIGN_SETTINGS_KEY, updated);
      toast.success('Saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });
  return { settings: query.data, isLoading: query.isLoading, save };
}

export function DesignPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-regantify-text">{title}</h1>
        {actions}
      </div>
      <p className="text-sm text-regantify-text-muted mt-1">{description}</p>
    </div>
  );
}

export function DesignLoading() {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
    </div>
  );
}

export function DesignSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-regantify-text">{title}</h2>
      {hint && <p className="text-xs text-regantify-text-muted mt-0.5">{hint}</p>}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mt-2 space-y-5">{children}</div>
    </section>
  );
}

export function SaveButton({ onClick, pending, label = 'Save' }: { onClick: () => void; pending: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
        text-white text-sm font-medium transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-regantify-text mb-2">{label}</p>
      <div className="flex items-center gap-5 flex-wrap">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
            <input
              type="radio"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="accent-regantify-cta"
            />
            {o.label}
          </label>
        ))}
        {hint && <span className="text-xs text-regantify-text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${checked ? 'bg-regantify-cta' : 'bg-black/15'}`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors';

/** Returns an error message for the first incomplete item, or null. Used by Layout Settings and Header Editor before saving. */
export function menuError(items: StoreMenuItem[]): string | null {
  const missingLabel = items.find((i) => !i.label.trim());
  if (missingLabel) return 'Every menu item needs a label.';
  const missingUrl = items.find((i) => i.type === 'CUSTOM' && !i.value.trim());
  if (missingUrl) return `Add a link for "${missingUrl.label}".`;
  return null;
}
