import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { kycApi } from '../lib/kycApi';

/**
 * The strip on every dashboard page while Super Admin has asked this store to verify itself (TellMe idea 160). It says what is needed, by when and what
 * happens if it is not done. Nothing shows for a store with no request, which is nearly every store. Staff see it too and are sent to the owner.
 */
export function KycBanner() {
  const { data } = useQuery({ queryKey: ['kyc-me'], queryFn: kycApi.mine, refetchInterval: 5 * 60_000, staleTime: 60_000, retry: false });
  if (data?.storeStatus === 'PENDING') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <ShieldAlert size={16} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">Your store is being reviewed by the Regantify team. You can set it up now. Your store page and new orders open as soon as it is approved.</p>
      </div>
    );
  }
  if (!data || data.state === 'NONE' || data.state === 'APPROVED') return null;

  const late = data.restricted;
  let text: string;
  if (data.state === 'SUBMITTED') text = 'Your verification documents were sent. Super Admin is checking them. Withdrawals stay paused until they are approved.';
  else if (late) text = 'Your store is paused: the verification deadline passed, so new orders and new products are switched off. Send your documents to switch them back on.';
  else if (data.state === 'REJECTED') text = `Your documents were not accepted${data.rejectReason ? `: ${data.rejectReason}` : ''}. Please send them again by ${data.dueDay}.`;
  else text = `Please verify your store by ${data.dueDay}${typeof data.daysLeft === 'number' ? ` (${Math.max(0, data.daysLeft)} ${data.daysLeft === 1 ? 'day' : 'days'} left)` : ''}. After that date new orders and new products are switched off.`;

  const calm = data.state === 'SUBMITTED';
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm ${late ? 'border-red-300 bg-red-50 text-red-800' : calm ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
      <ShieldAlert size={16} className="shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      <Link to="/vendor/verification" className="shrink-0 font-medium underline underline-offset-2">
        {data.state === 'SUBMITTED' ? 'See status' : 'Open Verification'}
      </Link>
    </div>
  );
}
