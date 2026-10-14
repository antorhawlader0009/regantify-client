import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../lib/api';
import { CHURN_REASONS, churnApi, REASON_LABEL, type ChurnOfferShown, type ChurnReason } from '../lib/churnApi';
import { useViewer } from '../lib/useStaffAccess';
import { toast } from '../lib/toast';
import { useAuthStore } from '../store/authStore';
import { Dialog } from './ui/Dialog';

/**
 * After a store loses or cuts its paid plan (super-admin-new.md Step 5), the owner is asked once why, and sees one offer that fits the
 * answer. Owner only, never in a "Login as store" session (the team must not answer for the store).
 */
export function ChurnSurvey() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isOwner = useViewer().isOwner;
  const impersonated = useAuthStore((s) => s.impersonated);
  const { data } = useQuery({ queryKey: ['churn-pending'], queryFn: churnApi.pending, enabled: isOwner && !impersonated, staleTime: 10 * 60_000 });
  const event = data?.event ?? null;
  const [reason, setReason] = useState<ChurnReason | null>(null);
  const [note, setNote] = useState('');
  const [offer, setOffer] = useState<ChurnOfferShown | null>(null);
  const [closed, setClosed] = useState(false);

  const done = () => {
    setClosed(true);
    qc.setQueryData(['churn-pending'], { event: null });
  };
  const answer = useMutation({
    mutationFn: (r: ChurnReason | 'SKIPPED') => churnApi.answer(event!.id, { reason: r, note: note.trim() || undefined }),
    onSuccess: (res) => {
      if (res.offer) setOffer(res.offer);
      else done();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send that. Please try again.')),
  });
  const accept = useMutation({
    mutationFn: () => churnApi.accept(event!.id),
    onSuccess: (res) => {
      done();
      if (res.promoCode) navigate(`/vendor/billing?promo=${encodeURIComponent(res.promoCode)}`);
      else if (res.days) {
        toast.success(`${res.plan ?? 'Your plan'} is back for ${res.days} days, on us.`);
        qc.invalidateQueries();
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not take the offer.')),
  });

  if (!event || closed) return null;
  const lost = event.kind === 'LAPSED';

  return (
    <Dialog open onOpenChange={(o) => !o && (offer ? done() : answer.mutate('SKIPPED'))} title={offer ? 'Thank you' : lost ? `Your ${event.fromPlan} plan has ended` : `You moved off ${event.fromPlan}`} maxWidth="max-w-md">
      <div className="space-y-4 p-6 pt-3">
        {!offer ? (
          <>
            <p className="text-sm text-neutral-600">One quick question, so we can do better: what is the main reason?</p>
            <div className="space-y-1.5">
              {CHURN_REASONS.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${reason === r ? 'border-regantify-cta bg-regantify-cta/5' : 'border-line hover:bg-neutral-50'}`}>
                  <input type="radio" name="churn-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-regantify-cta" />
                  {REASON_LABEL[r]}
                </label>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Anything else? (optional)" className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none" />
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={answer.isPending} onClick={() => answer.mutate('SKIPPED')} className="text-sm text-neutral-500 hover:text-neutral-700">
                Skip
              </button>
              <button type="button" disabled={!reason || answer.isPending} onClick={() => reason && answer.mutate(reason)} className="rounded-lg bg-brand-lime px-4 py-2 text-sm font-medium text-regantify-text disabled:opacity-50">
                {answer.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-regantify-text">{offer.message}</p>
            {offer.type === 'PROMO' && offer.promoCode && (
              <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                Your code: <span className="font-mono font-semibold">{offer.promoCode}</span>
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={done} className="text-sm text-neutral-500 hover:text-neutral-700">
                {offer.type === 'MESSAGE' ? 'Close' : 'No, thanks'}
              </button>
              {offer.type !== 'MESSAGE' && (
                <button type="button" disabled={accept.isPending} onClick={() => accept.mutate()} className="rounded-lg bg-brand-lime px-4 py-2 text-sm font-medium text-regantify-text disabled:opacity-50">
                  {accept.isPending ? 'Working...' : offer.type === 'PROMO' ? 'Use the code on Billing' : `Get ${offer.days} free days`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
