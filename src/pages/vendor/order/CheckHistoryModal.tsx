import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { ordersApi } from '../../../lib/ordersApi';
import { OrderStatusBadge } from './orderStatus';
import { fraudCategoriesText, SourceMark, steadfastScoreText } from '../../../components/courier/CustomerDeliveryStats';

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
  // Pathao's network-wide record for the number (pathao-plan.md Step 15).
  const { data: courierStats } = useQuery({
    queryKey: ['customer-courier-stats', [phone]],
    queryFn: () => ordersApi.getCustomerCourierStats([phone!]),
    enabled: Boolean(phone),
  });
  const pathao = phone ? courierStats?.byPhone[phone]?.pathao : null;
  const steadfast = phone ? courierStats?.byPhone[phone]?.steadfast : null;

  return (
    <Dialog open={Boolean(phone)} onOpenChange={onOpenChange} title="Delivery history" maxWidth="max-w-xl">
      <div className="px-6 pb-6 pt-3">
        {phone && <p className="mb-4 text-sm text-neutral-500">{phone} · across every store on StorePal and the couriers</p>}

        {pathao && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 rounded-lg border border-line px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
              <SourceMark letter="P" className="bg-red-600" /> Pathao
            </p>
            {pathao.fetchedAt ? (
              <>
                <p className="text-sm text-regantify-text tabular-nums">
                  {pathao.total > 0 ? `${Math.round((pathao.successful / pathao.total) * 100)}%` : '—'} · {pathao.successful} delivered,{' '}
                  {pathao.returned} returned of {pathao.total}
                </p>
                <p className="text-xs text-neutral-500">checked on {new Date(pathao.fetchedAt).toLocaleDateString()}</p>
              </>
            ) : (
              <p className="text-sm text-neutral-500">{pathao.pending ? 'Checking with Pathao…' : 'No Pathao record yet.'}</p>
            )}
          </div>
        )}

        {steadfast && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 rounded-lg border border-line px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
              <SourceMark letter="SF" className="bg-teal-600" /> SteadFast
            </p>
            {steadfast.fetchedAt ? (
              <>
                {steadfast.steadfastScore && (
                  <p className="text-sm text-regantify-text tabular-nums">
                    {steadfastScoreText(steadfast.steadfastScore)}
                    {steadfast.steadfastScore.cancellationRatio != null && `, ${steadfast.steadfastScore.cancellationRatio}% cancelled`}
                  </p>
                )}
                {steadfast.fraudReports > 0 && (
                  <p className="text-sm font-medium text-red-600">
                    {steadfast.fraudReports} fraud report{steadfast.fraudReports === 1 ? '' : 's'}
                    {steadfast.steadfastScore && fraudCategoriesText(steadfast.steadfastScore.fraudCategories) && (
                      <span className="font-normal"> ({fraudCategoriesText(steadfast.steadfastScore.fraudCategories)})</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-neutral-500">checked on {new Date(steadfast.fetchedAt).toLocaleDateString()}</p>
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                {steadfast.pending ? 'Checking with SteadFast…' : steadfast.error ? 'SteadFast check not available.' : 'No SteadFast record yet.'}
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 py-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />)}</div>
        ) : !data || data.orders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line py-6 text-center text-sm text-neutral-500">No orders on StorePal for this number yet.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-neutral-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
                <SourceMark letter="S" className="bg-regantify-black" /> StorePal
              </p>
              <div>
                <p className="text-xs text-neutral-500">Delivered</p>
                <p className="text-lg font-semibold text-regantify-text">
                  {data.successRate === null ? '—' : `${data.successRate}%`}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Finished orders</p>
                <p className="text-lg font-semibold text-regantify-text">{data.totalResolved}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">All orders</p>
                <p className="text-lg font-semibold text-regantify-text">{data.orders.length}</p>
              </div>
            </div>

            <div className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {data.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-regantify-text">
                      ORDER-{o.invoiceNumber} · {o.storeName}
                    </p>
                    <p className="text-xs text-neutral-500">
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
