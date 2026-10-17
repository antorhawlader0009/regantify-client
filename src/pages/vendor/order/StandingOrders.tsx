import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Pause, Play, Trash2 } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, outlineBtn } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { standingOrdersApi, type StandingOrder } from '../../../lib/standingOrdersApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const QUERY_KEY = ['standing-orders'];

function StandingCard({ so, canEdit, onRemove }: { so: StandingOrder; canEdit: boolean; onRemove: () => void }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => standingOrdersApi.update(so.id, { paused: !so.paused }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t change this.')),
  });
  return (
    <div className={`rounded-xl border bg-white p-4 ${so.paused ? 'border-line opacity-80' : 'border-line'}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="mr-auto min-w-0">
          <p className="text-sm font-semibold text-regantify-text">
            {so.customerName} <span className="font-normal text-neutral-500">· {so.customerPhone}</span>
          </p>
          <p className="text-xs text-neutral-500">{so.shippingAddress}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-regantify-text">{so.schedule.text}</p>
          {so.paused ? (
            <p className="text-xs text-neutral-500">{so.ended ? 'Ended' : 'Paused'}</p>
          ) : (
            <p className="text-xs text-neutral-500">Next order on {so.nextRunOn}</p>
          )}
          {so.endsOn && !so.ended && <p className="text-xs text-neutral-400">Until {so.endsOn}</p>}
        </div>
      </div>

      <ul className="mt-3 space-y-0.5 border-t border-line pt-2 text-sm text-neutral-700">
        {so.lines.map((l, i) => (
          <li key={`${l.productId}-${l.variantId ?? ''}-${i}`}>
            {l.quantity} × {l.productName}
            {Object.values(l.selectedOptions).length > 0 ? ` (${Object.values(l.selectedOptions).join(', ')})` : ''}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        {so.lastError ? (
          <span className="text-red-700">Last time no order was made: {so.lastError}</span>
        ) : so.lastOrderId ? (
          <span>
            Last order:{' '}
            <Link to={`/vendor/orders/${so.lastOrderId}`} className="text-brand hover:underline">
              {so.lastOrderRef ?? 'open'}
            </Link>
            {so.lastRunAt ? ` · ${formatDhakaDateTime(so.lastRunAt)}` : ''}
          </span>
        ) : (
          <span>No order made yet.</span>
        )}
        {so.actor && <span>Set up by {so.actor}</span>}
        {canEdit && (
          <span className="ml-auto flex items-center gap-2">
            {!so.ended && (
              <button type="button" onClick={() => toggle.mutate()} disabled={toggle.isPending} className={`${outlineBtn} inline-flex items-center gap-1.5`}>
                {so.paused ? <Play size={14} /> : <Pause size={14} />}
                {so.paused ? 'Resume' : 'Pause'}
              </button>
            )}
            <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-red-600" title="Remove" aria-label="Remove this standing order">
              <Trash2 size={16} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Orders > Standing orders (TellMe idea 149): regular customers whose same order is made again on a rhythm. Each is made from an order with "Make it
 * regular" on Order detail. A Pending order appears on each due day (at that day's prices), the store confirms it, and nothing goes to the customer.
 */
export default function StandingOrders() {
  const queryClient = useQueryClient();
  const canEdit = useCan('orders.create');
  const { data, isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: standingOrdersApi.list });
  const [removing, setRemoving] = useState<StandingOrder | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => standingOrdersApi.remove(id),
    onSuccess: () => {
      setRemoving(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t remove it.')),
  });

  return (
    <PageSection>
      <PageHeader
        title="Standing orders"
        description="Regular customers whose same order is made again for you on a rhythm. Open an order and choose “Make it regular”."
        back={{ to: '/vendor/orders', label: 'All orders' }}
      />
      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No standing orders yet" hint="Open an order from a regular customer and choose “Make it regular”. A new Pending order is then made on each due day." />
      ) : (
        <div className="space-y-3">
          {data.map((so) => (
            <StandingCard key={so.id + so.paused + so.nextRunOn} so={so} canEdit={canEdit} onRemove={() => setRemoving(so)} />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this standing order?"
        message="No more orders will be made for it. Orders already made stay as they are."
        confirmLabel="Remove"
        danger
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </PageSection>
  );
}
