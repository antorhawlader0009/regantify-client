import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSwitchesApi, LIMIT_FIELDS, LIMIT_LABEL, type LimitField } from '../../lib/adminSwitchesApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { ReasonNeed } from './/ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'until ended');
const num = (n: number | null) => (n === null ? 'no limit' : n.toLocaleString('en-US'));

/** A store's own limits on top of its plan (super-admin-plan.md Step 14): a number set here replaces the plan's for that limit until it runs out or is ended. */
export function StoreLimits({ vendorId, storeName }: { vendorId: string; storeName: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-store-limits', vendorId], queryFn: () => adminSwitchesApi.limits(vendorId) });
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [values, setValues] = useState<Record<LimitField, string>>({ productLimitPerDay: '', orderLimitPerDay: '', staffLimit: '', imageUploadLimitPerDay: '', landingPageLimit: '' });
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-store-limits', vendorId] });
    qc.invalidateQueries({ queryKey: ['admin-store', vendorId] });
  };
  const picked = LIMIT_FIELDS.filter((f) => values[f].trim() !== '');
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, number | string> = { reason: reason.trim() };
      for (const f of picked) body[f] = Number(values[f]);
      if (days.trim() !== '') body.days = Number(days);
      return adminSwitchesApi.setLimits(vendorId, body as never);
    },
    onSuccess: () => {
      toast.success('The store’s limits were changed.');
      setEditing(false);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const end = useMutation({
    mutationFn: () => adminSwitchesApi.endLimits(vendorId, reason.trim()),
    onSuccess: () => {
      toast.success('The store is back on its plan’s limits.');
      setEnding(false);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  const active = data?.active ?? null;
  const validNumbers = picked.every((f) => /^\d+$/.test(values[f].trim())) && (days.trim() === '' || (/^\d+$/.test(days) && Number(days) >= 1 && Number(days) <= 365));

  return (
    <div>
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-regantify-text-muted">
                <th className="py-1.5 pr-3 font-medium">Limit</th>
                <th className="py-1.5 pr-3 font-medium">{data.plan.name} plan</th>
                <th className="py-1.5 font-medium">This store</th>
              </tr>
            </thead>
            <tbody>
              {LIMIT_FIELDS.map((f) => (
                <tr key={f} className="border-t border-black/5">
                  <td className="py-1.5 pr-3 text-regantify-text">{LIMIT_LABEL[f]}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-regantify-text-muted">{num(data.plan[f])}</td>
                  <td className={`py-1.5 tabular-nums ${active?.[f] != null ? 'font-medium text-regantify-text' : 'text-regantify-text-muted'}`}>{active?.[f] != null ? num(active[f]) : 'follows the plan'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {active ? (
        <p className="mt-2 text-xs text-regantify-text-muted">
          Own limits {active.until ? `until ${day(active.until)}` : 'until ended'} · {active.reason} · by {active.by}
        </p>
      ) : (
        <p className="mt-2 text-xs text-regantify-text-muted">This store is on its plan’s limits.</p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">
          {active ? 'Change limits' : 'Give this store its own limits'}
        </button>
        {active && (
          <button type="button" onClick={() => setEnding(true)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">
            End
          </button>
        )}
      </div>

      <Dialog open={editing} onOpenChange={setEditing} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Own limits for {storeName}</h2>
          <p className="text-sm text-regantify-text-muted">The number you type replaces the plan’s number for that limit. Leave a box empty to keep following the plan.</p>
          {LIMIT_FIELDS.map((f) => (
            <div key={f}>
              <label className="mb-1 block text-sm font-medium text-regantify-text">
                {LIMIT_LABEL[f]} <span className="font-normal text-regantify-text-muted">(plan: {data ? num(data.plan[f]) : '…'})</span>
              </label>
              <input value={values[f]} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" placeholder="Follow the plan" className={field} />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">For how many days? (empty = until you end it)</label>
            <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} className={field} placeholder="Saved in the admin log; the store is told its limits changed" />
            <ReasonNeed value={reason} />
          </div>
          <button type="button" disabled={picked.length === 0 || !validNumbers || reason.trim().length < 5 || save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save limits'}
          </button>
        </div>
      </Dialog>

      <Dialog open={ending} onOpenChange={setEnding} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">End the own limits of {storeName}</h2>
          <p className="text-sm text-regantify-text-muted">The store goes back to its plan’s limits at once. Nothing it already made is removed.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} className={field} placeholder="Reason" />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || end.isPending} onClick={() => end.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {end.isPending ? 'Working…' : 'End'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
