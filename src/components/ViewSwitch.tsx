import { useEffect, useState } from 'react';
import { LayoutGrid, Loader2, Rows3 } from 'lucide-react';
import { switchedMessage, takeSwitchedMode, useDashboardView } from '../lib/useDashboardView';
import { toast } from '../lib/toast';
import { useAssistantUi } from '../store/assistantStore';

/**
 * The top-bar button that switches between Simple mode and Full mode (SIMPLE-VIEW-plan.md). It always says what the
 * click will do ("Switch to Full mode" while in Simple mode, and the other way round), and each direction has its own
 * colour so it stands apart from the plain top-bar buttons (the user's rule, 2026-10-21): green to go Simple, violet
 * to go Full. A click saves the choice and reloads the whole page, so the dashboard visibly starts again in the new
 * mode; the "mode is on" toast is shown after the reload. Icon only on a phone. It never changes a setting.
 */
export function ViewSwitch() {
  const { isSimple, setView, inDashboard } = useDashboardView();
  const [switching, setSwitching] = useState(false);
  // The full label needs room: shown from wide screens up, and never while the Ask AI panel takes part of the width
  // (the top bar would otherwise run past its edge). Otherwise the coloured icon alone, with the label as its tooltip.
  const assistantOpen = useAssistantUi((s) => s.open);
  const showLabel = !assistantOpen;

  // Right after the reload that a switch caused: say which mode is on now.
  useEffect(() => {
    const mode = takeSwitchedMode();
    if (mode) toast.info(switchedMessage(mode));
  }, []);

  if (!inDashboard) return null;
  const label = isSimple ? 'Switch to Full mode' : 'Switch to Simple mode';
  const Icon = switching ? Loader2 : isSimple ? LayoutGrid : Rows3;
  const colors = isSimple
    ? 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:border-violet-700'
    : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700';

  const onClick = async () => {
    setSwitching(true);
    await setView(isSimple ? 'FULL' : 'SIMPLE');
    // Still here = the switch failed, or "Login as store" switched in place without a reload.
    setSwitching(false);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={switching}
      title={`You are in ${isSimple ? 'Simple' : 'Full'} mode. ${isSimple ? 'Show every page and option.' : 'Show only what you need every day.'} Nothing is deleted or switched off.`}
      aria-label={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border text-sm font-medium shadow-sm transition active:scale-95 disabled:opacity-80 ${showLabel ? 'xl:w-auto xl:px-4' : ''} ${colors}`}
    >
      <Icon size={15} className={switching ? 'animate-spin' : undefined} />
      <span className={showLabel ? 'hidden xl:inline' : 'hidden'}>{switching ? 'Switching…' : label}</span>
    </button>
  );
}
