import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PhoneCall } from 'lucide-react';
import { lmsApi, type LmsOrderCall } from '../../lib/lmsApi';

/** "confirmed by Rahim, 2 tries" / "waiting for a call, Karim's" / "cancelled by Rahim (Not reachable), 3 tries". */
function callWords(call: LmsOrderCall): string {
  const tries = call.attempts ? `, ${call.attempts} ${call.attempts === 1 ? 'try' : 'tries'}` : '';
  if (call.stage === 'WON') return `confirmed${call.closedBy ? ` by ${call.closedBy}` : ''}${tries}`;
  if (call.stage === 'LOST') return `cancelled${call.closedBy ? ` by ${call.closedBy}` : ''}${call.lostReason ? ` (${call.lostReason})` : ''}${tries}`;
  return `${call.stageLabel.toLowerCase()}${call.agent ? `, ${call.agent}'s lead` : ', nobody on it yet'}${tries}`;
}

/**
 * Order detail's "Call" line (LMS-plan.md Step 14): the order's
 * confirmation call from its LMS lead, with a link to the lead. Shows
 * nothing when the store doesn't use the LMS or the order has no lead.
 */
export function OrderCallLine({ orderId }: { orderId: string }) {
  const call = useQuery({
    queryKey: ['lms', 'order-call', orderId],
    queryFn: () => lmsApi.callForOrder(orderId),
    retry: false,
    staleTime: 30_000,
  });
  if (!call.data) return null;
  const path = `/vendor/lms/leads?lead=${call.data.leadId}`;
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-regantify-text-muted">
      <PhoneCall size={13} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        <span className="font-medium text-regantify-text">Call:</span> {callWords(call.data)}.{' '}
        <Link
          to={path}
          className="underline hover:text-regantify-text"
        >
          Open in LMS
        </Link>
      </span>
    </p>
  );
}
