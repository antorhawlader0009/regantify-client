import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { adminTeamApi } from '../../lib/adminTeamApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/** A team member changes their own password (the first one the Owner gave is temporary). Settings > Security. */
export function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const m = useMutation({
    mutationFn: () => adminTeamApi.changeOwnPassword(current, next),
    onSuccess: () => {
      toast.success('Password changed.');
      setCurrent('');
      setNext('');
      setAgain('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the password.')),
  });
  const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
  const ok = current.length > 0 && next.length >= 8 && next === again;
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6">
      <div className="flex items-start gap-3">
        <KeyRound size={20} className="mt-0.5 text-regantify-text-muted" />
        <div className="flex-1 space-y-3">
          <p className="text-sm font-semibold text-regantify-text">Change your password</p>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" className={field} />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (at least 8 characters)" autoComplete="new-password" className={field} />
          <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="New password again" autoComplete="new-password" className={field} />
          {again.length > 0 && next !== again && <p className="text-xs text-red-600">The two new passwords don’t match.</p>}
          <button type="button" disabled={!ok || m.isPending} onClick={() => m.mutate()} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </div>
    </section>
  );
}
