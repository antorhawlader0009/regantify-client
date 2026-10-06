import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../lib/authApi';
import { Dialog } from '../ui/Dialog';
import { primaryBtn } from '../ui/PageKit';

/**
 * The store owner's welcome note for a new staff member (rule-plan.md
 * Step 7), shown once: closing it tells the server, which stops sending it
 * until the owner writes a new one.
 */
export function WelcomeNote() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [dismissed, setDismissed] = useState(false);
  const note = user?.role === 'STAFF' ? user.welcomeMessage?.trim() : '';
  if (!note || dismissed) return null;

  const close = () => {
    setDismissed(true);
    if (accessToken && user) setAuth(accessToken, { ...user, welcomeMessage: null });
    authApi.welcomeSeen().catch(() => {}); // shown again next time if this didn't reach the server
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()} title="A note from the store owner" maxWidth="max-w-md">
      <div className="px-6 pb-6 pt-3">
        <p className="whitespace-pre-line text-sm leading-relaxed text-regantify-text">{note}</p>
        {user?.staffRoleName && <p className="mt-3 text-xs text-neutral-500">Your role: {user.staffRoleName}</p>}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={close} className={primaryBtn}>
            Got it
          </button>
        </div>
      </div>
    </Dialog>
  );
}
