import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

// Orders page > "Needs attention" (tracking-plan.md Step 8): parcels with a failed delivery attempt,
// no courier movement for the store's limit, past the date promised to the customer, or coming back.
// They arrive on their own (the server raises them), and close on their own when the parcel moves on or
// the order finishes; "Dismiss" is for the vendor saying they have dealt with it.

interface AttentionItem {
  id: string;
  reason: 'DELIVERY_FAILED' | 'STALLED' | 'LATE' | 'RETURNING';
  title: string;
  note: string;
  createdAt: string;
  order: { id: string; ref: string; invoiceNumber: number; customerName: string; customerPhone: string; status: string };
}

const attentionApi = {
  list: () => api.get<{ count: number; items: AttentionItem[] }>('/v1/courier/attention').then((r) => r.data),
  dismiss: (id: string) => api.post(`/v1/courier/attention/${id}/dismiss`).then((r) => r.data),
};

const QUERY_KEY = ['order-attention'];

export function NeedsAttention() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: QUERY_KEY, queryFn: attentionApi.list, refetchInterval: 5 * 60_000 });

  const dismiss = useMutation({
    mutationFn: (id: string) => attentionApi.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update this item.')),
  });

  if (!data || data.count === 0) return null;

  return (
    <section className="mb-3 rounded-xl border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-amber-900"
      >
        <AlertTriangle size={16} className="shrink-0" />
        <span className="mr-auto">
          Needs attention <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs">{data.count}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul className="divide-y divide-amber-200 border-t border-amber-200">
          {data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-2 px-3.5 py-2.5 text-sm">
              <div className="mr-auto min-w-0">
                <p className="font-medium text-amber-950">
                  {item.title}:{' '}
                  <Link to={`/vendor/orders/${item.order.id}`} className="underline hover:no-underline">
                    {item.order.ref}
                  </Link>
                </p>
                <p className="text-xs text-amber-900/80">
                  {item.order.customerName} · {item.order.customerPhone}
                </p>
                <p className="mt-0.5 text-xs text-amber-900/80">{item.note}</p>
              </div>
              <button
                type="button"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate(item.id)}
                title="I have dealt with this"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                <X size={12} />
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
