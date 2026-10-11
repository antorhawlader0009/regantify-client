import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { getBusinessHours, updateBusinessHours, type BusinessHours } from '../../lib/vendorApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const blank = (): BusinessHours =>
  Object.fromEntries(DAYS.map((_, i) => [String(i), { open: false, from: '10:00', to: '20:00' }]));

/**
 * Store > Business hours (TellMe idea 73): the shop and support hours for each weekday, Dhaka time. StorePal shows them as a small table in
 * the footer, and the chat button tells shoppers who tap it outside these hours "we are closed now, we will reply tomorrow at 10:00 AM"
 * (the chat still opens). It is information only: orders are never stopped by it, and Store Away wins while it is on. With every day
 * closed, nothing is shown.
 */
export function BusinessHoursSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['business-hours'], queryFn: getBusinessHours, retry: false });
  const [hours, setHours] = useState<BusinessHours>(blank());

  useEffect(() => {
    if (data) setHours({ ...blank(), ...(data.businessHours ?? {}) });
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      for (const [k, d] of Object.entries(hours)) {
        if (d.open && d.from >= d.to) throw new Error(`${DAYS[Number(k)]}: "from" must be earlier than "to".`);
      }
      return updateBusinessHours(Object.values(hours).some((d) => d.open) ? hours : null);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['business-hours'], updated);
      toast.success('Business hours saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the hours.')),
  });

  const set = (k: string, patch: Partial<BusinessHours[string]>) => setHours((h) => ({ ...h, [k]: { ...h[k], ...patch } }));

  return (
    <section className="max-w-3xl bg-white rounded-2xl border border-black/5 p-5 mt-8">
      <h2 className="text-base font-medium text-regantify-text">Business hours</h2>
      <p className="text-sm text-regantify-text-muted mt-1">
        When you are open and answering messages, in Dhaka time. Shown in the footer of your StorePal store, and the chat button says so outside these hours.
        It never stops an order.
      </p>
      {isLoading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {DAYS.map((name, i) => {
            const d = hours[String(i)];
            return (
              <div key={name} className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex w-36 cursor-pointer items-center gap-2 text-regantify-text">
                  <input type="checkbox" checked={d.open} onChange={(e) => set(String(i), { open: e.target.checked })} className="h-4 w-4 accent-regantify-cta" />
                  {name}
                </label>
                {d.open ? (
                  <>
                    <input type="time" value={d.from} onChange={(e) => set(String(i), { from: e.target.value })} className="rounded-lg border border-black/10 px-2 py-1.5" aria-label={`${name} opens`} />
                    <span className="text-regantify-text-muted">to</span>
                    <input type="time" value={d.to} onChange={(e) => set(String(i), { to: e.target.value })} className="rounded-lg border border-black/10 px-2 py-1.5" aria-label={`${name} closes`} />
                  </>
                ) : (
                  <span className="text-regantify-text-muted">Closed</span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-3 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save hours
          </button>
        </div>
      )}
    </section>
  );
}
