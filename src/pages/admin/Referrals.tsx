import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Loader2, Search } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { referralsApi, type AdminReferrals } from '../../lib/referralsApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { ReasonNeed } from '../../components/admin/ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const tk = (n: number) => `Tk ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const STATUS_LABEL = { SIGNED_UP: 'Signed up', PAID: 'Bought a plan', REJECTED: 'Not counted' } as const;

/**
 * Super Admin > Money > Referrals (super-admin-new.md Step 6): turn Refer and earn on, set what a plain store earns, make partners (agencies,
 * trainers) who earn a share of their stores' plan payments, and reverse an earning within 30 days.
 */
export default function Referrals() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-referrals'], queryFn: referralsApi.overview });
  const viewer = useAdminViewer();
  const canEdit = adminCan(viewer, 'plans.edit');
  const canReverse = adminCan(viewer, 'money.adjust');
  const [partner, setPartner] = useState<{ vendorId: string; storeName: string; percent: number; months: number; note: string; active: boolean } | null>(null);
  const [reversing, setReversing] = useState<AdminReferrals['earnings'][number] | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <Gift className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Referrals</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            Every store has a link (Finance &gt; Refer and earn). A plain store earns the reward below once, when a store it brought buys its first plan. A partner earns a share of
            every plan payment instead. Free plans and trials earn nothing; two owners who signed in on the same device are not counted.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Signed up with a link', value: data.totals.signedUp },
          { label: 'Bought a plan', value: data.totals.paid },
          { label: 'Not counted', value: data.totals.rejected },
          { label: 'Paid out to referrers', value: tk(data.totals.paidOut) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-black/5 bg-white p-4">
            <p className="text-xs text-regantify-text-muted">{t.label}</p>
            <p className="text-lg font-semibold tabular-nums text-regantify-text">{t.value}</p>
          </div>
        ))}
      </div>

      <SettingsCard settings={data.settings} canEdit={canEdit} />

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-regantify-text">Partners</h2>
          {canEdit && <AddPartner onPick={(v) => setPartner({ vendorId: v.id, storeName: v.storeName, percent: 20, months: 12, note: '', active: true })} />}
        </div>
        {data.partners.length === 0 ? (
          <p className="rounded-xl border border-black/5 bg-white px-4 py-6 text-center text-sm text-regantify-text-muted">No partners yet. An agency or trainer needs a store of its own; the money goes to that store's wallet.</p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
            {data.partners.map((p) => (
              <li key={p.vendorId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <Link to={`/admin/vendors/${p.vendorId}`} className="font-medium text-regantify-text hover:underline">
                    {p.storeName}
                  </Link>
                  <span className="ml-2 text-xs text-regantify-text-muted">
                    {p.percent}% for {p.months} months{p.note ? ` - ${p.note}` : ''}
                    {!p.active ? ' - paused' : ''}
                  </span>
                </span>
                {canEdit && (
                  <button type="button" onClick={() => setPartner({ vendorId: p.vendorId, storeName: p.storeName, percent: p.percent, months: p.months, note: p.note ?? '', active: p.active })} className="text-xs font-medium text-regantify-text hover:underline">
                    Change
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.top.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-regantify-text">Top referrers</h2>
          <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
            {data.top.map((t) => (
              <li key={t.vendorId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <Link to={`/admin/vendors/${t.vendorId}`} className="truncate text-regantify-text hover:underline">
                  {t.storeName}
                </Link>
                <span className="shrink-0 text-xs tabular-nums text-regantify-text-muted">
                  {t.signedUp} signed up, {t.paid} paid, {tk(t.earned)} earned
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Earnings</h2>
        {data.earnings.length === 0 ? (
          <p className="rounded-xl border border-black/5 bg-white px-4 py-6 text-center text-sm text-regantify-text-muted">Nothing earned yet.</p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
            {data.earnings.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <Link to={`/admin/vendors/${e.referrerId}`} className="font-medium text-regantify-text hover:underline">
                    {e.referrerName}
                  </Link>
                  <span className="text-xs text-regantify-text-muted">
                    {' '}
                    - {e.kind === 'COMMISSION' ? 'commission' : 'reward'} for {e.referredName}, {formatDhakaDateTime(e.createdAt)}
                  </span>
                  {e.reversedAt && (
                    <span className="block text-xs text-red-700">
                      Reversed by {e.reversedBy}: {e.reverseReason}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`tabular-nums ${e.reversedAt ? 'text-regantify-text-muted line-through' : 'text-regantify-text'}`}>
                    {[e.amount > 0 ? tk(e.amount) : '', e.days > 0 ? `${e.days} days` : ''].filter(Boolean).join(' + ') || 'nothing'}
                  </span>
                  {canReverse && e.canReverse && (
                    <button type="button" onClick={() => setReversing(e)} className="text-xs font-medium text-red-700 hover:underline">
                      Reverse
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Referred stores</h2>
        {data.referrals.length === 0 ? (
          <p className="rounded-xl border border-black/5 bg-white px-4 py-6 text-center text-sm text-regantify-text-muted">No store has signed up with a link yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                  <th className="px-4 py-2 font-normal">New store</th>
                  <th className="px-4 py-2 font-normal">Brought by</th>
                  <th className="px-4 py-2 font-normal">Terms</th>
                  <th className="px-4 py-2 font-normal">State</th>
                  <th className="px-4 py-2 font-normal">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-black/5 align-top last:border-0">
                    <td className="px-4 py-2">
                      <Link to={`/admin/vendors/${r.referredId}`} className="text-regantify-text hover:underline">
                        {r.referredName}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/admin/vendors/${r.referrerId}`} className="text-regantify-text hover:underline">
                        {r.referrerName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs text-regantify-text-muted">{r.percent ? `${r.percent}% for ${r.months} months` : 'Plain reward'}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={r.status === 'REJECTED' ? 'text-red-700' : r.status === 'PAID' ? 'text-green-700' : 'text-regantify-text-muted'}>{STATUS_LABEL[r.status]}</span>
                      {r.rejectReason && <span className="block text-regantify-text-muted">{r.rejectReason}</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-regantify-text-muted">{formatDhakaDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PartnerDialog partner={partner} onClose={() => setPartner(null)} />
      <ReverseDialog earning={reversing} onClose={() => setReversing(null)} />
    </div>
  );
}

