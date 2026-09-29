import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { giftCardsApi } from '../../../lib/giftCardsApi';
import { toast } from '../../../lib/toast';

/** Marketing > Gift Cards "+ Add New": amount, optional code/expiry/recipient/note. */
export default function AddGiftCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      giftCardsApi.create({
        amount: Number(amount),
        ...(code.trim() ? { code: code.trim() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
        ...(recipientPhone.trim() ? { recipientPhone: recipientPhone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success('Gift card created.');
      navigate(`/vendor/marketing/gift-cards/${card.id}`);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError(
        (Array.isArray(message) ? message[0] : message) ?? 'Could not create this gift card. Please try again.',
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!amount.trim() || Number(amount) < 1) {
      setFormError('Enter the gift card amount.');
      return;
    }
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setFormError('The expiry date must be in the future.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/marketing/gift-cards')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Gift Cards
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">New Gift Card</h1>

      <div className="space-y-6">
        <SectionCard title="Gift Card">
          <div className="space-y-5">
            <Field label="Amount (৳)" required hint="Can’t be changed after the card is created.">
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                className={inputClass}
              />
            </Field>
            <Field label="Code" hint="Leave blank to generate one, e.g. K7QM-3XWD-9PTA.">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Custom code (optional)"
                className={`${inputClass} font-mono uppercase`}
              />
            </Field>
            <Field label="Expires" hint="Leave blank if it never expires.">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Recipient (optional)">
          <div className="space-y-5">
            <Field label="Name">
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Note" hint="Only you see this.">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : 'Create Gift Card'}
        </button>
      </div>
    </div>
  );
}
