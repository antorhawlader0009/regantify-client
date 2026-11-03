import { AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dailyCapMessage, type DailyCaps, type DailyKind } from '../lib/dailyLimits';

/** The "Unlimited" mark used wherever products, orders or image uploads are mentioned (the daily cap is never shown). */
export function UnlimitedBadge({ label = 'Unlimited' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <InfinityIcon size={13} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Red notice for a daily cap that is close (5 or fewer left) or used up. Renders nothing otherwise, so the cap stays out of
 * sight for nearly every store. `kinds` picks which caps this page cares about.
 */
export function DailyLimitBanner({ daily, kinds, className = '' }: { daily: DailyCaps | undefined; kinds: DailyKind[]; className?: string }) {
  if (!daily) return null;
  const lines = kinds.map((k) => dailyCapMessage(k, daily[k])).filter((m): m is string => m !== null);
  if (lines.length === 0) return null;
  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-lg border border-red-700 bg-red-600 text-white p-3 text-sm ${className}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-white" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <Link to="/vendor/support" className="shrink-0 rounded-md border border-white bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
        Talk to support
      </Link>
    </div>
  );
}
