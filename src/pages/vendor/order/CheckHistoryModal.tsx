import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { ordersApi } from '../../../lib/ordersApi';
import { OrderStatusBadge } from './orderStatus';

interface CheckHistoryModalProps {
  phone: string | null;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * "Check History" — a customer's delivery track record across the whole
 * Regantify platform (not just this vendor's own orders), by phone
 * number. See server/src/courier/customer-history.service.ts for what
 * counts as a successful vs. failed delivery.
 */
export function CheckHistoryModal({ phone, onOpenChange }: CheckHistoryModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-history', phone],
    queryFn: () => ordersApi.getCustomerHistory(phone!),
    enabled: Boolean(phone),
  });

  return (
    <Dialog open={Boolean(phone)} onOpenChange={onOpenChange} title="Delivery History" maxWidth="max-w-xl">
      <div className="p-6 pt-4">
        {phone && <p className="text-sm text-regantify-text-muted mb-4">{phone}</p>}

        {isLoading ? (
          <p className="text-sm text-regantify-text-muted py-6 text-center">Loading…</p>
        ) : !data || data.orders.length === 0 ? (
          <p className="text-sm text-regantify-text-muted py-6 text-center">
            No previous orders found for this number.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-xl bg-regantify-content">
              <div>
                <p className="text-xs text-regantify-text-muted">Success rate</p>
                <p className="text-lg font-semibold text-regantify-text">
                  {data.successRate === null ? '—' : `${data.successRate}%`}
                </p>
              </div>
              <div>
                <p className="text-xs text-regantify-text-muted">Resolved orders</p>
                <p className="text-lg font-semibold text-regantify-text">{data.totalResolved}</p>
              </div>
              <div>
                <p className="text-xs text-regantify-text-muted">Total orders seen</p>
                <p className="text-lg font-semibold text-regantify-text">{data.orders.length}</p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-black/5">
              {data.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-regantify-text">
                      ORDER-{o.invoiceNumber} · {o.storeName}
                    </p>
                    <p className="text-xs text-regantify-text-muted">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-regantify-text">{formatPrice(o.total)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
