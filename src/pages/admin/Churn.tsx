import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, TrendingDown } from 'lucide-react';
import { adminCatalogApi } from '../../lib/adminCatalogApi';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { churnApi, REASON_LABEL, type ChurnOverview, type ChurnReason } from '../../lib/churnApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '-');
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const OFFER_LABEL = { PROMO: 'Promo code', DAYS: 'Free days', MESSAGE: 'Message only' } as const;

/**
 * Super Admin > Money > Churn (super-admin-new.md Step 5): why stores lose or cut their paid plan, what each reason is offered, and how many come
 * back. The owner is asked once, at the next visit; each reason has one offer, never a discount for everyone.
 */
export default function Churn() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-churn'], queryFn: churnApi.overview });
  const canEdit = adminCan(useAdminViewer(), 'plans.edit');
  const [editing, setEditing] = useState<ChurnOverview['offers'][number] | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const l = data.last90;
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <TrendingDown className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Churn</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            A store that lost its paid plan or moved to a cheaper one is asked once, at its next visit, why. Each reason gets one offer. Stores that lost their plan get a
            win-back note on day 7 and day 30. "Won back" means the store paid for a plan again.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <Tile label="Lost or cut a plan" value={l.total} hint="last 90 days" />
        <Tile label="Lost (back to Free)" value={l.lapsed} hint={`${l.downgraded} moved to a cheaper plan`} />
        <Tile label="Told us why" value={pct(l.answered, l.total)} hint={`${l.answered} answered, ${l.skipped} skipped`} />
        <Tile label="Won back" value={pct(l.wonBack, l.total)} hint={`${l.wonBack} paid again`} />
        <Tile label="Offers taken" value={pct(data.reasons.reduce((n, r) => n + r.taken, 0), data.reasons.reduce((n, r) => n + r.offered, 0))} hint="of promo / free-day offers shown" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Reasons and offers (last 90 days)</h2>
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Reason</th>
                <th className="px-4 py-2 text-right font-normal">Stores</th>
                <th className="px-4 py-2 font-normal">Offer</th>
                <th className="px-4 py-2 text-right font-normal">Took it</th>
                <th className="px-4 py-2 text-right font-normal">Won back</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.reasons.map((r) => {
                const o = data.offers.find((x) => x.reason === r.reason)!;
                return (
                  <tr key={r.reason} className="border-b border-black/5 align-top last:border-0">
                    <td className="px-4 py-2.5 text-regantify-text">{REASON_LABEL[r.reason]}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.count}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-regantify-text">{o.type === 'PROMO' ? `Code ${o.promoCode}` : o.type === 'DAYS' ? `${o.days} free days` : 'Message only'}</span>
                      {!o.custom && <span className="ml-1.5 text-xs text-regantify-text-muted">(default)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.offered ? `${r.taken} of ${r.offered}` : '-'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pct(r.wonBack, r.count)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && (
                        <button type="button" onClick={() => setEditing(o)} className="text-xs font-medium text-regantify-text hover:underline">
                          Change offer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">By month</h2>
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Month</th>
                <th className="px-4 py-2 text-right font-normal">Lost a plan</th>
                <th className="px-4 py-2 text-right font-normal">Moved to cheaper</th>
                <th className="px-4 py-2 text-right font-normal">Won back</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 text-regantify-text">{monthLabel(m.month)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{m.lapsed}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{m.downgraded}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{m.wonBack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Latest</h2>
        {data.recent.length === 0 ? (
          <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">No store has lost or cut a plan since this started counting.</p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
            {data.recent.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link to={`/admin/vendors/${e.vendorId}`} className="font-medium text-regantify-text hover:underline">
                    {e.storeName}
                  </Link>
                  <span className="text-xs text-regantify-text-muted">
                    {' '}
                    - {e.kind === 'LAPSED' ? `lost ${e.fromPlanCode}` : `${e.fromPlanCode} to ${e.toPlanCode}`}, {formatDhakaDateTime(e.createdAt)}
                  </span>
                  <p className="text-xs text-regantify-text">
                    {e.reason === 'SKIPPED' ? 'Skipped the question' : e.reason ? REASON_LABEL[e.reason] : 'Not asked yet (asked at the next visit)'}
                    {e.note ? `: "${e.note}"` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-regantify-text-muted">
                  {e.offerType && e.offerType !== 'MESSAGE' && <p>{e.offerTakenAt ? `Took ${e.offerType === 'PROMO' ? `code ${e.offerValue}` : `${e.offerValue} free days`}` : `Offered ${e.offerType === 'PROMO' ? 'a code' : 'free days'}`}</p>}
                  {e.reactivatedAt ? <p className="font-medium text-green-700">Won back {formatDhakaDateTime(e.reactivatedAt)}</p> : e.winback30At ? <p>Day 30 note sent</p> : e.winback7At ? <p>Day 7 note sent</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OfferDialog offer={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-regantify-text">{value}</p>
      <p className="text-xs text-regantify-text-muted">{hint}</p>
    </div>
  );
}

function OfferDialog({ offer, onClose }: { offer: ChurnOverview['offers'][number] | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: promos } = useQuery({ queryKey: ['admin-promos'], queryFn: adminCatalogApi.promos, enabled: offer !== null });
  const [type, setType] = useState<'PROMO' | 'DAYS' | 'MESSAGE'>('MESSAGE');
  const [promoCode, setPromoCode] = useState('');
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!offer) return;
    setType(offer.type);
    setPromoCode(offer.promoCode ?? '');
    setDays(offer.days ?? 7);
    setMessage(offer.message);
  }, [offer]);
  const save = useMutation({
    mutationFn: () => churnApi.setOffer(offer!.reason as ChurnReason, { type, message: message.trim(), ...(type === 'PROMO' && { promoCode }), ...(type === 'DAYS' && { days }) }),
    onSuccess: () => {
      toast.success('Saved. Owners who answer this from now on see the new offer.');
      qc.invalidateQueries({ queryKey: ['admin-churn'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });
  const activePromos = (promos ?? []).filter((p) => p.active && (!p.expiresAt || new Date(p.expiresAt) > new Date()));
  const valid = message.trim().length >= 5 && (type !== 'PROMO' || promoCode) && (type !== 'DAYS' || (days >= 1 && days <= 60));

  return (
    <Dialog open={offer !== null} onOpenChange={(o) => !o && onClose()} title={offer ? `Offer for "${REASON_LABEL[offer.reason as ChurnReason]}"` : 'Offer'} maxWidth="max-w-md">
      {offer && (
        <div className="space-y-4 p-6 pt-3">
          <div className="flex gap-1 rounded-xl bg-regantify-search p-1">
            {(['MESSAGE', 'PROMO', 'DAYS'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${type === t ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
                {OFFER_LABEL[t]}
              </button>
            ))}
          </div>
          {type === 'PROMO' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Promo code</label>
              <select value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className={field}>
                <option value="">Pick one</option>
                {activePromos.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.code} ({p.percentOff ? `${p.percentOff}% off` : `Tk ${p.amountOff} off`})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-regantify-text-muted">
                Make codes in{' '}
                <Link to="/admin/packs" className="underline">
                  Packs and promos
                </Link>
                . The owner is sent to Billing with the code filled in.
              </p>
            </div>
          )}
          {type === 'DAYS' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Free days of their old plan</label>
              <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} className={field} />
              <p className="mt-1 text-xs text-regantify-text-muted">A store that lost its plan gets it back for these days, then moves to Free again by itself. Free days are not counted as revenue.</p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">What the owner reads</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={400} className={field} />
          </div>
          <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
