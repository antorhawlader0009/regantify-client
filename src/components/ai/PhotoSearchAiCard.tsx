import { AlertTriangle } from 'lucide-react';
import { useDesignSettings } from '../../pages/vendor/store/design/designShared';
import { useViewer } from '../../lib/useStaffAccess';
import { canAccess } from '../../lib/staffPermissions';

/**
 * AI Usages > "AI photo search" (StoreDesignSettings.photoSearchAi, off by default): when a shopper searches the store
 * with a photo and the free picture match finds nothing, the AI looks at the photo and picks the matching product. If
 * the AI finds nothing either, the shopper sees related products and is told this exact one isn't in the store.
 * Every AI look is paid from the store's AI Credits, which the card says plainly (the user's rule, 2026-10-27).
 */
export function PhotoSearchAiCard({ className }: { className: string }) {
  const viewer = useViewer();
  const { settings, save } = useDesignSettings();
  if (!canAccess(viewer, 'store.design') || !settings) return null;
  const on = settings.photoSearchAi;

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-regantify-text">AI photo search</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            When a shopper searches your store with a photo and the free picture match finds nothing, the AI looks at the photo and finds
            the product. If it can't find it either, the shopper sees similar products.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="AI photo search"
          disabled={save.isPending}
          onClick={() => save.mutate({ photoSearchAi: !on })}
          className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-60 ${on ? 'bg-regantify-cta' : 'bg-black/15'}`}
        >
          <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
        <span>
          Turning this on uses more AI Credits: each photo the free match can't find costs credits for the AI look (the same photo again
          is free for a day). The free picture match always runs first and costs nothing.
        </span>
      </p>
    </section>
  );
}
