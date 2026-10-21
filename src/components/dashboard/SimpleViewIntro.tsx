import { useState } from 'react';
import { Rows3, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardView } from '../../lib/useDashboardView';

const KEY = 'regantify.simpleViewIntro.';

function seen(userId: string): boolean {
  try {
    return localStorage.getItem(KEY + userId) === '1';
  } catch {
    return false;
  }
}

/**
 * A one-time note on the Dashboard for a person in Simple mode (new store owners start there): what it is and where the
 * switch is. Closed once, per person per browser; it never switches the view by itself.
 */
export function SimpleViewIntro() {
  const user = useAuthStore((s) => s.user);
  const impersonated = useAuthStore((s) => s.impersonated);
  const { isSimple, setView } = useDashboardView();
  const [closed, setClosed] = useState(() => (user ? seen(user.id) : true));
  if (!user || !isSimple || closed || impersonated) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY + user.id, '1');
    } catch {
      // storage blocked: it shows again next visit
    }
    setClosed(true);
  };

  return (
    <section className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-lime/60 text-brand">
        <Rows3 size={17} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-regantify-text">You are in Simple mode</p>
        <p className="mt-0.5 text-neutral-600">
          The dashboard shows what you need every day. More tools are one click away: press "Switch to Full mode" at the top any time.
          Search finds every page in both modes.
        </p>
        <button type="button" onClick={() => { close(); setView('FULL'); }} className="mt-2 text-sm font-medium text-brand hover:underline">
          Show me Full mode
        </button>
      </div>
      <button type="button" onClick={close} aria-label="Close" className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
        <X size={16} />
      </button>
    </section>
  );
}
