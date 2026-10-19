import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApplyAdminTheme } from './useAdminTheme';

/**
 * The Super Admin sign-in frame: a dark rail-coloured panel on the left that says what this place is, the form on the right. It switches the
 * console colours on (the same body class and light/dark choice the panel uses), so the form's inputs and buttons pick them up without edits. Only true statements go on the
 * panel: they describe what the console really does.
 */
export function ConsoleAuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('admin-panel');
    return () => document.body.classList.remove('admin-panel');
  }, []);
  useApplyAdminTheme();
  return (
    <div className="grid min-h-screen bg-regantify-content lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-regantify-topbar p-10 text-[var(--console-rail-text)] lg:flex">
        <Link to="/" className="flex items-baseline gap-1.5" aria-label="Regantify home">
          <span className="bg-[image:var(--console-accent-gradient)] bg-clip-text text-[28px] font-bold leading-none tracking-tight text-transparent">regantify</span>
          <span className="text-[12px] font-medium text-[var(--console-rail-muted)]">console</span>
        </Link>
        <div className="max-w-sm">
          <p className="text-[26px] font-medium leading-snug text-white">The operations desk for stores, money and support.</p>
          <ul className="mt-8 space-y-4 text-[14px] leading-relaxed">
            <li className="border-l-2 border-[var(--console-brass)] pl-3.5">Every account signs in in two steps, with an authenticator app.</li>
            <li className="border-l-2 border-[var(--console-rail-line)] pl-3.5">Every change is written to the activity log: who, what and why.</li>
            <li className="border-l-2 border-[var(--console-rail-line)] pl-3.5">Money and shopper data are only touched with a reason.</li>
          </ul>
        </div>
        <p className="text-xs text-[var(--console-rail-muted)]">A sign-in from a new device is texted to the platform alert phone.</p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-regantify-text-muted hover:text-regantify-text">
          <ArrowLeft size={14} /> Regantify home
        </Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[22px] font-semibold tracking-tight text-regantify-text">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[14px] text-regantify-text-muted">{subtitle}</p>}
          <div className="mt-7 rounded-2xl bg-white p-6 shadow-[var(--console-card-shadow)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