function SettingsCard({ settings, canEdit }: { settings: AdminReferrals['settings']; canEdit: boolean }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [amount, setAmount] = useState(settings.rewardAmount);
  const [days, setDays] = useState(settings.rewardDays);
  useEffect(() => {
    setEnabled(settings.enabled);
    setAmount(settings.rewardAmount);
    setDays(settings.rewardDays);
  }, [settings]);
  const save = useMutation({
    mutationFn: () => referralsApi.saveSettings({ enabled, rewardAmount: amount, rewardDays: days }),
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-referrals'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const dirty = enabled !== settings.enabled || amount !== settings.rewardAmount || days !== settings.rewardDays;
  return (
    <section className="rounded-xl border border-black/5 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-regantify-text">
          <input type="checkbox" checked={enabled} disabled={!canEdit} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Refer and earn is on
        </label>
        <div>
          <label className="mb-1.5 block text-xs text-regantify-text-muted">Plain store reward: wallet money (Tk)</label>
          <input type="number" min={0} max={100000} value={amount} disabled={!canEdit} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-regantify-text-muted">... and days on its own paid plan</label>
          <input type="number" min={0} max={90} value={days} disabled={!canEdit} onChange={(e) => setDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))} className={field} />
        </div>
        {canEdit && (
          <button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-regantify-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            Save
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-regantify-text-muted">
        Days only reach a referrer that is on a paid plan at that moment. While this is off, links still open the sign-up page but nothing is recorded.
        {settings.updatedBy ? ` Last changed by ${settings.updatedBy}.` : ''}
      </p>
    </section>
  );
}

function AddPartner({ onPick }: { onPick: (v: { id: string; storeName: string }) => void }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data } = useQuery({ queryKey: ['ref-partner-search', term], queryFn: () => adminApi.listVendors({ search: term, perPage: 6 }), enabled: term.length >= 2 });
  return (
    <div className="relative w-72">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Make a store a partner" className={`${field} pl-9`} />
      {term.length >= 2 && data && (
        <div className="absolute right-0 z-10 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
          {data.vendors.length === 0 ? (
            <p className="px-3 py-2 text-xs text-regantify-text-muted">No store found.</p>
          ) : (
            data.vendors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onPick(v);
                  setSearch('');
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {v.storeName} <span className="text-xs text-regantify-text-muted">{v.subdomain}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PartnerDialog({ partner, onClose }: { partner: { vendorId: string; storeName: string; percent: number; months: number; note: string; active: boolean } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [percent, setPercent] = useState(20);
  const [months, setMonths] = useState(12);
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!partner) return;
    setPercent(partner.percent);
    setMonths(partner.months);
    setNote(partner.note);
    setActive(partner.active);
  }, [partner]);
  const save = useMutation({
    mutationFn: () => referralsApi.savePartner(partner!.vendorId, { percent, months, note: note.trim() || undefined, active }),
    onSuccess: () => {
      toast.success("Saved. Stores that sign up with this partner's link from now on get these terms.");
      qc.invalidateQueries({ queryKey: ['admin-referrals'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  return (
    <Dialog open={partner !== null} onOpenChange={(o) => !o && onClose()} title={partner ? `Partner: ${partner.storeName}` : 'Partner'} maxWidth="max-w-md">
      {partner && (
        <div className="space-y-4 p-6 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Share of each plan payment</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={50} value={percent} onChange={(e) => setPercent(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className={field} />
                <span className="text-sm text-regantify-text-muted">%</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">For how long</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} className={field} />
                <span className="text-sm text-regantify-text-muted">months</span>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Note (for the team)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Dhaka f-commerce trainer" className={field} />
          </div>
          <label className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
            Active (new sign-ups get these terms)
          </label>
          <p className="text-xs text-regantify-text-muted">Stores that already signed up keep the terms they signed up with. The months count from each store's first payment.</p>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </Dialog>
  );
}

function ReverseDialog({ earning, onClose }: { earning: AdminReferrals['earnings'][number] | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [earning]);
  const m = useMutation({
    mutationFn: () => referralsApi.reverse(earning!.id, reason.trim()),
    onSuccess: () => {
      toast.success('Reversed. The money was taken back and the referral will earn nothing more.');
      qc.invalidateQueries({ queryKey: ['admin-referrals'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not reverse it.')),
  });
  return (
    <Dialog open={earning !== null} onOpenChange={(o) => !o && onClose()} title="Reverse this earning" maxWidth="max-w-md">
      {earning && (
        <div className="space-y-4 p-6 pt-3">
          <p className="text-sm text-regantify-text-muted">
            {tk(earning.amount)} is taken back from {earning.referrerName}'s wallet, and the referral of {earning.referredName} earns nothing more. The wallet must still hold the money.
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} placeholder="Why (kept in the admin log and the store's transactions)" className={field} />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Reversing...' : 'Reverse'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
