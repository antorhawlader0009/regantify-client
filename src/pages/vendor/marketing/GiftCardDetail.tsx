import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Gift, Trash2 } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { ToggleRow } from '../../../components/product/ProductFormKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/PageKit';
import { giftCardsApi, giftCardStatus } from '../../../lib/giftCardsApi';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { DateField, UnitInput, copyText, taka, toLocalInput } from './MarketingKit';

const errorMessage = (err: any, fallback: string): string => {
  const message = err?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? fallback;
};

/**
 * One gift card: its balance, "Use balance" to record a use by hand
 * (e.g. in the shop), the details you can still change (expiry,
 * recipient, note, on/off), and every use, newest first.
 */
export default function GiftCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ['gift-cards', id],
    queryFn: () => giftCardsApi.findOne(id!),
    retry: false,
  });

  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemNote, setRedeemNote] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // One-time fill once the saved card arrives.
  useEffect(() => {
    if (!card) return;
    setExpiresAt(toLocalInput(card.expiresAt));
    setRecipientName(card.recipientName ?? '');
    setRecipientPhone(card.recipientPhone ?? '');
    setNote(card.note ?? '');
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!savedNote) return;
    const t = window.setTimeout(() => setSavedNote(false), 2500);
    return () => window.clearTimeout(t);
  }, [savedNote]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['gift-cards'] });

  const redeemMutation = useMutation({
    mutationFn: () => giftCardsApi.redeem(id!, { amount: Number(redeemAmount), ...(redeemNote.trim() ? { note: redeemNote.trim() } : {}) }),
    onSuccess: () => {
      toast.success(`${taka(redeemAmount)} used from the card`);
      setRedeemAmount('');
      setRedeemNote('');
      setRedeemError(null);
      refresh();
    },
    onError: (err) => setRedeemError(errorMessage(err, 'Couldn’t use the balance. Try again in a minute.')),
  });

  const phoneError = recipientPhone.trim() && !normalizeBdPhone(recipientPhone) ? BD_PHONE_HINT : null;
  const saveMutation = useMutation({
    mutationFn: () =>
      giftCardsApi.update(id!, {
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        recipientName: recipientName.trim() || null,
        recipientPhone: recipientPhone.trim() ? normalizeBdPhone(recipientPhone) ?? recipientPhone.trim() : null,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      refresh();
      setSavedNote(true);
    },
    onError: (err) => toast.error(errorMessage(err, 'Couldn’t save the details. Try again in a minute.')),
  });

  const activeMutation = useMutation({
    mutationFn: (active: boolean) => giftCardsApi.update(id!, { active }),
    onSuccess: (_, active) => {
      refresh();
      toast.success(active ? 'Gift card turned on' : 'Gift card turned off');
    },
    onError: () => toast.error('Couldn’t change this gift card. Try again in a minute.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => giftCardsApi.remove(id!),
    onSuccess: () => {
      refresh();
      toast.success('Gift card deleted');
      navigate('/vendor/marketing/gift-cards');
    },
    onError: (err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err, 'Couldn’t delete this gift card. Try again in a minute.'));
    },
  });

  const back = (
    <Link to="/vendor/marketing/gift-cards" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
      <ChevronLeft size={16} aria-hidden />
      Gift cards
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        {back}
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }
  if (!card) {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <section className="rounded-xl border border-line bg-white">
          <EmptyState icon={Gift} title="This gift card isn’t in your store" hint="It may have been deleted, or the link has a typo." />
        </section>
      </div>
    );
  }

  const status = giftCardStatus(card);
  const usages = card.usages ?? [];
  const canRedeem = status.label === 'Active';
  const left = Number(card.balance);
  const issued = Number(card.initialAmount);
  const redeemValue = Number(redeemAmount);
  const redeemCheck = !redeemAmount ? null : redeemValue <= 0 ? 'Enter an amount like 200.' : redeemValue > left ? `The card only has ${taka(left)} left.` : null;

  return (
    <div className="mx-auto max-w-3xl">
      {back}

      <section className="rounded-xl bg-brand p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => copyText(card.code, 'Code')} className="inline-flex items-center gap-2 font-mono text-lg font-semibold" title="Copy code">
            {card.code}
            <Copy size={15} className="text-white/70" aria-hidden />
          </button>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-medium">{status.label}</span>
        </div>
        <p className="mt-3 text-sm text-white/75">Balance left</p>
        <p className="text-3xl font-semibold tabular-nums">{taka(left)}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20" aria-hidden>
          <div className="h-full rounded-full bg-brand-lime" style={{ width: `${issued > 0 ? Math.min(100, (left / issued) * 100) : 0}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-white/75">
          Made for {taka(issued)} · {taka(issued - left)} used{card.expiresAt ? ` · expires ${formatDhakaDateTime(card.expiresAt)}` : ''}
        </p>
      </section>

      <div className="mt-4 space-y-4">
        <SectionCard title="Use balance" description="For a use outside the online store, e.g. in your shop. Online checkout takes it by itself.">
          {canRedeem ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!redeemAmount) {
                  setRedeemError('Enter how much to use.');
                  return;
                }
                if (redeemCheck) {
                  setRedeemError(redeemCheck);
                  return;
                }
                redeemMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount" error={redeemError ?? redeemCheck}>
                  <UnitInput unit="৳" value={redeemAmount} onChange={(v) => {
                      setRedeemAmount(v);
                      setRedeemError(null);
                    }} placeholder={`Up to ${left}`} />
                  <button type="button" onClick={() => setRedeemAmount(String(left))} className="mt-1.5 text-xs font-medium text-brand hover:underline">
                    Use all ({taka(left)})
                  </button>
                </Field>
                <Field label="Note" hint="E.g. the bill it was used on.">
                  <input type="text" value={redeemNote} onChange={(e) => setRedeemNote(e.target.value)} className={productInputClass} />
                </Field>
              </div>
              <button
                type="submit"
                disabled={redeemMutation.isPending}
                className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {redeemMutation.isPending ? 'Saving…' : redeemValue > 0 && !redeemCheck ? `Use ${taka(redeemValue)}` : 'Use balance'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-neutral-600">This card is {status.label.toLowerCase()}, so its balance can’t be used.</p>
          )}
        </SectionCard>

        <SectionCard title="Details">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!phoneError) saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <ToggleRow
              checked={card.active}
              onChange={(v) => activeMutation.mutate(v)}
              label="On"
              hint="Turn off to stop it being used, without deleting it."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label="Expires" value={expiresAt} onChange={setExpiresAt} role="end" optional />
              <Field label="For (name)">
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={productInputClass} />
              </Field>
              <Field label="For (phone)" error={phoneError}>
                <input type="text" inputMode="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(toLatinDigits(e.target.value))} placeholder="01XXXXXXXXX" className={productInputClass} />
              </Field>
              <Field label="Note" hint="Only you see this.">
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={productInputClass} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save details'}
              </button>
              {savedNote && <span className="animate-pop-in text-sm text-emerald-600">Saved</span>}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Uses" description="Newest first.">
          {usages.length === 0 ? (
            <p className="text-sm text-neutral-500">Not used yet.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {usages.map((u) => (
                <li key={u.id} className="flex items-start justify-between gap-4 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-regantify-text">{u.note || 'Used'}</p>
                    <p className="text-xs text-neutral-500">{formatDhakaDateTime(u.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-regantify-text">−{taka(u.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {usages.length === 0 && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} aria-hidden />
            Delete gift card
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete gift card ${card.code}?`}
        message="The code stops working right away. This can’t be undone."
        confirmLabel="Delete gift card"
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        danger
      />
    </div>
  );
}
