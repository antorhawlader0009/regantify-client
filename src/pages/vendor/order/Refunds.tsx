import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Trash2 } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, PillTabs, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { SendSmsChoiceDialog } from '../../../components/ui/SendSmsChoiceDialog';
import { orderRefundsApi, REFUND_METHOD_LABEL, type RefundItem, type RefundMethod } from '../../../lib/orderRefundsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const QUERY_KEY = ['order-refunds'];
const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const inputClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
const PAY_METHODS: RefundMethod[] = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CASH', 'OTHER'];

/** The form that records one repayment, or "keep it" for the rest. */
function RecordForm({ item, onDone }: { item: RefundItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(item.remaining));
  const [method, setMethod] = useState<RefundMethod>('BKASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  // "Tell the customer by SMS?" is asked in a popup when Save is pressed.
  const [askSms, setAskSms] = useState(false);

  const record = useMutation({
    mutationFn: (v: { m: RefundMethod; sms: boolean }) =>
      orderRefundsApi.record(item.orderId, { amount: v.m === 'WAIVED' ? item.remaining : Number(amount), method: v.m, reference, note, sms: v.sms && v.m !== 'WAIVED' }),
    onSuccess: (res, { m }) => {
      toast.success(m === 'WAIVED' ? 'Marked as kept.' : res.remaining > 0 ? `Saved. ${taka(res.remaining)} is still to pay back.` : 'Saved. This refund is settled.');
      if (res.smsSent) toast.success('The customer was told by SMS.');
      if (res.smsError) toast.error(`The SMS was not sent: ${res.smsError}`);
      setAskSms(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save this.')),
  });

  const amountOk = Number(amount) > 0 && Number(amount) <= item.remaining;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-neutral-50 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-neutral-600">
          Amount paid back (৳)
          <input type="number" min={1} max={item.remaining} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1 block w-36`} />
        </label>
        <label className="text-sm text-neutral-600">
          How
          <select value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} className={`${inputClass} mt-1 block`}>
            {PAY_METHODS.map((m) => (
              <option key={m} value={m}>
                {REFUND_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-sm text-neutral-600">
          Reference (optional)
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder="bKash TrxID or bank ref" className={`${inputClass} mt-1 block w-full`} />
        </label>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (optional)" className={`${inputClass} block w-full`} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAskSms(true)} disabled={!amountOk || record.isPending} className={primaryBtn}>
          {record.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone} className={outlineBtn}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => record.mutate({ m: 'WAIVED', sms: false })}
          disabled={record.isPending}
          title="You keep the money on purpose, for example a refused parcel's advance. Nothing is paid back."
          className="ml-auto text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
        >
          Keep {taka(item.remaining)} (no refund)
        </button>
      </div>
      <SendSmsChoiceDialog
        open={askSms}
        onOpenChange={setAskSms}
        title="Tell the customer by SMS?"
        busy={record.isPending}
        onSkip={() => record.mutate({ m: method, sms: false })}
        onSend={() => record.mutate({ m: method, sms: true })}
        message={<>
              <p>The customer also sees this refund on their order tracking page. You can text them too.</p>
              <p className="mt-2">It uses about 1 SMS credit from your store.</p>
            </>}
      />
    </div>
  );
}

function RefundCard({ item, canRecord, isOwner }: { item: RefundItem; canRecord: boolean; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: (id: string) => orderRefundsApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t remove the entry.')),
  });
  const late = item.remaining > 0 && item.waitingDays >= 3;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="mr-auto min-w-0">
          <Link to={`/vendor/orders/${item.orderId}`} className="text-sm font-semibold text-brand hover:underline">
            {item.ref}
          </Link>
          <p className="text-sm text-regantify-text">
            {item.customerName} · {item.customerPhone}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {item.status === 'CANCELLED' ? 'Cancelled' : item.status === 'RETURN' ? 'Returned' : item.status === 'PAYMENT_FAILED' ? 'Payment failed' : item.status}
            {item.closedAt ? ` ${formatDhakaDateTime(item.closedAt)}` : ''} · paid {item.advance ? 'as an advance ' : ''}through {item.paidVia === 'GATEWAY' ? 'your own gateway' : 'PayStation'} on {formatDhakaDateTime(item.paidAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Customer paid {taka(item.paid)}</p>
          {item.refunded > 0 && <p className="text-xs text-neutral-500">Settled {taka(item.refunded)}</p>}
          {item.remaining > 0 ? (
            <p className={`text-base font-semibold ${late ? 'text-red-700' : 'text-regantify-text'}`}>
              {taka(item.remaining)} to pay back
              <span className="ml-1.5 text-xs font-normal text-neutral-500">{item.waitingDays === 0 ? 'since today' : `${item.waitingDays} day${item.waitingDays === 1 ? '' : 's'}`}</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-green-700">Settled</p>
          )}
        </div>
      </div>

      {item.refunds.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm text-neutral-600">
          {item.refunds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2">
              <span>
                {r.method === 'WAIVED' ? `Kept ${taka(r.amount)}` : `Paid back ${taka(r.amount)} by ${REFUND_METHOD_LABEL[r.method]}`}
                {r.reference ? ` (ref ${r.reference})` : ''}
                {r.note ? ` · ${r.note}` : ''}
              </span>
              <span className="text-xs text-neutral-400">
                {formatDhakaDateTime(r.createdAt)}
                {r.actor ? ` · ${r.actor}` : ''}
                {r.smsSent ? ' · customer told by SMS' : ''}
              </span>
              {isOwner && (
                <button type="button" onClick={() => remove.mutate(r.id)} disabled={remove.isPending} className="text-neutral-400 hover:text-red-600" title="Remove this entry (owner only)" aria-label="Remove this entry">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {item.remaining > 0 && canRecord && (open ? <RecordForm item={item} onDone={() => setOpen(false)} /> : (
        <button type="button" onClick={() => setOpen(true)} className={`${outlineBtn} mt-3`}>
          I paid it back / keep it
        </button>
      ))}
    </div>
  );
}

/**
 * Orders > Refunds to pay (TellMe idea 145). Orders a shopper paid online and that were then cancelled, returned or failed, with how much is still to
 * pay back. The refund itself is sent outside the platform (bKash, bank...); here the store records it. Seeing and recording need orders.view and
 * orders.cancel_refund; removing an entry is the owner's.
 */
export default function Refunds() {
  const canRecord = useCan('orders.cancel_refund');
  const isOwner = useCan('owner');
  const [tab, setTab] = useState<'PENDING' | 'DONE'>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: [...QUERY_KEY, tab, page], queryFn: () => orderRefundsApi.list(tab, page), placeholderData: keepPreviousData });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <PageSection>
      <PageHeader
        title="Refunds to pay"
        description="Customers who paid online for an order that was cancelled or returned. Pay them back (bKash, bank...) and record it here so none is forgotten."
        back={{ to: '/vendor/orders', label: 'All orders' }}
      />
      {data && data.pendingCount > 0 && (
        <p className={`mb-3 rounded-lg border px-3 py-2 text-sm ${data.lateCount > 0 ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {data.pendingCount} {data.pendingCount === 1 ? 'refund' : 'refunds'} waiting, {taka(data.pendingTotal)} in all
          {data.lateCount > 0 ? `. ${data.lateCount} waiting 3 days or more.` : '.'}
        </p>
      )}
      <PillTabs
        tabs={[
          { id: 'PENDING', label: 'Waiting', count: data?.pendingCount },
          { id: 'DONE', label: 'Settled' },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />
      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={tab === 'PENDING' ? 'Nothing to pay back' : 'Nothing settled yet'}
          hint={tab === 'PENDING' ? 'When an order paid online is cancelled or returned, it will show here. Only orders closed from 12 Oct 2026 are tracked.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <RefundCard key={`${item.orderId}-${item.refunds.length}`} item={item} canRecord={canRecord} isOwner={isOwner} />
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-1 text-sm">
              <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="text-neutral-500">
                {page} / {pages}
              </span>
              <button type="button" className={outlineBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
