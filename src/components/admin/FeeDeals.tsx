import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../lib/adminApi';
import { adminFeesApi, type FeeDeal, type FeeDealType, type FeePayer } from '../../lib/adminFeesApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { ReasonNeed } from './/ReasonNeed';

export const DEAL_LABEL: Record<FeeDealType, string> = { COD: 'Cash on delivery fee', ONLINE_PAYMENT: 'Online payment fee', ADVANCE: 'Advance and payment-link fee' };
export const rateText = (flat: number, percent: number) => `৳${flat} + ${percent}%`;
export const dayText = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'until ended');

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const label = 'mb-1.5 block text-sm font-medium text-regantify-text';

/** Give one store a negotiated fee (super-admin-plan.md Step 12). With `store` given the store is fixed; otherwise it is searched for. */
export function NewDealDialog({ store, open, onClose, onDone }: { store?: { id: string; name: string }; open: boolean; onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(store ?? null);
  const [type, setType] = useState<FeeDealType>('COD');
  const [flat, setFlat] = useState('0');
  const [percent, setPercent] = useState('0');
  const [payer, setPayer] = useState<'' | FeePayer>('');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const found = useQuery({ queryKey: ['fee-deal-store-search', search], queryFn: () => adminApi.listVendors({ search, perPage: 6 }), enabled: !store && !picked && search.trim().length >= 2 });
  const m = useMutation({
    mutationFn: () => adminFeesApi.createDeal({ vendorId: picked!.id, type, flat: Number(flat), percent: Number(percent), payer: type === 'ADVANCE' || !payer ? undefined : payer, untilDays: days ? Number(days) : undefined, reason: reason.trim() }),
    onSuccess: () => {
      toast.success('The special fee is on.');
      setReason('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the deal.')),
  });
  const ok = !!picked && reason.trim().length >= 5 && Number(flat) >= 0 && Number(percent) >= 0 && Number(percent) <= 30;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">A special fee for one store</h2>
        {picked ? (
          <p className="text-sm text-regantify-text">
            Store: <strong>{picked.name}</strong>
            {!store && (
              <button type="button" onClick={() => setPicked(null)} className="ml-2 text-xs underline">
                change
              </button>
            )}
          </p>
        ) : (
          <div>
            <label className={label}>Find the store</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Store name, link or phone" className={field} />
            {found.data?.vendors.map((v) => (
              <button key={v.id} type="button" onClick={() => setPicked({ id: v.id, name: v.storeName })} className="mt-1 block w-full rounded-lg bg-regantify-content px-3 py-2 text-left text-sm hover:bg-black/5">
                {v.storeName} <span className="text-xs text-regantify-text-muted">· {v.planName}</span>
              </button>
            ))}
          </div>
        )}
        <div>
          <label className={label}>Which fee</label>
          <select value={type} onChange={(e) => setType(e.target.value as FeeDealType)} className={field}>
            {(Object.keys(DEAL_LABEL) as FeeDealType[]).map((t) => (
              <option key={t} value={t}>
                {DEAL_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Flat (৳)</label>
            <input type="number" min={0} max={1000} step="0.01" value={flat} onChange={(e) => setFlat(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Percent (0 to 30)</label>
            <input type="number" min={0} max={30} step="0.01" value={percent} onChange={(e) => setPercent(e.target.value)} className={field} />
          </div>
        </div>
        {type !== 'ADVANCE' && (
          <div>
            <label className={label}>Who pays it</label>
            <select value={payer} onChange={(e) => setPayer(e.target.value as '' | FeePayer)} className={field}>
              <option value="">Keep what the plan says</option>
              <option value="CUSTOMER">The shopper</option>
              <option value="VENDOR">The store (out of its payout)</option>
            </select>
          </div>
        )}
        <div>
          <label className={label}>For how many days (empty = until you end it)</label>
          <input type="number" min={1} max={1095} value={days} onChange={(e) => setDays(e.target.value)} className={field} />
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason, e.g. agreed on a call (saved in the admin log)" className={field} />
        <ReasonNeed value={reason} />
        <p className="text-xs text-regantify-text-muted">The store keeps this rate even when the plan’s fee changes. A cash-on-delivery rate is shown to the store as “special rate”; the other two stay hidden from stores.</p>
        <button type="button" disabled={!ok || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Saving…' : 'Start the special fee'}
        </button>
      </div>
    </Dialog>
  );
}

/** Ask for a reason, then end a deal (the store goes back to its plan's fee). */
export function EndDealDialog({ deal, onClose, onDone }: { deal: FeeDeal | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => adminFeesApi.endDeal(deal!.id, reason.trim()),
    onSuccess: () => {
      toast.success('The deal ended. The store is back on its plan’s fee.');
      setReason('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not end it.')),
  });
  return (
    <Dialog open={!!deal} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">End the special fee of {deal?.storeName}</h2>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className={field} />
        <ReasonNeed value={reason} />
        <button type="button" disabled={reason.trim().length < 5 || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          End it
        </button>
      </div>
    </Dialog>
  );
}

/** One store's deals, with a button to start one (the store page's Actions tab). */
export function StoreFeeDeals({ vendorId, storeName }: { vendorId: string; storeName: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-fee-deals', vendorId], queryFn: () => adminFeesApi.forStore(vendorId) });
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<FeeDeal | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-fee-deals', vendorId] });
    qc.invalidateQueries({ queryKey: ['admin-fees'] });
  };
  const active = (data ?? []).filter((d) => d.active);
  return (
    <div>
      {active.length === 0 ? (
        <p className="text-sm text-regantify-text-muted">No special fee. This store pays its plan’s fees.</p>
      ) : (
        active.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 border-b border-black/5 py-2 text-sm">
            <div>
              <p className="font-medium text-regantify-text">{DEAL_LABEL[d.type]}: {rateText(d.flat, d.percent)}</p>
              <p className="text-xs text-regantify-text-muted">until {dayText(d.until)} · {d.reason}</p>
            </div>
            <button type="button" onClick={() => setEnding(d)} className="rounded-lg border border-black/10 px-3 py-1 text-xs">End</button>
          </div>
        ))
      )}
      <button type="button" onClick={() => setAdding(true)} className="mt-3 rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">
        Give a special fee
      </button>
      {adding && <NewDealDialog store={{ id: vendorId, name: storeName }} open onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
      <EndDealDialog deal={ending} onClose={() => setEnding(null)} onDone={() => { setEnding(null); refresh(); }} />
    </div>
  );
}
