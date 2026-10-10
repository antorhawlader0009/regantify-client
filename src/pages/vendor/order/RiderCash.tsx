import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Trash2, Wallet } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { riderCashApi, type RiderSummary } from '../../../lib/riderCashApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { printElement } from '../../../lib/printElement';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const taka = (n: number) => `${n < 0 ? '-' : ''}৳${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const inputClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

/** One rider: the day's deliveries and returns, the cash they handed in, and what they still hold. */
function RiderPanel({ rider }: { rider: RiderSummary }) {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({ queryKey: ['rider-cash', rider.name, from, to], queryFn: () => riderCashApi.rider(rider.name, from, to) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['rider-cash'] });
    void queryClient.invalidateQueries({ queryKey: ['rider-cash-riders'] });
  };

  const add = useMutation({
    mutationFn: () => riderCashApi.addEntry(rider.name, Number(amount), note),
    onSuccess: () => {
      toast.success(`Recorded ${taka(Number(amount))} from ${rider.name}.`);
      setAmount('');
      setNote('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t record the cash.')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => riderCashApi.removeEntry(id),
    onSuccess: refresh,
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t remove the entry.')),
  });

  const print = () => {
    if (sheetRef.current) void printElement(sheetRef.current, `Rider cash - ${rider.name}`);
  };

  const balance = data?.balance ?? rider.balance;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-neutral-600">
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-sm text-neutral-600">
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
        <button type="button" onClick={print} className={`${outlineBtn} ml-auto`}>
          <Printer size={15} aria-hidden />
          Print sheet
        </button>
      </div>

      <div ref={sheetRef} className="space-y-4 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-regantify-text">{rider.name}</p>
            <p className="text-xs text-neutral-500">
              {from === to ? from : `${from} to ${to}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Still holds</p>
            <p className={`text-2xl font-semibold tabular-nums ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{taka(balance)}</p>
            <p className="text-xs text-neutral-500">{balance === 0 ? 'Settled' : balance > 0 ? 'owed to the store' : 'handed in more than collected'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">Collected</p>
            <p className="font-semibold tabular-nums">{taka(data?.collectedInRange ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">Handed in</p>
            <p className="font-semibold tabular-nums">{taka(data?.handedInRange ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">Delivered / returned</p>
            <p className="font-semibold tabular-nums">
              {data?.delivered.length ?? 0} / {data?.returned.length ?? 0}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-regantify-text">Delivered</p>
          {data && data.delivered.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {data.delivered.map((d) => (
                  <tr key={d.orderId} className="border-b border-line last:border-0">
                    <td className="py-1.5">
                      <Link to={`/vendor/orders/${d.orderId}`} className="text-brand hover:underline">
                        {d.orderRef}
                      </Link>
                    </td>
                    <td className="py-1.5 text-neutral-600">
                      {d.customerName}
                      {d.area ? ` · ${d.area}` : ''}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{d.cash > 0 ? taka(d.cash) : <span className="text-neutral-400">paid</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-500">Nothing delivered in these days.</p>
          )}
        </div>

        {data && data.returned.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-regantify-text">Came back (no cash)</p>
            <ul className="text-sm text-neutral-600">
              {data.returned.map((d) => (
                <li key={d.orderId}>
                  {d.orderRef} · {d.customerName}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1 text-sm font-medium text-regantify-text">Cash handed in</p>
          {data && data.entries.length > 0 ? (
            <ul className="divide-y divide-line text-sm">
              {data.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-neutral-600">
                    {formatDhakaDateTime(e.createdAt)}
                    {e.actor ? ` · taken by ${e.actor}` : ''}
                    {e.note ? ` · ${e.note}` : ''}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {taka(e.amount)}
                    {isOwner && (
                      <button type="button" onClick={() => remove.mutate(e.id)} aria-label="Remove this entry" className="rounded p-1 text-red-600 hover:bg-red-50 print:hidden">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Nothing handed in in these days.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-neutral-500">
          <p className="border-t border-neutral-400 pt-1">Rider’s signature</p>
          <p className="border-t border-neutral-400 pt-1">Received by</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-4">
        <p className="mb-2 text-sm font-medium text-regantify-text">Record cash from {rider.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} inputMode="decimal" placeholder="Amount (৳)" aria-label="Amount handed in" className={`${inputClass} w-36`} />
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Note (optional)" aria-label="Note" className={`${inputClass} min-w-[180px] flex-1`} />
          <button type="button" onClick={() => add.mutate()} disabled={!(Number(amount) > 0) || add.isPending} className={primaryBtn}>
            {add.isPending ? 'Saving…' : 'Record cash'}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">This is a record only. No wallet or order changes.</p>
      </div>
    </div>
  );
}

/**
 * Orders > Rider cash (TellMe idea 38): for stores that deliver with their own riders (named on the order). Each rider's
 * delivered Cash on Delivery orders give the cash they collected; you record what they hand in, and the balance is what
 * they still hold, carried from day to day. Counted from 10 Oct 2026. Print the day's sheet for both of you to sign.
 */
export default function RiderCash() {
  const [picked, setPicked] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['rider-cash-riders'], queryFn: riderCashApi.riders });
  const riders = data?.riders ?? [];
  const current = riders.find((r) => r.name === picked) ?? riders[0];

  return (
    <PageSection>
      <PageHeader
        title="Rider cash"
        description="The cash your own delivery riders collect, what they hand in, and what they still hold. Name the rider on each order (Order detail > Own delivery)."
        actions={
          <Link to="/vendor/orders" className={outlineBtn}>
            Back to orders
          </Link>
        }
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : riders.length === 0 ? (
        <EmptyState icon={Wallet} title="No rider cash yet" hint="When an order delivered by your own rider (a rider name on the order) is marked Completed, the rider shows up here with the cash they collected." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <ul className="space-y-2">
            {riders.map((r) => (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => setPicked(r.name)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left ${current?.name === r.name ? 'border-brand bg-brand/5' : 'border-line bg-white hover:bg-neutral-50'}`}
                >
                  <p className="flex items-center justify-between gap-2 text-sm font-medium text-regantify-text">
                    <span className="truncate">{r.name}</span>
                    <span className={`tabular-nums ${r.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{taka(r.balance)}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {r.deliveredCount} delivered · {taka(r.collected)} collected
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {current && <RiderPanel key={current.name} rider={current} />}
        </div>
      )}
    </PageSection>
  );
}
