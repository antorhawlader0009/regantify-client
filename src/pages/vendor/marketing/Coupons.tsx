import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Link2 } from 'lucide-react';
import { couponsApi, type Coupon } from '../../../lib/couponsApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';

/** "Percent Discount – 10 % (Max 2000)" / "Fixed Discount – 500" / "Free Shipping" — matches the TYPE column in the reference list. */
function typeLabel(coupon: Coupon): string {
  if (coupon.discountType === 'FREE_SHIPPING') return 'Free Shipping';
  if (coupon.discountType === 'PERCENT') {
    const max = coupon.maxDiscount ? Number(coupon.maxDiscount).toLocaleString() : '';
    return `Percent Discount – ${Number(coupon.amount)} % (Max ${max})`;
  }
  return `Fixed Discount – ${Number(coupon.amount).toLocaleString()}`;
}

/** "0 (Limit 1)" / "3 (Limit 100 )" / "0" — matches the USAGE column; a blank usageLimit means unlimited, shown with no "(Limit N)" suffix. */
function usageLabel(coupon: Coupon): string {
  return coupon.usageLimit ? `${coupon.usageCount} (Limit ${coupon.usageLimit})` : `${coupon.usageCount}`;
}

/** Summarizes the Coupon Restrictions for the SCOPE column — blank when the coupon applies store-wide. */
function scopeLabel(coupon: Coupon): string {
  const parts: string[] = [];
  if (coupon.newCustomerOnly) parts.push('New customers');
  if (coupon.customerPhones.length > 0) parts.push(`${coupon.customerPhones.length} customer${coupon.customerPhones.length === 1 ? '' : 's'}`);
  if (coupon.products.length > 0) parts.push(`${coupon.products.length} product${coupon.products.length === 1 ? '' : 's'}`);
  if (coupon.categories.length > 0) parts.push(`${coupon.categories.length} categor${coupon.categories.length === 1 ? 'y' : 'ies'}`);
  return parts.join(', ');
}

interface CouponRowProps {
  coupon: Coupon;
  selected: boolean;
  onToggleSelect: () => void;
  subdomain?: string;
}

function CouponRow({ coupon, selected, onToggleSelect, subdomain }: CouponRowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => couponsApi.remove(coupon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted.');
    },
    onError: () => toast.error('Could not delete this coupon. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete the coupon "${coupon.code}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/vendor/marketing/coupons/${coupon.id}/edit`)}
            className="text-sm font-medium text-regantify-cta hover:text-regantify-cta-dark"
          >
            {coupon.code}
          </button>
          {coupon.hasCustomLink && coupon.customLink && subdomain && (
            <button
              onClick={() => {
                const url = `${storefrontStoreUrl(subdomain)}?coupon=${encodeURIComponent(coupon.customLink!)}`;
                navigator.clipboard.writeText(url).then(() => toast.success('Link copied.'));
              }}
              className="text-regantify-text-muted hover:text-regantify-cta"
              title="Copy shareable link"
            >
              <Link2 size={13} />
            </button>
          )}
        </div>
      </td>
      <td className="p-4 text-sm text-regantify-text">{coupon.active ? 'active' : 'inactive'}</td>
      <td className="p-4 text-sm text-regantify-text">{typeLabel(coupon)}</td>
      <td className="p-4 text-sm text-regantify-text">{usageLabel(coupon)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">{scopeLabel(coupon)}</td>
      <td className="p-4 text-right">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600">
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function Coupons() {
  const navigate = useNavigate();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const perPage = 10;

  useEffect(() => setPage(1), [search]);

  // Clear stale selections whenever the visible result set changes —
  // same reasoning as AllProducts.tsx's identical effect. There's no
  // bulk action wired to this selection yet, but the header checkbox's
  // "checked" state (selected.size === coupons.length) can otherwise
  // read as checked by coincidence on a new page/search that happens to
  // have the same row count as a stale selection from before.
  useEffect(() => setSelected(new Set()), [search, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', { search, page }],
    queryFn: () => couponsApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  const coupons = data?.coupons ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  const toggleSelectAll = () => {
    if (selected.size === coupons.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(coupons.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Coupons</h1>
        <button
          onClick={() => navigate('/vendor/marketing/coupons/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupons"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={coupons.length > 0 && selected.size === coupons.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Code</th>
                <th className="p-4">Status</th>
                <th className="p-4">Type</th>
                <th className="p-4">Usage</th>
                <th className="p-4">Scope</th>
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
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <CouponRow
                    key={coupon.id}
                    coupon={coupon}
                    selected={selected.has(coupon.id)}
                    onToggleSelect={() => toggleSelectOne(coupon.id)}
                    subdomain={subdomain}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
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
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
