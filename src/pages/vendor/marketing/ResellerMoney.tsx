import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { api, apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';
import { EmptyState, PageHeader, PageSection, PillTabs, outlineBtn } from '../../../components/ui/PageKit';
import { ResaleNoteDialog } from '../../../components/product/ResaleNoteDialog';
import { ContactLinks } from '../../../components/resale/ContactLinks';

type Status = 'DUE' | 'SETTLED' | 'REVERSED' | 'PAID' | 'HELD' | 'AWAITING_SUPPLIER';
type Side = 'reseller' | 'supplier';

interface Statement {
  side: Side;
  totals: { due: number; dueCount: number; settled: number; settledCount: number; reversedCount: number; oldPaid: number };
  total: number;
  page: number;
  perPage: number;
  items: Array<{
    id: string;
    orderId: string;
    orderRef: string | null;
    orderTotal: number | null;
    otherStore: string;
    otherPhone: string | null;
    earning: number;
    status: Status;
    deliveredAt: string;
    settledAt: string | null;
    settledNote: string | null;
    settledBy: string | null;
    paidAt: string | null;
    reversedAt: string | null;
  }>;
}

const KEY = ['reseller-money'];
const money = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '-');

const STATUS: Record<Status, { label: string; className: string }> = {
  DUE: { label: 'Owed', className: 'bg-red-50 text-red-700' },
  SETTLED: { label: 'Marked paid', className: 'bg-emerald-50 text-emerald-700' },
  REVERSED: { label: 'Returned', className: 'bg-neutral-100 text-neutral-600' },
  PAID: { label: 'Paid (old, through Regantify)', className: 'bg-neutral-100 text-neutral-600' },
  HELD: { label: 'Paid (old, through Regantify)', className: 'bg-neutral-100 text-neutral-600' },
  AWAITING_SUPPLIER: { label: 'Owed', className: 'bg-red-50 text-red-700' },
};

/**
 * Marketing > Reseller > Money record (2026-11-03). Suppliers and resellers settle money between themselves; Regantify only keeps this
 * record. After a delivered resale order the supplier owes the reseller its earning ("Owed"); the supplier pays it directly (bKash, Nagad,
 * bank, cash) and presses "Mark paid", so both stores see the same list. A courier-reported return closes the line.
 */
