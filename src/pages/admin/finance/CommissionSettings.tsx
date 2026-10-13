import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminFeesApi, type FeeDealType, type FeePayer, type PlanFees } from '../../../lib/adminFeesApi';
import { adminPlansApi, type UpdatePlanPayload } from '../../../lib/adminPlansApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';
import { DEAL_LABEL, dayText, EndDealDialog, NewDealDialog, rateText } from '../../../components/admin/FeeDeals';
import type { FeeDeal } from '../../../lib/adminFeesApi';

const cell = 'w-20 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm tabular-nums focus:outline-none';

type Edit = { codFlat: string; codPercent: string; codPayer: FeePayer; onFlat: string; onPercent: string; onPayer: FeePayer; advFlat: string; advPercent: string };
const toEdit = (p: PlanFees): Edit => ({ codFlat: String(p.cod.flat), codPercent: String(p.cod.percent), codPayer: p.cod.payer, onFlat: String(p.online.flat), onPercent: String(p.online.percent), onPayer: p.online.payer, advFlat: String(p.advance.flat), advPercent: String(p.advance.percent) });

/** What changed, as the plan update payload and the kinds of fee touched (so the "affects N stores" count knows which deals matter). */
function diff(p: PlanFees, e: Edit): { payload: UpdatePlanPayload; groups: FeeDealType[] } {
  const payload: UpdatePlanPayload = {};
  const groups: FeeDealType[] = [];
  if (Number(e.codFlat) !== p.cod.flat || Number(e.codPercent) !== p.cod.percent || e.codPayer !== p.cod.payer) {
    Object.assign(payload, { codGatewayFeeBdt: Number(e.codFlat), codGatewayFeePercent: Number(e.codPercent), codGatewayFeePayer: e.codPayer });
    groups.push('COD');
  }
  if (Number(e.onFlat) !== p.online.flat || Number(e.onPercent) !== p.online.percent || e.onPayer !== p.online.payer) {
    Object.assign(payload, { onlinePaymentGatewayFeeBdt: Number(e.onFlat), onlinePaymentGatewayFeePercent: Number(e.onPercent), onlinePaymentGatewayFeePayer: e.onPayer });
    groups.push('ONLINE_PAYMENT');
  }
  if (Number(e.advFlat) !== p.advance.flat || Number(e.advPercent) !== p.advance.percent) {
    Object.assign(payload, { codAdvanceFeeBdt: Number(e.advFlat), codAdvanceFeePercent: Number(e.advPercent) });
    groups.push('ADVANCE');
  }
  return { payload, groups };
}

function PayerSelect({ value, onChange }: { value: FeePayer; onChange: (v: FeePayer) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as FeePayer)} className="mt-1 w-full rounded-lg border border-black/10 bg-white px-1.5 py-1 text-xs focus:outline-none">
      <option value="CUSTOMER">Shopper pays</option>
      <option value="VENDOR">Store pays</option>
    </select>
  );
}

/**
 * Super Admin > Finance > Commission Settings (super-admin-plan.md Step 12): every plan's fees side by side, saved through the normal plan update (which copies them to the
 * stores on that plan), with a count of the stores a change reaches first. Below, per-store special fees that survive plan-wide changes.
 */
