import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, PageSection, primaryBtn } from '../../../components/ui/PageKit';
import { courierApi, type CourierAccountProvider } from '../../../lib/courierApi';
import { api, apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

type Rule = CourierAccountProvider | '';
interface Rules {
  insideDhaka: CourierAccountProvider | null;
  aroundDhaka: CourierAccountProvider | null;
  outsideDhaka: CourierAccountProvider | null;
}

const NAMES: Record<CourierAccountProvider, string> = { PATHAO: 'Pathao', STEADFAST: 'SteadFast', REDX: 'RedX' };
const ZONES: { key: keyof Rules; label: string; hint: string }[] = [
  { key: 'insideDhaka', label: 'Inside Dhaka', hint: 'Orders delivered inside Dhaka city.' },
  { key: 'aroundDhaka', label: 'Around Dhaka', hint: 'Savar, Gazipur, Narayanganj and so on. Only used if you offer this zone (Store > Delivery Charge).' },
  { key: 'outsideDhaka', label: 'Outside Dhaka', hint: 'The rest of the country.' },
];

const rulesApi = {
  get: () => api.get<Rules>('/v1/courier/rules').then((r) => r.data),
  save: (rules: Rules) => api.put<Rules>('/v1/courier/rules', rules).then((r) => r.data),
};

/**
 * Courier Integration > Courier rules (TellMe idea 39): the courier to use for each delivery zone. When an order moves
 * into Processing with no courier chosen, the zone's courier is chosen for it, and only that courier's auto-booking
 * picks it up. A zone left on "Choose by hand" works as before.
 */
export default function CourierRules() {
  const queryClient = useQueryClient();
  const { data: saved } = useQuery({ queryKey: ['courier-rules'], queryFn: rulesApi.get });
  const { data: accounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const [form, setForm] = useState<Record<keyof Rules, Rule>>({ insideDhaka: '', aroundDhaka: '', outsideDhaka: '' });

  useEffect(() => {
    if (saved) setForm({ insideDhaka: saved.insideDhaka ?? '', aroundDhaka: saved.aroundDhaka ?? '', outsideDhaka: saved.outsideDhaka ?? '' });
  }, [saved]);

  const connected = new Set((accounts ?? []).filter((a) => a.isActive).map((a) => a.provider));
  const save = useMutation({
    mutationFn: () => rulesApi.save({ insideDhaka: form.insideDhaka || null, aroundDhaka: form.aroundDhaka || null, outsideDhaka: form.outsideDhaka || null }),
    onSuccess: () => {
      toast.success('Courier rules saved.');
      void queryClient.invalidateQueries({ queryKey: ['courier-rules'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the rules.')),
  });
  const dirty = !!saved && (['insideDhaka', 'aroundDhaka', 'outsideDhaka'] as const).some((k) => (saved[k] ?? '') !== form[k]);

  return (
    <PageSection>
      <PageHeader title="Courier rules" description="Pick the courier for each delivery zone, so you don’t choose by hand every time." />

      <div className="max-w-2xl space-y-3">
        {ZONES.map((z) => (
          <div key={z.key} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-regantify-text">{z.label}</p>
                <p className="text-xs text-neutral-500">{z.hint}</p>
              </div>
              <select
                value={form[z.key]}
                onChange={(e) => setForm((f) => ({ ...f, [z.key]: e.target.value as Rule }))}
                aria-label={`Courier for ${z.label}`}
                className="h-9 rounded-lg border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Choose by hand</option>
                {(['PATHAO', 'STEADFAST', 'REDX'] as const).map((p) => (
                  <option key={p} value={p} disabled={!connected.has(p) && form[z.key] !== p}>
                    {NAMES[p]}
                    {connected.has(p) ? '' : ' (not connected)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <p className="text-xs text-neutral-500">
          How it works: when an order moves to Processing and has no courier yet, the courier for its zone is chosen. You can still change it from the order’s
          Actions menu. If a courier’s auto-booking is on, only the courier named for the order’s zone books it. A rule that names a courier that isn’t connected is
          skipped and you get a notice. Connect couriers on their own pages: <Link to="/vendor/courier/pathao" className="text-brand hover:underline">Pathao</Link>,{' '}
          <Link to="/vendor/courier/steadfast" className="text-brand hover:underline">SteadFast</Link>, <Link to="/vendor/courier/redx" className="text-brand hover:underline">RedX</Link>.
        </p>

        <button type="button" onClick={() => save.mutate()} disabled={!dirty || save.isPending} className={primaryBtn}>
          {save.isPending ? 'Saving…' : 'Save rules'}
        </button>
      </div>
    </PageSection>
  );
}
