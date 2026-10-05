import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Printer, Search } from 'lucide-react';
import { PosPage } from '../../../components/pos/PosLayout';
import { PosButton, PosInput, taka } from '../../../components/pos/ui';
import { useReceiptPrinter } from '../../../components/pos/receipt/useReceiptPrinter';
import { POS_TENDERS, posApi, TENDER_LABEL, type PosSaleRow, type PosSalesFilter, type PosSyncIssue, type PosTender } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

/*
 * POS > Sales (POS-system-plan.md Step 11): every counter sale with filters (days, register,
 * cashier, payment, status), its receipt to reprint, and an Excel export of what's filtered.
 */

const dhaka = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const select = 'h-9 rounded-md border border-pos-line bg-pos-surface px-2.5 text-sm';
const methodName = (m: string) => TENDER_LABEL[m as PosTender] ?? m;

function statusText(s: PosSaleRow) {
  if (s.status === 'CANCELLED') return { text: 'Voided', tone: 'text-pos-alert' };
  if (s.status === 'REFUNDED') return { text: 'Returned', tone: 'text-pos-alert' };
  if (s.partlyReturned) return { text: 'Partly returned', tone: 'text-amber-700' };
  return { text: 'Sold', tone: 'text-pos-go' };
}

export default function PosSalesPage() {
  return <PosPage title="Sales">{() => <SalesBody />}</PosPage>;
}

