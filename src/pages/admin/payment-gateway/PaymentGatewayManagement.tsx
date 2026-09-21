import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPaymentGatewaysApi } from '../../../lib/adminPaymentGatewaysApi';
import type { PaymentGatewayCatalogEntry, PaymentGatewayType } from '../../../lib/paymentGatewaysApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { EditGatewayCatalogModal } from './EditGatewayCatalogModal';

const TYPE_ORDER: PaymentGatewayType[] = ['COD', 'ONLINE_PAYMENT', 'SSLCOMMERZ', 'BKASH_MERCHANT', 'VENDOR_PAYSTATION'];

function formatCharge(value: string) {
  return `৳${Number(value).toLocaleString('en-US')}`;
}

/**
 * Super Admin > Payment Gateway — the 5-row platform-wide catalog
 * (COD, Online Payment, SSLCommerz, bKash Merchant, Vendor PayStation)
 * with an enable/disable toggle + edit per row, plus a read-only
 * oversight table of every vendor's connected gateways below it. A
 * vendor's COD/ONLINE_PAYMENT fee is fully plan-driven and NOT editable
 * from this page at all (per-vendor or bulk) — editing a plan's fee at
 * Admin > Plans > Manage Plans is the only action that changes it, and
 * takes effect immediately for every vendor on that plan (see
 * AdminService.updatePlan). Shape mirrors PlanManagement.tsx (catalog
 * seeded once, this page only ever edits rows, never adds/removes).
 * Uses adminPaymentGatewaysApi.
 */
export default function PaymentGatewayManagement() {
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<PaymentGatewayCatalogEntry | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['admin-payment-gateway-catalog'],
    queryFn: adminPaymentGatewaysApi.listCatalog,
  });

  const { data: vendorGateways, isLoading: vendorsLoading } = useQuery({
    queryKey: ['admin-vendor-gateways', page],
    queryFn: () => adminPaymentGatewaysApi.listVendorGateways(page, perPage),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ type, isEnabledPlatformWide }: { type: PaymentGatewayType; isEnabledPlatformWide: boolean }) =>
      adminPaymentGatewaysApi.updateCatalogEntry(type, { isEnabledPlatformWide }),
    onSuccess: (_data, { isEnabledPlatformWide }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-gateway-catalog'] });
      // Vendors' own Store > Payment Gateway page reads this same catalog
      // to decide whether to show the "hidden by platform admin" notice —
      // invalidate it too so the change is visible without a hard refresh.
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-catalog'] });
      toast.success(isEnabledPlatformWide ? 'Gateway enabled platform-wide.' : 'Gateway disabled platform-wide.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update this gateway.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ type, payload }: { type: PaymentGatewayType; payload: { displayName?: string; description?: string } }) =>
      adminPaymentGatewaysApi.updateCatalogEntry(type, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-gateway-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-catalog'] });
      toast.success('Payment gateway updated.');
      setEditingEntry(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save this payment gateway.')),
  });

  const sortedCatalog = [...catalog].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  const vendorRows = vendorGateways?.data ?? [];
  const totalPages = vendorGateways ? Math.max(1, Math.ceil(vendorGateways.total / perPage)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Payment Gateway</h1>

      {catalogLoading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-regantify-text-muted">
                  <th className="px-4 py-3 font-medium">GATEWAY</th>
                  <th className="px-4 py-3 font-medium">DESCRIPTION</th>
                  <th className="px-4 py-3 font-medium">STATUS</th>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sortedCatalog.map((entry) => (
                  <tr key={entry.type} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-regantify-text">{entry.displayName}</td>
                    <td className="px-4 py-3 text-regantify-text-muted max-w-xs truncate">{entry.description || '—'}</td>
                    <td className="px-4 py-3">
                      {entry.isImplemented ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.isEnabledPlatformWide ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {entry.isEnabledPlatformWide ? 'Enabled' : 'Disabled'}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Coming soon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!entry.isImplemented || toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({ type: entry.type, isEnabledPlatformWide: !entry.isEnabledPlatformWide })
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                          entry.isEnabledPlatformWide
                            ? 'bg-regantify-content text-regantify-text hover:bg-black/10'
                            : 'bg-regantify-cta text-white hover:bg-regantify-cta-dark'
                        }`}
                      >
                        {entry.isEnabledPlatformWide ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="px-3 py-1.5 rounded-lg border border-black/10 text-sm
                          text-regantify-text hover:bg-regantify-content"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-medium text-regantify-text mb-1">Vendor gateways</h2>
      <p className="text-sm text-regantify-text-muted mb-4">
        Read-only — every vendor's connected/enabled payment gateways, across every store. Cash On Delivery and
        Online Payment (Regantify) fees follow each vendor's plan automatically — edit a plan's fee at Plans &gt;
        Manage Plans to change them.
      </p>

      {vendorsLoading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-regantify-text-muted">
                  <th className="px-4 py-3 font-medium">STORE</th>
                  <th className="px-4 py-3 font-medium">GATEWAY</th>
                  <th className="px-4 py-3 font-medium">STATUS</th>
                  <th className="px-4 py-3 font-medium">FEE</th>
                  <th className="px-4 py-3 font-medium">UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {vendorRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-regantify-text-muted">
                      No vendor gateways yet.
                    </td>
                  </tr>
                ) : (
                  vendorRows.map((row) => (
                    <tr key={row.id} className="border-t border-black/5">
                      <td className="px-4 py-3 text-regantify-text">
                        {row.storeName}
                        <span className="text-regantify-text-muted"> ({row.subdomain})</span>
                      </td>
                      <td className="px-4 py-3 text-regantify-text">{row.displayLabel ?? row.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : row.status === 'DISABLED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-regantify-text">{formatCharge(row.platformChargeBdt)}</td>
                      <td className="px-4 py-3 text-regantify-text-muted">
                        {new Date(row.updatedAt).toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 text-sm text-regantify-text-muted">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-regantify-content"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-regantify-content"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <EditGatewayCatalogModal
        key={editingEntry?.type}
        entry={editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        submitting={updateMutation.isPending}
        onSave={(payload) => editingEntry && updateMutation.mutate({ type: editingEntry.type, payload })}
      />
    </div>
  );
}
