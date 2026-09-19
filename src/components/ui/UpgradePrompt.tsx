import { Lock } from 'lucide-react';
import { toast } from '../../lib/toast';

/**
 * Shared "you're locked out of this by your plan" UX — PLAN.md Step 16.
 * Consolidates what Steps 7/8/10/11/12 each built ad hoc (a locked
 * overlay on Themes.tsx, an upgrade card replacing Domain.tsx's connect
 * form, a locked Add Staff button, a locked courier option, a locked
 * Payment Gateway toggle) into one shared visual language + one shared
 * toast message, instead of N slightly different implementations.
 * Cleanup/consistency pass — every call site's actual gating behavior
 * (which server call runs, what triggers "locked") is unchanged.
 *
 * Three shapes, matching the three ways a lock has shown up across
 * Steps 7-12: a full block replacing a form/section
 * (LockedFeatureCard), a small inline marker on a button/menu item
 * (LockedBadge), and the toast shown when a locked action is attempted
 * anyway (upgradeToast). There's no single one-size-fits-all component
 * because the real UI contexts genuinely differ (a whole page section
 * vs. one dropdown item) — "consistent" here means the same lock icon,
 * the same amber/muted color language, and the same toast wording
 * everywhere, not one component forced into every layout.
 */

/** Standard toast shown when a locked action is attempted (a locked button that's still clickable, e.g. Themes.tsx/Orders.tsx courier picker). Centralized so the wording is identical everywhere instead of N slightly different phrasings. */
export function upgradeToast(featureLabel: string) {
  toast.error(`Upgrade your plan to ${featureLabel}.`);
}

/**
 * Full-width card that replaces a form/section when the current plan
 * doesn't allow a feature at all — same shape Domain.tsx (Step 8) and
 * Settings.tsx's Payment Gateway section (Step 12) each built
 * separately. `action`, when given, renders a button (e.g. "Request
 * Setup" style calls-to-action still route through their own real
 * logic — this component only renders the shell).
 */
export function LockedFeatureCard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 flex items-start gap-3">
      <Lock size={18} className="text-amber-700 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 mb-1">{title}</p>
        <p className="text-sm text-amber-800">{message}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-sm font-medium
            hover:bg-amber-100 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Small inline lock icon — for a button/dropdown item/card overlay that stays visible-but-locked rather than hidden (see e.g. Themes.tsx, Orders.tsx's Pathao option, Staff.tsx's Add New). Sizing matches the surrounding text via `size`; `className` overrides the default muted color for a badge sitting on a non-default background (e.g. Themes.tsx's dark overlay wants white, not muted-gray). */
export function LockedBadge({ size = 12, className = 'text-regantify-text-muted' }: { size?: number; className?: string }) {
  return <Lock size={size} className={`shrink-0 ${className}`} />;
}

/** "X / N used" line with amber highlight at the cap — same shape Staff.tsx (Step 10) built for its own usage line. `null` limit renders "∞" (unlimited), never treated as "at the limit". */
export function UsageLine({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const atLimit = limit !== null && used >= limit;
  return (
    <p className="text-sm text-regantify-text-muted">
      {used} / {limit ?? '∞'} {label}
      {atLimit && <span className="text-amber-600"> — upgrade your plan to add more</span>}
    </p>
  );
}
