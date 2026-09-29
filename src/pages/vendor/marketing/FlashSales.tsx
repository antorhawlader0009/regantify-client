import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { flashSalesApi, type FlashSale } from '../../../lib/flashSalesApi';
import { toast } from '../../../lib/toast';

/** "20% off" / "৳200 off". */
function discountLabel(sale: FlashSale): string {
  const amount = Number(sale.amount);
  return sale.discountType === 'PERCENT' ? `${amount}% off` : `৳${amount.toLocaleString()} off`;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Whether shoppers are getting the sale right now, taking the schedule into account. */
function statusOf(sale: FlashSale): { label: string; className: string } {
  const now = Date.now();
  if (!sale.active) return { label: 'Inactive', className: 'bg-black/5 text-regantify-text-muted' };
  if (new Date(sale.startsAt).getTime() > now) return { label: 'Scheduled', className: 'bg-amber-50 text-amber-700' };
  if (new Date(sale.endsAt).getTime() <= now) return { label: 'Ended', className: 'bg-red-50 text-red-600' };
  return { label: 'Live', className: 'bg-green-50 text-green-700' };
}

/** Same visual pattern as Discounts' switches. */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 disabled:opacity-60 ${
        checked ? 'bg-regantify-cta' : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function FlashSaleRow({ sale }: { sale: FlashSale }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = statusOf(sale);

  const activeMutation = useMutation({
    mutationFn: (active: boolean) => flashSalesApi.setActive(sale.id, active),
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      toast.success(active ? 'Flash sale turned on.' : 'Flash sale turned off.');
    },
    onError: () => toast.error('Could not update this flash sale. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => flashSalesApi.remove(sale.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      toast.success('Flash sale deleted.');
    },
    onError: () => toast.error('Could not delete this flash sale. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete the flash sale "${sale.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <button
          onClick={() => navigate(`/vendor/marketing/flash-sale/${sale.id}/edit`)}
          className="text-sm font-medium text-regantify-cta hover:text-regantify-cta-dark text-left"
        >
          {sale.name}
        </button>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2.5">
          <Toggle checked={sale.active} onChange={(v) => activeMutation.mutate(v)} disabled={activeMutation.isPending} />
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
        </div>
      </td>
      <td className="p-4 text-sm text-regantify-text">{discountLabel(sale)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">
        {sale.products.length} product{sale.products.length === 1 ? '' : 's'}
      </td>
      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">
        {formatDateTime(sale.startsAt)}
        <br />
        to {formatDateTime(sale.endsAt)}
      </td>
      <td className="p-4 text-right">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600">
          Delete
        </button>
      </td>
    </tr>
  );
}

/**
 * Marketing > Flash Sale — time-boxed sales on hand-picked products (see
 * the FlashSale model's schema comment). Shoppers see the sale price
 * (and a countdown on StorePal) only while a sale is Live.
 */
export default function FlashSales() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['flash-sales', { search, page }],
    queryFn: () => flashSalesApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  const flashSales = data?.flashSales ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-regantify-text">Flash Sale</h1>
        <button
          onClick={() => navigate('/vendor/marketing/flash-sale/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>
      <p className="text-sm text-regantify-text-muted mb-6">
        A limited-time price on the products you pick. It starts and ends by itself. If a product also has a
        campaign or regular discount, shoppers get whichever price is lowest.
      </p>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flash sales"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Products</th>
                <th className="p-4">Schedule</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : flashSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    No flash sales yet.
                  </td>
                </tr>
              ) : (
                flashSales.map((sale) => <FlashSaleRow key={sale.id} sale={sale} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