function SalesBody() {
  const [filter, setFilter] = useState<PosSalesFilter>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  useEffect(() => setPage(1), [filter]);

  const registers = useQuery({ queryKey: ['pos', 'registers'], queryFn: posApi.registers });
  const cashiers = useQuery({ queryKey: ['pos', 'cashiers'], queryFn: posApi.cashiers });
  const query = useQuery({ queryKey: ['pos', 'sales-list', filter, page], queryFn: () => posApi.salesList({ ...filter, page, perPage }) });
  const printer = useReceiptPrinter();

  const reprint = useMutation({
    mutationFn: (id: string) => posApi.sale(id),
    onSuccess: (receipt) => printer.print(receipt),
    onError: (err) => toast.error(apiErrorMessage(err, 'The receipt couldn’t load.')),
  });

  const exportXlsx = useMutation({
    mutationFn: async () => {
      const data = await posApi.salesList({ ...filter, page: 1, perPage: 5000 });
      const XLSX = await import('xlsx');
      const rows = data.sales.map((s) => [
        s.publicCode ?? `#${s.invoiceNumber}`,
        s.invoiceNumber,
        new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
        s.registerName ?? '',
        s.cashierName ?? '',
        s.customerName,
        s.customerPhone ?? '',
        s.items,
        s.payments.map((p) => `${methodName(p.method)} ${p.amount}`).join(', '),
        s.total,
        s.returned,
        statusText(s).text,
      ]);
      const sheet = XLSX.utils.aoa_to_sheet([['Receipt', 'Serial', 'Date (Dhaka)', 'Register', 'Cashier', 'Customer', 'Phone', 'Items', 'Paid with', 'Total', 'Returned', 'Status'], ...rows]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'POS sales');
      XLSX.writeFile(book, `pos-sales-${filter.from ?? 'all'}${filter.to && filter.to !== filter.from ? `-to-${filter.to}` : ''}.xlsx`);
      return data.total;
    },
    onSuccess: (n) => (n > 5000 ? toast.success('Exported the newest 5,000 sales. Narrow the dates for the rest.') : toast.success(`Exported ${n} sales`)),
    onError: (err) => toast.error(apiErrorMessage(err, 'The export didn’t work. Try again.')),
  });

  const set = (patch: Partial<PosSalesFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / perPage)) : 1;

  return (
    <div className="space-y-4">
      <SyncIssues />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-pos-muted">
          From
          <input type="date" value={filter.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} className={`${select} mt-1 block`} />
        </label>
        <label className="text-xs text-pos-muted">
          To
          <input type="date" value={filter.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} className={`${select} mt-1 block`} />
        </label>
        <select aria-label="Register" value={filter.registerId ?? ''} onChange={(e) => set({ registerId: e.target.value || undefined })} className={select}>
          <option value="">All registers</option>
          {registers.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select aria-label="Cashier" value={filter.cashierId ?? ''} onChange={(e) => set({ cashierId: e.target.value || undefined })} className={select}>
          <option value="">All cashiers</option>
          {cashiers.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <select aria-label="Paid with" value={filter.method ?? ''} onChange={(e) => set({ method: (e.target.value || undefined) as PosTender | undefined })} className={select}>
          <option value="">Any payment</option>
          {POS_TENDERS.map((m) => (
            <option key={m} value={m}>
              {TENDER_LABEL[m]}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={filter.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as PosSalesFilter['status'] })} className={select}>
          <option value="">Any status</option>
          <option value="COMPLETED">Sold</option>
          <option value="PARTLY_RETURNED">Partly returned</option>
          <option value="REFUNDED">Returned</option>
          <option value="CANCELLED">Voided</option>
        </select>
        <form
          className="flex min-w-[14rem] flex-1 gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: search.trim() || undefined });
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-pos-muted" aria-hidden />
            <PosInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Receipt code, #serial, phone or name" className="h-9 pl-8" />
          </label>
          <PosButton type="submit" className="h-9">
            Search
          </PosButton>
        </form>
        <PosButton className="h-9" onClick={() => exportXlsx.mutate()} disabled={exportXlsx.isPending || !query.data?.total}>
          <Download size={15} aria-hidden />
          {exportXlsx.isPending ? 'Exporting…' : 'Excel'}
        </PosButton>
      </div>

      {query.data && (
        <p className="text-sm text-pos-muted">
          {query.data.total} {query.data.total === 1 ? 'sale' : 'sales'} · {taka(query.data.totalAmount)}
        </p>
      )}

      {query.isPending ? (
        <p className="text-sm text-pos-muted">Loading…</p>
      ) : !query.data?.sales.length ? (
        <p className="rounded-[10px] border border-pos-line bg-pos-surface px-4 py-8 text-center text-sm text-pos-muted">No counter sales match.</p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-pos-line bg-pos-surface">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="text-left text-pos-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Receipt</th>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Register · cashier</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Paid with</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {query.data.sales.map((s) => {
                const st = statusText(s);
                return (
                  <tr key={s.id} className="border-t border-pos-line">
                    <td className="px-4 py-2.5">
                      <Link to={`/vendor/orders/${s.id}`} className="font-medium hover:underline">
                        {s.publicCode ?? `#${s.invoiceNumber}`}
                      </Link>
                      <span className="block text-xs text-pos-muted">
                        #{s.invoiceNumber} · {s.items} item{s.items === 1 ? '' : 's'}
                      </span>
                      {s.offline && (
                        <span className={`mt-0.5 inline-block rounded px-1.5 text-[11px] ${s.openIssues > 0 ? 'bg-amber-50 text-amber-800' : 'bg-pos-page text-pos-muted'}`}>
                          Offline {s.localNumber}
                          {s.openIssues > 0 && ' · to check'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{dhaka(s.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {s.registerName ?? '—'} <span className="text-pos-muted">· {s.cashierName ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.customerName}
                      {s.customerPhone && <span className="block text-xs text-pos-muted">{s.customerPhone}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-pos-muted">{s.payments.map((p) => methodName(p.method)).join(' + ')}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {taka(s.total)}
                      {s.returned > 0 && <span className="block text-xs text-pos-alert">−{taka(s.returned)} back</span>}
                    </td>
                    <td className={`px-4 py-2.5 ${st.tone}`}>{st.text}</td>
                    <td className="px-2 py-1.5 text-right">
                      <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => reprint.mutate(s.id)} disabled={reprint.isPending || printer.printing}>
                        <Printer size={14} aria-hidden />
                        Receipt
                      </PosButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-pos-muted">
            Page {page} of {pages}
          </span>
          <PosButton className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </PosButton>
          <PosButton className="h-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Older
          </PosButton>
        </div>
      )}
      {printer.element}
    </div>
  );
}


const ISSUE_LABEL: Record<PosSyncIssue['kind'], string> = {
  STOCK_SHORT: 'Stock ran short',
  PRICE_CHANGED: 'Price changed',
  TOTAL_DIFFERS: 'Total differs',
  SHIFT_CLOSED: 'Shift already closed',
};

/**
 * "Check after sync" (POS-system-plan.md Step 13): what offline sales ran into when they were
 * sent in. The sale is always kept; a manager reads each one, fixes what's needed (a stock count,
 * a price) and marks it checked. Hidden when there's nothing to check.
 */
function SyncIssues() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['pos', 'sync-issues'], queryFn: posApi.syncIssues });
  const resolve = useMutation({
    mutationFn: (id: string) => posApi.resolveSyncIssue(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pos', 'sync-issues'] });
      void queryClient.invalidateQueries({ queryKey: ['pos', 'sales-list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t mark it checked.')),
  });
  if (!query.data?.issues.length) return null;
  return (
    <section className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-4">
      <h2 className="text-[15px] font-semibold">Check after sync ({query.data.openCount})</h2>
      <p className="mt-0.5 text-sm text-pos-muted">Sales made with no internet ran into these when they were sent in. They’re all kept; check each one.</p>
      <ul className="mt-3 divide-y divide-amber-200">
        {query.data.issues.map((i) => (
          <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium">{ISSUE_LABEL[i.kind]}</span> ·{' '}
                <Link to={`/vendor/orders/${i.order.id}`} className="hover:underline">
                  {i.order.posLocalNumber ?? i.order.publicCode ?? `#${i.order.invoiceNumber}`}
                </Link>
                <span className="text-pos-muted">
                  {' '}
                  · {dhaka(i.order.createdAt)} · {taka(i.order.total)}
                  {i.order.posCashierName && ` · ${i.order.posCashierName}`}
                </span>
              </p>
              <p className="text-xs text-pos-muted">{i.detail}</p>
            </div>
            <PosButton className="h-8 text-xs" onClick={() => resolve.mutate(i.id)} disabled={resolve.isPending}>
              Mark checked
            </PosButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
