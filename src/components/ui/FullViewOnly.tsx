import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDashboardView } from '../../lib/useDashboardView';

/**
 * Shows its children only in Full mode (SIMPLE-VIEW-plan.md). Hiding is view only: a setting behind it keeps its saved
 * value and keeps working in Simple mode, so never wrap a form field whose value would be lost when it isn't rendered.
 */
export function FullViewOnly({ children }: { children: ReactNode }) {
  const { isSimple } = useDashboardView();
  return isSimple ? null : <>{children}</>;
}

/** The opposite: only in Simple mode (e.g. a tool moved out of a "More options" row there). */
export function SimpleViewOnly({ children }: { children: ReactNode }) {
  const { isSimple } = useDashboardView();
  return isSimple ? <>{children}</> : null;
}

/** Under a list of pages trimmed in Simple mode (a hub, Settings > More settings): "3 more in Full mode. Show them". */
export function MoreInFullView({ count, className = '' }: { count: number; className?: string }) {
  const { isSimple, setView } = useDashboardView();
  const { pathname } = useLocation();
  if (!isSimple || count <= 0) return null;
  return (
    <p className={`text-sm text-neutral-500 ${className}`}>
      {count} more in Full mode.{' '}
      <button type="button" onClick={() => setView('FULL', pathname)} className="font-medium text-brand hover:underline">
        Switch to Full mode
      </button>
    </p>
  );
}

/**
 * Rule 3 of the plan: in Simple mode, where hidden options already hold a value, say so instead of hiding them silently.
 * Renders nothing in Full mode or when nothing hidden is in use.
 */
export function InUseNote({ count, names, className = '' }: { count: number; names?: string; className?: string }) {
  const { isSimple, setView } = useDashboardView();
  const { pathname } = useLocation();
  if (!isSimple || count <= 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-500 ${className}`}>
      <Eye size={15} className="shrink-0 text-neutral-400" />
      <p className="min-w-0 flex-1">
        {count === 1 ? '1 more option is' : `${count} more options are`} in use here{names ? ` (${names})` : ''}. They keep working.
      </p>
      <button type="button" onClick={() => setView('FULL', pathname)} className="shrink-0 font-medium text-brand hover:underline">
        Switch to Full mode to change them
      </button>
    </div>
  );
}
