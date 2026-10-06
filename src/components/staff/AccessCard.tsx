import { LayoutGrid } from 'lucide-react';
import { accessAreas, type StaffPermission } from '../../lib/staffPermissions';

/** The limits worth saying out loud, in the order they matter to an owner. */
const NOTABLE_LIMITS: ReadonlyArray<readonly [StaffPermission, string]> = [
  ['orders.cancel_refund', 'cancel or refund orders'],
  ['products.cost', 'see cost and profit'],
  ['customers.contact', 'see full customer phone numbers'],
  ['products.price', 'change prices'],
  ['customers.export', 'export customers'],
  ['finance.view', 'see the wallet'],
  ['store.settings', 'change store settings'],
  ['store.design', 'change the store design'],
];

/**
 * "Dashboard access" (rule-plan.md 5.8): the parts of the dashboard a role
 * opens, as chips, plus the few things it can't do that an owner would want
 * to know before saving.
 */
export function AccessCard({ permissions, emptyHint = 'Nothing yet. Tick what they can do below.' }: { permissions: readonly StaffPermission[]; emptyHint?: string }) {
  const areas = accessAreas(permissions);
  const cant = NOTABLE_LIMITS.filter(([p]) => !permissions.includes(p))
    .map(([, words]) => words)
    .slice(0, 4);

  return (
    <div className="rounded-xl border border-brand/25 bg-brand/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutGrid size={17} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-regantify-text">Dashboard access</p>
          <p className="text-xs text-neutral-500">What they can open in your dashboard.</p>
        </div>
      </div>
      {areas.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Parts of the dashboard they can open">
          {areas.map((a) => (
            <li key={a.key} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-regantify-text">
              {a.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">{emptyHint}</p>
      )}
      {areas.length > 0 && cant.length > 0 && <p className="mt-3 text-xs text-neutral-600">Can’t {cant.join(', ')}.</p>}
      <p className="mt-1 text-xs text-neutral-500">Staff, billing and withdrawals always stay with you.</p>
    </div>
  );
}
