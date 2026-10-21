import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { accountApi } from '../lib/accountApi';
import { useAuthStore } from '../store/authStore';
import { Eye, Pin, PinOff } from 'lucide-react';
import { fullViewPageOf, useSimpleViewKeeps } from '../lib/simpleView';
import { useDashboardView } from '../lib/useDashboardView';

/**
 * In Simple mode, a Full mode page opened from a link, a bookmark or search still opens (hide, never block), with this
 * thin bar on top saying so (SIMPLE-VIEW-plan.md Step 3). The person can add the page to their menu or switch views.
 */
export function FullViewPageBar() {
  const { pathname } = useLocation();
  const { isSimple, setView, pins, togglePin } = useDashboardView();
  const keeps = useSimpleViewKeeps();
  const impersonated = useAuthStore((s) => s.impersonated);
  const page = isSimple ? fullViewPageOf(pathname) : null;
  const pinned = !!page && pins.includes(page);
  const inUse = !!page && !pinned && keeps.includes(page);

  // Count "a Full mode page opened in Simple mode" once per page per browser session (Super Admin, Step 12).
  useEffect(() => {
    if (!page || pinned || inUse || impersonated) return;
    try {
      const key = `regantify.hiddenPageSeen.${page}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // storage blocked: count it anyway
    }
    accountApi.viewStat('HIDDEN_PAGE', page);
  }, [page, pinned, inUse, impersonated]);

  if (!page) return null;
  // In use (LMS/POS in the plan): it is part of this person's Simple mode already.
  if (inUse) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-dashed border-line bg-white px-3 py-2 text-sm text-neutral-600">
      <Eye size={15} className="shrink-0 text-neutral-400" />
      <p className="min-w-0 flex-1">{pinned ? 'This Full mode page is in your menu.' : 'This tool is part of Full mode.'}</p>
      <button type="button" onClick={() => togglePin(page)} className="inline-flex shrink-0 items-center gap-1.5 font-medium text-brand hover:underline">
        {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        {pinned ? 'Remove from my menu' : 'Add to my menu'}
      </button>
      {!pinned && (
        <button type="button" onClick={() => setView('FULL', page)} className="shrink-0 font-medium text-brand hover:underline">
          Switch to Full mode
        </button>
      )}
    </div>
  );
}
