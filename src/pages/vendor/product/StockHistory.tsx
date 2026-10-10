import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, SearchBox, SelectBox, TableFooter, TableFrame, TableSkeleton, outlineBtn, td, th, theadRow, trClass } from '../../../components/ui/PageKit';
import { stockCountApi } from '../../../lib/stockCountApi';
import { STOCK_REASON_LABEL } from '../../../components/product/StockHistoryDialog';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { useCan } from '../../../lib/useStaffAccess';

const dateClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/**
 * Product > Stock history (TellMe idea 31): every change to a stock count in the whole store, newest first. Each one
 * says which product, why (an order, a return, a count, a hand edit...), who, and the numbers before and after, so a
 * gap between the system and the shelf can be traced. A single product's history is on its Edit page.
 */
export default function StockHistory() {
  const canCount = useCan('products.edit');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [reason, setReason] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [reason, from, to, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', term, reason, from, to, page, perPage],
    queryFn: () => stockCountApi.history({ search: term || undefined, reason: reason || undefined, from: from || undefined, to: to || undefined, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];

  return (
    <PageSection>
      <PageHeader
        title="Stock history"
        description={`${(data?.total ?? 0).toLocaleString()} ${(data?.total ?? 0) === 1 ? 'change' : 'changes'}`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Product name or SKU" />
            <SelectBox ariaLabel="Why" value={reason} onChange={setReason}>
              <option value="">Any reason</option>
              {Object.entries(STOCK_REASON_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectBox>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From" className={dateClass} />
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To" className={dateClass} />
            {canCount && (
              <Link to="/vendor/product/stock-count" className={outlineBtn}>
                Stock count
              </Link>
            )}
          </>
        }
      />

      <TableFrame minWidth="min-w-[860px]">
        <thead>
          <tr className={theadRow}>
            <th className={th}>When</th>
            <th className={th}>Product</th>
            <th className={th}>Why</th>
            <th className={`${th} w-28`}>Change</th>
            <th className={`${th} w-28`}>Stock</th>
            <th className={th}>By</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={6} colSpan={6} />
          ) : items.length === 0 ? (
            <EmptyState as="row" colSpan={6} icon={History} title="No stock changes found" hint="Every sale, return, count and hand edit of a stock number shows up here." />
          ) : (
            items.map((m) => {
              const up = m.delta > 0;
              return (
                <tr key={m.id} className={trClass()}>
                  <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDateTime(m.createdAt)}</td>
                  <td className={`${td} min-w-[220px]`}>
                    <div className="flex items-center gap-3">
                      {m.productImage ? <img src={m.productImage} alt="" className="h-9 w-9 rounded-md border border-line object-cover" /> : <span className="h-9 w-9 rounded-md bg-neutral-100" />}
                      <div className="min-w-0">
                        <Link to={`/vendor/product/edit/${m.productId}#stock`} className="line-clamp-1 font-medium text-brand hover:underline">
                          {m.productName}
                        </Link>
                        <p className="text-xs text-neutral-500">{[m.variantLabel, `SKU ${m.productSku}`].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <p>{STOCK_REASON_LABEL[m.reason] ?? m.reason}</p>
                    {m.orderId && (
                      <Link to={`/vendor/orders/${m.orderId}`} className="text-xs font-medium text-brand hover:underline">
                        {m.orderRef ?? 'order'}
                      </Link>
                    )}
                    {m.note && <p className="text-xs text-neutral-500">{m.note}</p>}
                  </td>
                  <td className={td}>
                    <span className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold ${m.delta === 0 ? 'bg-neutral-100 text-neutral-500' : up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {up ? '+' : ''}
                      {m.delta}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap tabular-nums text-neutral-600`}>
                    {m.stockBefore} → {m.stockAfter}
                  </td>
                  <td className={`${td} text-neutral-600`}>{m.actor ?? '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableFrame>

      <TableFooter page={page} perPage={perPage} total={data?.total ?? 0} onPageChange={setPage} onPerPageChange={setPerPage} />
    </PageSection>
  );
}