export default function CommissionSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-fees'], queryFn: adminFeesApi.overview });
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [confirm, setConfirm] = useState<{ plan: PlanFees; payload: UpdatePlanPayload; impact: { stores: number; keepTheirRate: number; changed: number } } | null>(null);
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<FeeDeal | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-fees'] });
    qc.invalidateQueries({ queryKey: ['admin-fee-deals'] });
  };

  const check = useMutation({
    mutationFn: async (plan: PlanFees) => {
      const { payload, groups } = diff(plan, edits[plan.id] ?? toEdit(plan));
      return { plan, payload, impact: await adminFeesApi.impact(plan.id, groups) };
    },
    onSuccess: setConfirm,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not count the stores.')),
  });
  const save = useMutation({
    mutationFn: () => adminPlansApi.updatePlan(confirm!.plan.id, confirm!.payload),
    onSuccess: () => {
      toast.success('Fees saved and copied to the stores on that plan.');
      setEdits((s) => {
        const n = { ...s };
        delete n[confirm!.plan.id];
        return n;
      });
      setConfirm(null);
      refresh();
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the fees.')),
  });

  if (isLoading || !data) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  const th = 'px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted';
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Commission Settings</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">What the platform takes per order, plan by plan. Each fee is a flat amount plus a percent. Change a number, press Save on that plan, and you see how many stores it reaches before it is applied.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content">
              <th className={th}>Plan</th>
              <th className={th}>Cash on delivery</th>
              <th className={th}>Online payment</th>
              <th className={th}>Advance and payment link</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {data.plans.map((p) => {
              const e = edits[p.id] ?? toEdit(p);
              const set = (patch: Partial<Edit>) => setEdits((s) => ({ ...s, [p.id]: { ...e, ...patch } }));
              const dirty = Object.keys(diff(p, e).payload).length > 0;
              const bad = [e.codFlat, e.codPercent, e.onFlat, e.onPercent, e.advFlat, e.advPercent].some((v) => v === '' || Number(v) < 0) || Number(e.codPercent) > 30 || Number(e.onPercent) > 30 || Number(e.advPercent) > 30;
              return (
                <tr key={p.id} className="border-t border-black/5 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-regantify-text">{p.name}</p>
                    <p className="text-xs text-regantify-text-muted">{p.stores} {p.stores === 1 ? 'store' : 'stores'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      ৳<input className={cell} value={e.codFlat} onChange={(ev) => set({ codFlat: ev.target.value })} inputMode="decimal" aria-label={`${p.name} cash on delivery flat`} /> +
                      <input className={cell} value={e.codPercent} onChange={(ev) => set({ codPercent: ev.target.value })} inputMode="decimal" aria-label={`${p.name} cash on delivery percent`} />%
                    </div>
                    <PayerSelect value={e.codPayer} onChange={(v) => set({ codPayer: v })} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      ৳<input className={cell} value={e.onFlat} onChange={(ev) => set({ onFlat: ev.target.value })} inputMode="decimal" aria-label={`${p.name} online flat`} /> +
                      <input className={cell} value={e.onPercent} onChange={(ev) => set({ onPercent: ev.target.value })} inputMode="decimal" aria-label={`${p.name} online percent`} />%
                    </div>
                    <PayerSelect value={e.onPayer} onChange={(v) => set({ onPayer: v })} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      ৳<input className={cell} value={e.advFlat} onChange={(ev) => set({ advFlat: ev.target.value })} inputMode="decimal" aria-label={`${p.name} advance flat`} /> +
                      <input className={cell} value={e.advPercent} onChange={(ev) => set({ advPercent: ev.target.value })} inputMode="decimal" aria-label={`${p.name} advance percent`} />%
                    </div>
                    <p className="mt-1 text-[11px] text-regantify-text-muted">Added on top for the shopper</p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" disabled={!dirty || bad || check.isPending} onClick={() => check.mutate(p)} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
                      Save
                    </button>
                    {dirty && (
                      <button type="button" onClick={() => setEdits((s) => { const n = { ...s }; delete n[p.id]; return n; })} className="mt-1 block w-full text-xs text-regantify-text-muted underline">
                        Undo
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-xs text-regantify-text-muted">The online payment fee and the advance fee are hidden from stores (they never see them). The cash-on-delivery fee is the “Platform Charge” stores see.</p>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-regantify-text">Special fees for single stores ({data.deals.length})</h2>
            <p className="text-xs text-regantify-text-muted">A negotiated rate replaces the plan’s fee for that store and survives plan-wide changes above.</p>
          </div>
          <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white">Give a store a special fee</button>
        </div>
        {data.deals.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No store has a special fee.</p>
        ) : (
          data.deals.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 py-2.5 text-sm">
              <div>
                <Link to={`/admin/vendors/${d.vendorId}`} className="font-medium text-regantify-cta hover:underline">{d.storeName}</Link>
                <p className="text-xs text-regantify-text-muted">
                  {DEAL_LABEL[d.type]}: {rateText(d.flat, d.percent)}
                  {d.payer ? `, ${d.payer === 'VENDOR' ? 'store pays' : 'shopper pays'}` : ''} · until {dayText(d.until)} · {d.reason} · {d.by}
                </p>
              </div>
              <button type="button" onClick={() => setEnding(d)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">End</button>
            </div>
          ))
        )}
        {data.endedDeals.length > 0 && (
          <details className="mt-4 text-xs text-regantify-text-muted">
            <summary className="cursor-pointer">Ended deals ({data.endedDeals.length})</summary>
            {data.endedDeals.map((d) => (
              <p key={d.id} className="mt-1">
                {d.storeName}: {DEAL_LABEL[d.type]} {rateText(d.flat, d.percent)}, ended {dayText(d.endedAt)} ({d.endedReason})
              </p>
            ))}
          </details>
        )}
      </section>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Change the fees of {confirm?.plan.name}?</h2>
          <p className="text-sm text-regantify-text">
            This reaches <strong>{confirm?.impact.changed}</strong> {confirm?.impact.changed === 1 ? 'store' : 'stores'} on the {confirm?.plan.name} plan from now on.
            {confirm && confirm.impact.keepTheirRate > 0 && ` ${confirm.impact.keepTheirRate} more ${confirm.impact.keepTheirRate === 1 ? 'store has' : 'stores have'} a special fee for it and keep their own rate.`}
          </p>
          <p className="text-xs text-regantify-text-muted">Orders already placed keep the fee they were placed with.</p>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save the fees'}
          </button>
        </div>
      </Dialog>
      {adding && <NewDealDialog open onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
      <EndDealDialog deal={ending} onClose={() => setEnding(null)} onDone={() => { setEnding(null); refresh(); }} />
    </div>
  );
}
