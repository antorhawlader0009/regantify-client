import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, LogIn, Search } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { toast } from '../../../lib/toast';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function copyToClipboard(value: string, label: string) {
  navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied.`));
}

export default function AllVendors() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => setPage(1), [search, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors', { search, page, perPage }],
    queryFn: () => adminApi.listVendors({ search: search.trim() || undefined, page, perPage }),
  });

  // "Login as Vendor" — generates the one-time token and immediately
  // opens it in a new tab, which VendorImpersonateEntry exchanges for a
  // 15-min vendor session. See adminApi.impersonateVendor's comment.
  const impersonateMutation = useMutation({
    mutationFn: adminApi.impersonateVendor,
    onSuccess: ({ token }) => {
      window.open(`/vendor-impersonate?token=${encodeURIComponent(token)}`, '_blank', 'noopener');
    },
    onError: () => toast.error('Could not start a vendor session. Please try again.'),
  });

  const vendors = data?.vendors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">All Vendors</h1>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name, URL, or phone"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>

          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-4 py-3 font-medium">VENDOR ID</th>
                <th className="px-4 py-3 font-medium">STORE</th>
                <th className="px-4 py-3 font-medium">PHONE</th>
                <th className="px-4 py-3 font-medium">BALANCE</th>
                <th className="px-4 py-3 font-medium">SMS LEFT</th>
                <th className="px-4 py-3 font-medium">PRODUCTS</th>
                <th className="px-4 py-3 font-medium">ORDERS</th>
                <th className="px-4 py-3 font-medium">JOINED</th>
                <th className="px-4 py-3 font-medium">LAST LOGIN</th>
                <th className="px-4 py-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && vendors.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-regantify-text-muted">
                    No vendors yet.
                  </td>
                </tr>
              )}
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyToClipboard(v.id, 'Vendor ID')}
                      className="flex items-center gap-1.5 text-regantify-text-muted hover:text-regantify-text font-mono text-xs"
                      title={v.id}
                    >
                      {v.id.slice(0, 8)}…
                      <Copy size={12} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-regantify-text">{v.storeName}</div>
                    <a
                      href={storefrontStoreUrl(v.subdomain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-regantify-cta hover:underline"
                    >
                      {v.subdomain}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-regantify-text">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-regantify-text">৳{Number(v.balance).toLocaleString('en-US')}</td>
                  <td className="px-4 py-3 text-regantify-text">{v.smsCredits}</td>
                  <td className="px-4 py-3 text-regantify-text">{v.productCount}</td>
                  <td className="px-4 py-3 text-regantify-text">{v.orderCount}</td>
                  <td className="px-4 py-3 text-regantify-text-muted">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3 text-regantify-text-muted">{formatDate(v.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => impersonateMutation.mutate(v.id)}
                      disabled={impersonateMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-sm
                        text-regantify-text hover:bg-regantify-content disabled:opacity-50"
                      title="Open this vendor's dashboard for support/troubleshooting"
                    >
                      <LogIn size={14} />
                      Login as Vendor
                    </button>
                  </td>
                </tr>
              ))}
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
              <span className="px-2 text-sm text-regantify-text">
                Page {page} of {totalPages}
              </span>
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