export default function ResellerMoney() {
  const [params, setParams] = useSearchParams();
  const side: Side = params.get('side') === 'supplier' ? 'supplier' : 'reseller';
  const [status, setStatus] = useState<'ALL' | 'DUE' | 'SETTLED' | 'REVERSED'>('ALL');
  const [page, setPage] = useState(1);
  const [settling, setSettling] = useState<Statement['items'][number] | null>(null);
  const canSettle = useCan('resale.supply');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...KEY, side, status, page],
    queryFn: () =>
      api.get<Statement>('/v1/resale/money/earnings', { params: { side, status: status === 'ALL' ? undefined : status, page } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const settle = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.post(`/v1/resale/money/earnings/${id}/settle`, { note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Marked paid. The reseller gets a note.');
      setSettling(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not mark it paid.')),
  });
  const unsettle = useMutation({
    mutationFn: (id: string) => api.post(`/v1/resale/money/earnings/${id}/unsettle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Back to owed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const setSide = (s: Side) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (s === 'reseller') next.delete('side');
        else next.set('side', s);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  };

  return (
    <PageSection>
      <PageHeader
        title="Money record"
        description={
          side === 'reseller'
            ? 'What suppliers owe you for delivered resale orders. Each supplier pays you directly; call them if a payment is late.'
            : 'What you owe resellers for delivered resale orders. Pay each reseller directly, then press "Mark paid".'
        }
      />
      <div className="mb-3 rounded-lg border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        Regantify does not hold, pay or take any part of reseller money. This page is only a shared record so both stores see the same numbers.
      </div>

      <PillTabs
        tabs={[
          { id: 'reseller', label: 'Owed to me (I resell)' },
          { id: 'supplier', label: 'I owe resellers (I supply)' },
        ]}
        value={side}
        onChange={setSide}
      />

      {data && (
        <div className="my-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {[
            { label: side === 'reseller' ? 'Still owed to you' : 'You still owe', value: money(data.totals.due), hint: `${data.totals.dueCount} order${data.totals.dueCount === 1 ? '' : 's'}` },
            { label: 'Marked paid', value: money(data.totals.settled), hint: `${data.totals.settledCount} order${data.totals.settledCount === 1 ? '' : 's'}` },
            { label: 'Returned (nothing owed)', value: String(data.totals.reversedCount), hint: data.totals.oldPaid > 0 ? `${money(data.totals.oldPaid)} paid through Regantify before` : '' },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <p className="text-xs text-neutral-500">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-regantify-text">{s.value}</p>
              {s.hint && <p className="text-xs text-neutral-500">{s.hint}</p>}
            </div>
          ))}
        </div>
      )}

      <PillTabs
        tabs={[
          { id: 'ALL', label: 'All' },
          { id: 'DUE', label: 'Owed' },
          { id: 'SETTLED', label: 'Marked paid' },
          { id: 'REVERSED', label: 'Returned' },
        ]}
        value={status}
        onChange={(t) => {
          setStatus(t);
          setPage(1);
        }}
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <EmptyState icon={HandCoins} title="Could not load the money record" hint={apiErrorMessage(error, 'Please try again.')} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nothing here yet"
          hint={side === 'reseller' ? "When a resold product's parcel is delivered, what the supplier owes you shows here." : 'When a reseller’s order of your product is delivered, what you owe shows here.'}
        />
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Order</th>
                <th className="px-3 py-2 text-left font-normal">{side === 'reseller' ? 'Supplier' : 'Reseller'}</th>
                <th className="px-3 py-2 text-left font-normal">Delivered</th>
                <th className="px-3 py-2 text-right font-normal">Earning</th>
                <th className="px-3 py-2 text-left font-normal">State</th>
                {side === 'supplier' && canSettle && <th className="px-3 py-2 text-right font-normal" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <Link to={`/vendor/orders/${r.orderId}`} className="font-medium text-brand hover:underline">
                      {r.orderRef ?? 'Order'}
                    </Link>
                    {r.orderTotal !== null && <p className="text-xs text-neutral-500">Order total {money(r.orderTotal)}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <p>{r.otherStore}</p>
                    <ContactLinks phone={r.otherPhone} compact />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{day(r.deliveredAt)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(r.earning)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {r.status === 'SETTLED'
                        ? `${day(r.settledAt)}${r.settledNote ? ` · ${r.settledNote}` : ''}`
                        : r.status === 'REVERSED'
                          ? day(r.reversedAt)
                          : r.status === 'PAID' || r.status === 'HELD'
                            ? day(r.paidAt)
                            : side === 'reseller'
                              ? 'the supplier pays you directly'
                              : 'pay the reseller directly'}
                    </p>
                  </td>
                  {side === 'supplier' && canSettle && (
                    <td className="px-3 py-2 text-right">
                      {(r.status === 'DUE' || r.status === 'AWAITING_SUPPLIER') && (
                        <button type="button" className={outlineBtn} onClick={() => setSettling(r)}>
                          Mark paid
                        </button>
                      )}
                      {r.status === 'SETTLED' && (
                        <button type="button" className="text-xs text-neutral-500 underline" disabled={unsettle.isPending} onClick={() => unsettle.mutate(r.id)}>
                          Undo
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-neutral-600">
          <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" className={outlineBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      {settling && (
        <ResaleNoteDialog
          title={`Mark ${money(settling.earning)} paid to ${settling.otherStore}?`}
          message="Only after you have really paid the reseller. The reseller gets a note and can call you if it did not arrive."
          label="How you paid (the reseller sees this)"
          placeholder="e.g. bKash, TrxID 8N7A6B5C"
          confirmLabel="Mark paid"
          busy={settle.isPending}
          onConfirm={(note) => settle.mutate({ id: settling.id, note })}
          onClose={() => setSettling(null)}
        />
      )}
    </PageSection>
  );
}
