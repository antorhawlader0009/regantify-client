import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { giftCardsApi } from '../../../lib/giftCardsApi';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { toast } from '../../../lib/toast';
import { DateField, FormHeader, OfferSummary, UnitInput, taka } from './MarketingKit';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

/** Marketing > Gift Cards "+ Add New": the amount, an optional own code and expiry, and who it's for. */
export default function AddGiftCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = !saved && Boolean(amount || code || expiresAt || recipientName || recipientPhone || note);
  useUnsavedChangesWarning(dirty);

  const errors = {
    amount: !amount || Number(amount) < 1 ? 'Enter the card’s amount, at least ৳1.' : null,
    expiresAt: expiresAt && new Date(expiresAt) <= new Date() ? 'Pick a time in the future, or leave it empty.' : null,
    recipientPhone: recipientPhone.trim() && !normalizeBdPhone(recipientPhone) ? BD_PHONE_HINT : null,
  };
  const shown = (k: keyof typeof errors) => (submitted || (k !== 'amount' && (k === 'expiresAt' ? expiresAt : recipientPhone)) ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const saveMutation = useMutation({
    mutationFn: () =>
      giftCardsApi.create({
        amount: Number(amount),
        ...(code.trim() ? { code: code.trim() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
        ...(recipientPhone.trim() ? { recipientPhone: normalizeBdPhone(recipientPhone) ?? recipientPhone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (card) => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success(`Gift card ${card.code} added`);
      navigate(`/vendor/marketing/gift-cards/${card.id}`);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t add this gift card. Check your connection and try again.');
    },
  });

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) saveMutation.mutate();
      }}
    >
      <FormHeader backTo="/vendor/marketing/gift-cards" backLabel="Gift cards" title="New gift card" description="A prepaid balance the shopper spends at checkout with its code." />

      <div className="space-y-4">
        <SectionCard title="Card">
          <div className="space-y-4">
            <Field label="Amount" required error={shown('amount')} hint="Can’t be changed after the card is made.">
              <UnitInput unit="৳" value={amount} onChange={setAmount} placeholder="e.g. 1000" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className={`h-8 rounded-full border px-3 text-xs tabular-nums transition-colors ${
                      Number(amount) === n ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {taka(n)}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" hint="Leave empty and we make one, like K7QM-3XWD-9PTA.">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Optional" className={`${productInputClass} font-mono uppercase`} />
              </Field>
              <DateField label="Expires" value={expiresAt} onChange={setExpiresAt} role="end" optional error={shown('expiresAt')} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Who it’s for" description="Optional. Helps you find the card later.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={productInputClass} />
            </Field>
            <Field label="Phone" error={shown('recipientPhone')}>
              <input type="text" inputMode="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(toLatinDigits(e.target.value))} placeholder="01XXXXXXXXX" className={productInputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note" hint="Only you see this.">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${productInputClass} resize-y`} />
              </Field>
            </div>
          </div>
        </SectionCard>
      </div>

      <SaveBar
        message={
          formError ? (
            <span className="text-red-600">{formError}</span>
          ) : submitted && !valid ? (
            <span className="text-red-600">Fix the fields marked in red.</span>
          ) : (
            <OfferSummary>
              {Number(amount) > 0
                ? `A ${taka(amount)} card${recipientName.trim() ? ` for ${recipientName.trim()}` : ''}, spent at checkout until it runs out${expiresAt ? ' or expires' : ''}.`
                : 'Enter the amount to make the card.'}
            </OfferSummary>
          )
        }
      >
        <Link to="/vendor/marketing/gift-cards" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Adding…' : 'Add gift card'}
        </button>
      </SaveBar>
    </form>
  );
}
