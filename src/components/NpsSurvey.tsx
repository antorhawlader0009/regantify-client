import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { helpApi } from '../lib/helpApi';
import { useViewer } from '../lib/useStaffAccess';
import { useAuthStore } from '../store/authStore';
import { Dialog } from './ui/Dialog';

/**
 * "How likely are you to recommend Regantify?" (super-admin-new.md Step 11). Asked to the owner at most once every 90 days, from the store's 15th day,
 * never in a "Login as store" session. Skipping counts as asked. Waits a minute after the dashboard opens so it never greets the owner at sign-in.
 */
export function NpsSurvey() {
  const qc = useQueryClient();
  const isOwner = useViewer().isOwner;
  const impersonated = useAuthStore((s) => s.impersonated);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60_000);
    return () => clearTimeout(t);
  }, []);
  const { data } = useQuery({ queryKey: ['nps-due'], queryFn: helpApi.npsDue, enabled: isOwner && !impersonated && ready, staleTime: 60 * 60_000 });
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [thanks, setThanks] = useState(false);
  const [closed, setClosed] = useState(false);

  const send = useMutation({
    mutationFn: (s: number | null) => helpApi.answerNps({ score: s, reason: s === null ? undefined : reason.trim() || undefined }),
    onSettled: (_r, _e, s) => {
      qc.setQueryData(['nps-due'], { due: false });
      if (s === null) setClosed(true);
      else setThanks(true);
    },
  });

  if (!data?.due || closed) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && (thanks ? setClosed(true) : send.mutate(null))} title={thanks ? 'Thank you' : 'A quick question'} maxWidth="max-w-md">
      <div className="space-y-4 p-6 pt-3">
        {thanks ? (
          <>
            <p className="text-sm text-neutral-600">Thank you for telling us. Every answer is read by the team.</p>
            <button type="button" onClick={() => setClosed(true)} className="w-full rounded-lg bg-brand-lime py-2 text-sm font-medium text-regantify-text">
              Close
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600">How likely are you to recommend Regantify to another seller?</p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  aria-pressed={score === n}
                  className={`rounded-md border py-2 text-sm tabular-nums ${score === n ? 'border-regantify-text bg-regantify-text text-white' : 'border-line hover:bg-neutral-50'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            {score !== null && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder={score >= 9 ? 'What do you like most? (optional)' : 'What should we do better? (optional)'}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none"
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={send.isPending} onClick={() => send.mutate(null)} className="text-sm text-neutral-500 hover:text-neutral-700">
                Not now
              </button>
              <button type="button" disabled={score === null || send.isPending} onClick={() => send.mutate(score)} className="rounded-lg bg-brand-lime px-4 py-2 text-sm font-medium text-regantify-text disabled:opacity-50">
                {send.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
