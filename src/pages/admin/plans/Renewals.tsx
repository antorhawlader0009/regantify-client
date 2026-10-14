import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminRenewalsApi, type EndedRow, type RenewalRow } from '../../../lib/adminRenewalsApi';
import { adminApi } from '../../../lib/adminApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatTaka } from '../../../components/analytics/format';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { Dialog } from '../../../components/ui/Dialog';
import { ReasonNeed } from '../../../components/admin/ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

type Pick = { kind: 'remind' | 'extend'; vendorId: string; storeName: string };

/** Reason (and days for an extension), then runs the one-click remind or the free extension. Both are logged. */
function ActionDialog({ pick, onClose, onDone }: { pick: Pick | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(7);
  const m = useMutation({
    mutationFn: async () => {
      if (!pick) return '';
      if (pick.kind === 'remind') {
        const r = await adminRenewalsApi.remind(pick.vendorId, reason.trim());
        return r.texted ? 'Reminder sent by bell and SMS.' : 'Reminder sent to the bell. The SMS could not be sent.';
      }
      await adminApi.extendPlan(pick.vendorId, days, reason.trim());
      return `Plan extended by ${days} days.`;
    },
    onSuccess: (msg) => {
      toast.success(msg);
      setReason('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });
  return (
    <Dialog open={!!pick} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">
          {pick?.kind === 'remind' ? 'Remind' : 'Extend the plan of'} {pick?.storeName}
        </h2>
        {pick?.kind === 'extend' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Days to add, free</label>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className={field} />
          </div>
        )}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className={field} />
        <ReasonNeed value={reason} />
        <button type="button" disabled={reason.trim().length < 5 || m.isPending || (pick?.kind === 'extend' && (days < 1 || days > 365))} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Working…' : pick?.kind === 'remind' ? 'Send the reminder' : 'Extend'}
        </button>
        {pick?.kind === 'remind' && <p className="text-xs text-regantify-text-muted">The store gets a bell notice and an SMS from the platform. A store can be reminded once every 6 hours.</p>}
      </div>
    </Dialog>
  );
}

function Table({ title, hint, rows, grace, empty, onPick }: { title: string; hint: string; rows: RenewalRow[]; grace?: boolean; empty: string; onPick: (p: Pick) => void }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-sm font-semibold text-regantify-text">
        {title} ({rows.length})
      </h2>
      <p className="mb-3 text-xs text-regantify-text-muted">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-regantify-text-muted">{empty}</p>
      ) : (
        rows.map((r) => (
          <div key={r.vendorId} className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 py-2.5 text-sm">
            <div>
              <Link to={`/admin/vendors/${r.vendorId}`} className="font-medium text-regantify-cta hover:underline">
                {r.storeName}
              </Link>
              <p className="text-xs text-regantify-text-muted">
                {r.plan} · {formatTaka(r.price)}/month · {r.phone ?? 'no phone'}
              </p>
              <p className="text-xs text-regantify-text-muted">
                {grace ? `Ended ${day(r.endsAt)}, moves to Free on ${day(r.graceEndsAt)}` : r.daysLeft === 0 ? 'Ends today' : `Ends ${day(r.endsAt)} (${r.daysLeft} ${r.daysLeft === 1 ? 'day' : 'days'})`}
                {' · '}
                reminders sent: {r.remindersSent.length ? r.remindersSent.map((d) => (d === 0 ? 'day of' : `${d} d`)).join(', ') : 'none'}
                {r.lastManualReminder ? ` · you reminded ${formatDhakaDateTime(r.lastManualReminder)}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onPick({ kind: 'remind', vendorId: r.vendorId, storeName: r.storeName })} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">Remind</button>
              <button type="button" onClick={() => onPick({ kind: 'extend', vendorId: r.vendorId, storeName: r.storeName })} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">Extend</button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/** Super Admin > Plans > Renewals (super-admin-plan.md Step 9): who is about to lapse, who is in grace, who lapsed and did not come back. */
export default function Renewals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-renewals'], queryFn: adminRenewalsApi.lists, refetchInterval: 60_000 });
  const [pick, setPick] = useState<Pick | null>(null);
  const [grace, setGrace] = useState<string>('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-renewals'] });
  const saveGrace = useMutation({
    mutationFn: () => adminRenewalsApi.setGrace(Number(grace)),
    onSuccess: () => {
      toast.success('Grace period saved.');
      setGrace('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });

  if (isLoading || !data) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Renewals</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">A paying store is reminded 7, 3 and 1 day before its plan ends and on the day, by bell and SMS, then keeps its plan through a grace period before it moves to Free.</p>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-5">
        <div>
          <p className="text-sm font-semibold text-regantify-text">Grace period: {data.graceDays} {data.graceDays === 1 ? 'day' : 'days'}</p>
          <p className="text-xs text-regantify-text-muted">After the end date the plan keeps working this long, and the store sees a red “renew now” bar.</p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (grace !== '') saveGrace.mutate();
          }}
        >
          <input type="number" min={0} max={14} value={grace} onChange={(e) => setGrace(e.target.value)} placeholder="0 to 14" className="w-24 rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none" />
          <button type="submit" disabled={grace === '' || saveGrace.isPending} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save</button>
        </form>
      </section>

      <Table title="Ending in the next 7 days" hint="Paid plans that have not been renewed yet." rows={data.endingSoon} empty="No plan ends this week." onPick={setPick} />
      <Table title="In the grace period" hint="The plan has ended but still works. These stores move to Free when the date shown arrives." rows={data.inGrace} grace empty="Nobody is in the grace period." onPick={setPick} />

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-sm font-semibold text-regantify-text">Ended in the last 30 days, not renewed ({data.recentlyEnded.length})</h2>
        <p className="mb-3 text-xs text-regantify-text-muted">These stores are on the Free plan now. A reminder asks them to come back. To give a plan back for free, change their plan on the store page.</p>
        {data.recentlyEnded.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">Nobody.</p>
        ) : (
          data.recentlyEnded.map((r: EndedRow) => (
            <div key={r.vendorId} className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 py-2.5 text-sm">
              <div>
                <Link to={`/admin/vendors/${r.vendorId}`} className="font-medium text-regantify-cta hover:underline">{r.storeName}</Link>
                <p className="text-xs text-regantify-text-muted">
                  {r.plan} plan ended {day(r.endedAt)} · {r.phone ?? 'no phone'}
                  {r.lastManualReminder ? ` · you reminded ${formatDhakaDateTime(r.lastManualReminder)}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setPick({ kind: 'remind', vendorId: r.vendorId, storeName: r.storeName })} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-regantify-content">Remind</button>
            </div>
          ))
        )}
      </section>

      <ActionDialog
        pick={pick}
        onClose={() => setPick(null)}
        onDone={() => {
          setPick(null);
          refresh();
        }}
      />
    </div>
  );
}
