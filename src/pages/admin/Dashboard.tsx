import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, Receipt } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { adminDashboardApi } from '../../lib/adminDashboardApi';

// Same `৳` formatting convention as Finance > Wallet (client's own
// vendor-side page) — `-` prefix instead of the default `৳-95.00`
// toLocaleString would give.
function formatAmount(value: string) {
  const n = Number(value);
  const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return n < 0 ? `-৳${formatted}` : `৳${formatted}`;
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'platform-revenue'],
    queryFn: () => adminDashboardApi.getPlatformRevenue(),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text">
        Welcome, {user?.fullName ?? 'Super Admin'}
      </h1>
      <p className="text-regantify-text-muted mt-1">
        Platform-wide overview — more metrics coming in a later phase.
      </p>

      {/* Platform Revenue — the platform's own cut of Store > Payment
          Gateway's per-order "Cash On Delivery fee" / "Online Payment
          (Regantify) fee" (set per plan tier in Plans > Manage Plans).
          This is charged to the shopper as part of the order total but
          never lands in any vendor's own Wallet balance — see
          PlatformRevenue's schema comment on the server for why it's
          tracked separately. */}
      <div className="mt-6 bg-regantify-black rounded-2xl p-6 text-white max-w-xs">
        <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
          <WalletIcon size={16} />
          Platform Revenue
        </div>
        <p className="text-3xl font-semibold mt-3">
          {isLoading ? '…' : formatAmount(data?.totalRevenue ?? '0')}
        </p>
        <p className="text-white/60 text-xs mt-1">all-time, from gateway fees</p>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-black/5 overflow-hidden max-w-3xl">
        <div className="p-4 border-b border-black/5 flex items-center gap-2">
          <Receipt size={16} className="text-regantify-text-muted" />
          <p className="text-sm font-semibold text-regantify-text">Recent platform fees</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-regantify-text-muted">Loading…</div>
        ) : !data?.recent.length ? (
          <div className="p-8 text-center text-sm text-regantify-text-muted">No platform fees collected yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide bg-regantify-content border-b border-black/5">
                <th className="p-4">Order</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-b-0">
                  <td className="p-4 text-sm text-regantify-text">
                    {row.invoiceNumber ? `ORDER-${row.invoiceNumber}` : '—'}
                  </td>
                  <td className="p-4 text-sm text-regantify-text">{row.vendorName ?? '—'}</td>
                  <td className="p-4 text-sm font-medium text-regantify-text">{formatAmount(row.amount)}</td>
                  <td className="p-4 text-sm text-regantify-text-muted">
                    {new Date(row.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
