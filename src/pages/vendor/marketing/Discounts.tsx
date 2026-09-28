import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { discountsApi, type Discount } from '../../../lib/discountsApi';
import { toast } from '../../../lib/toast';

/** "10% off (Max ৳500)" / "৳200 off" / "Free Shipping". */
function typeLabel(discount: Discount): string {
  if (discount.discountType === 'FREE_SHIPPING') return 'Free Shipping';
  if (discount.discountType === 'PERCENT') {
    const max = discount.maxDiscount ? ` (Max ৳${Number(discount.maxDiscount).toLocaleString()})` : '';
    return `${Number(discount.amount)}% off${max}`;
  }
  return `৳${Number(discount.amount).toLocaleString()} off`;
}

/** Summarizes what a cart needs for the discount — blank means every cart gets it. */
function conditionsLabel(discount: Discount): string {
  const parts: string[] = [];
  if (discount.minCartAmount) parts.push(`Min ৳${Number(discount.minCartAmount).toLocaleString()}`);
  if (discount.minQuantity) parts.push(`${discount.minQuantity}+ items`);
  if (discount.products.length > 0)
    parts.push(`${discount.products.length} product${discount.products.length === 1 ? '' : 's'}`);
  if (discount.categories.length > 0)
    parts.push(`${discount.categories.length} categor${discount.categories.length === 1 ? 'y' : 'ies'}`);
  return parts.length > 0 ? parts.join(', ') : 'All orders';
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function scheduleLabel(discount: Discount): string {
  if (discount.startsAt && discount.endsAt) return `${formatDate(discount.startsAt)} – ${formatDate(discount.endsAt)}`;
  if (discount.startsAt) return `From ${formatDate(discount.startsAt)}`;
  if (discount.endsAt) return `Until ${formatDate(discount.endsAt)}`;
  return 'Always';
}

/** Whether shoppers are getting it right now, taking the schedule into account. */
function statusOf(discount: Discount): { label: string; className: string } {
  const now = Date.now();
  if (!discount.active) return { label: 'Inactive', className: 'bg-black/5 text-regantify-text-muted' };
  if (discount.startsAt && new Date(discount.startsAt).getTime() > now)
    return { label: 'Scheduled', className: 'bg-amber-50 text-amber-700' };
  if (discount.endsAt && new Date(discount.endsAt).getTime() < now)
    return { label: 'Expired', className: 'bg-red-50 text-red-600' };
  return { label: 'Running', className: 'bg-green-50 text-green-700' };
}

/** Same visual pattern as AddCoupon's switches. */
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

function DiscountRow({ discount }: { discount: Discount }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = statusOf(discount);

  const activeMutation = useMutation({
    mutationFn: (active: boolean) => discountsApi.setActive(discount.id, active),
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success(active ? 'Discount turned on.' : 'Discount turned off.');
    },
    onError: () => toast.error('Could not update this discount. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => discountsApi.remove(discount.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Discount deleted.');
    },
    onError: () => toast.error('Could not delete this discount. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete the discount "${discount.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <button
          onClick={() => navigate(`/vendor/marketing/discounts/${discount.id}/edit`)}
          className="text-sm font-medium text-regantify-cta hover:text-regantify-cta-dark text-left"
        >
          {discount.name}
        </button>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2.5">
          <Toggle
            checked={discount.active}
            onChange={(v) => activeMutation.mutate(v)}
            disabled={activeMutation.isPending}
          />
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
        </div>
      </td>
      <td className="p-4 text-sm text-regantify-text">{typeLabel(discount)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">{conditionsLabel(discount)}</td>
      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">{scheduleLabel(discount)}</td>
      <td className="p-4 text-sm text-regantify-text">{discount.usageCount}</td>
      <td className="p-4 text-right">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600">
          Delete
        </button>
      </td>
    </tr>
  );
}

/**
 * Marketing > Discounts — automatic discounts a storefront checkout gets
 * without typing a code (see the Discount model's schema comment).
 */
export default function Discounts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['discounts', { search, page }],
    queryFn: () => discountsApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  const discounts = data?.discounts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-regantify-text">Discounts</h1>
        <button
          onClick={() => navigate('/vendor/marketing/discounts/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>
      <p className="text-sm text-regantify-text-muted mb-6">
        Applied automatically at checkout when the cart qualifies. No code needed. If several qualify, the shopper
        gets the biggest one.
      </p>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discounts"
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
                <th className="p-4">Conditions</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Used</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    No discounts yet.
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => <DiscountRow key={discount.id} discount={discount} />)
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
