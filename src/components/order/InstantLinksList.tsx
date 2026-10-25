import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { InstantCheckoutDialog } from './InstantCheckoutDialog';
import { instantCheckoutApi } from '../../lib/instantCheckoutApi';
import { PageSection, TableFooter, primaryBtn } from '../ui/PageKit';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';

const STATE_LABEL = { OPEN: 'Waiting', ORDERED: 'Ordered', EXPIRED: 'Expired', CANCELLED: 'Cancelled' } as const;
const STATE_CLASS = { OPEN: 'bg-amber-50 text-amber-700', ORDERED: 'bg-emerald-50 text-emerald-700', EXPIRED: 'bg-neutral-100 text-neutral-500', CANCELLED: 'bg-neutral-100 text-neutral-500' } as const;

/**
 * The instant checkout links made from the dashboard or the extension: opened how often, ordered or not.
 * Shown on Orders > Checkout links and the Extension page's "Checkout links" tab.
 */
export function InstantLinksList({ title = 'Instant checkout links', autoOpen = false }: { title?: string; autoOpen?: boolean }) {
  const queryClient = useQueryClient();
  const canCreate = useCan('orders.create');
  const [page, setPage] = useState(1);
  const [making, setMaking] = useState(autoOpen && canCreate);
  const { data } = useQuery({ queryKey: ['instant-links', page], queryFn: () => instantCheckoutApi.list(page) });
  const cancel = useMutation({
    mutationFn: instantCheckoutApi.cancel,
    onSuccess: () => {
      toast.success('The link is cancelled.');
      void queryClient.invalidateQueries({ queryKey: ['instant-links'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel it.')),
  });
  return (
    <PageSection>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold text-regantify-text">
          <Zap size={16} aria-hidden /> {title}
        </h2>
        {canCreate && (
          <button type="button" className={primaryBtn} onClick={() => setMaking(true)}>
            New link
          </button>
        )}
      </div>
      {!data?.items.length ? (
        <p className="py-4 text-center text-sm text-neutral-500">No links yet. Make one here, from a saved chat, or with the extension inside a chat.</p>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {data.items.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_CLASS[l.state]}`}>{STATE_LABEL[l.state]}</span>
                <span className="font-medium text-regantify-text">{l.customerName || 'No name'}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-500">{l.lines.map((x) => `${x.name} × ${x.quantity}`).join(', ')}</span>
                <span className="text-xs text-neutral-500">
                  opened {l.opens}× · {l.source === 'EXTENSION' ? 'from a chat' : 'dashboard'} · {formatDhakaDateTime(l.createdAt)}
                </span>
                {l.orderId ? (
                  <Link to={`/vendor/orders/${l.orderId}`} className="text-xs font-medium text-brand underline">
                    ORDER-{l.orderInvoice}
                  </Link>
                ) : l.state === 'OPEN' ? (
                  <>
                    {l.url && (
                      <button type="button" className="text-xs text-brand underline" onClick={() => navigator.clipboard.writeText(l.url!).then(() => toast.success('Link copied.'))}>
                        Copy link
                      </button>
                    )}
                    {canCreate && (
                      <button type="button" className="text-xs text-red-700 underline" onClick={() => cancel.mutate(l.id)} disabled={cancel.isPending}>
                        Cancel
                      </button>
                    )}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          <TableFooter page={data.page} perPage={data.perPage} total={data.total} onPageChange={setPage} />
        </>
      )}
      {making && <InstantCheckoutDialog open={making} onOpenChange={setMaking} />}
    </PageSection>
  );
}
