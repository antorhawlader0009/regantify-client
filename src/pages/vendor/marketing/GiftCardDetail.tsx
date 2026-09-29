import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { giftCardsApi, giftCardStatus } from '../../../lib/giftCardsApi';
import { toast } from '../../../lib/toast';

const money = (value: string | number) => `৳${Number(value).toLocaleString()}`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** ISO string -> the local "yyyy-MM-ddTHH:mm" a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const errorMessage = (err: any, fallback: string): string => {
  const message = err?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? fallback;
};

/**
 * One gift card: its balance, a "Redeem" form to record a use, the details
 * a vendor can still edit (expiry, recipient, note, on/off), and the
 * redemption history.
 */
export default function GiftCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ['gift-cards', id],
    queryFn: () => giftCardsApi.findOne(id!),
  });

  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemNote, setRedeemNote] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const [expiresAt, setExpiresAt] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [note, setNote] = useState('');

  // One-time fill once the saved card arrives.
  useEffect(() => {
    if (!card) return;
    setExpiresAt(toLocalInput(card.expiresAt));
    setRecipientName(card.recipientName ?? '');
    setRecipientPhone(card.recipientPhone ?? '');
    setNote(card.note ?? '');
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['gift-cards'] });

  const redeemMutation = useMutation({
    mutationFn: () =>
      giftCardsApi.redeem(id!, { amount: Number(redeemAmount), ...(redeemNote.trim() ? { note: redeemNote.trim() } : {}) }),
    onSuccess: () => {
      setRedeemAmount('');
      setRedeemNote('');
      setRedeemError(null);
      refresh();
      toast.success('Redeemed.');
    },
    onError: (err) => setRedeemError(errorMessage(err, 'Could not redeem. Please try again.')),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      giftCardsApi.update(id!, {
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        recipientName: recipientName.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      refresh();
      toast.success('Gift card updated.');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update this gift card. Please try again.')),
  });

  const activeMutation = useMutation({
    mutationFn: (active: boolean) => giftCardsApi.update(id!, { active }),
    onSuccess: (_, active) => {
      refresh();
      toast.success(active ? 'Gift card enabled.' : 'Gift card disabled.');
    },
    onError: () => toast.error('Could not update this gift card. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => giftCardsApi.remove(id!),
    onSuccess: () => {
      refresh();
      toast.success('Gift card deleted.');
      navigate('/vendor/marketing/gift-cards');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not delete this gift card. Please try again.')),
  });

  const handleRedeem = () => {
    setRedeemError(null);
    if (!redeemAmount.trim() || Number(redeemAmount) <= 0) {
      setRedeemError('Enter the amount to redeem.');
      return;
    }
    if (card && Number(redeemAmount) > Number(card.balance)) {
      setRedeemError('The amount is more than the gift card balance.');
      return;
    }
    redeemMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete gift card ${card?.code}? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  if (!card) return <p className="text-sm text-regantify-text-muted">Gift card not found.</p>;

  const status = giftCardStatus(card);
  const usages = card.usages ?? [];
  const canRedeem = status.label === 'Active';

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/marketing/gift-cards')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Gift Cards
      </button>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold font-mono text-regantify-text">{card.code}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
      </div>

      <div className="space-y-6">
        <SectionCard title="Balance">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-2">
            <div>
              <p className="text-xs text-regantify-text-muted">Remaining</p>
              <p className="text-2xl font-semibold text-regantify-text">{money(card.balance)}</p>
            </div>
            <div>
              <p className="text-xs text-regantify-text-muted">Issued for</p>
              <p className="text-sm text-regantify-text">{money(card.initialAmount)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Redeem">
          {canRedeem ? (
            <div className="space-y-4">
              <Field label="Amount (৳)" hint="Taken off the balance right away.">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Note" hint="E.g. the order or bill it was used on.">
                <input type="text" value={redeemNote} onChange={(e) => setRedeemNote(e.target.value)} className={inputClass} />
              </Field>
              {redeemError && <p className="text-red-500 text-sm">{redeemError}</p>}
              <button
                type="button"
                onClick={handleRedeem}
                disabled={redeemMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {redeemMutation.isPending ? 'Redeeming…' : 'Redeem'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-regantify-text-muted">This gift card is {status.label.toLowerCase()}, so it can’t be redeemed.</p>
          )}
        </SectionCard>

        <SectionCard title="Details">
          <div className="space-y-5">
            <Field label="Expires" hint="Leave blank if it never expires.">
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Recipient name">
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Recipient phone">
              <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Note" hint="Only you see this.">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} />
            </Field>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="History">
          {usages.length === 0 ? (
            <p className="text-sm text-regantify-text-muted">Not used yet.</p>
          ) : (
            <div className="divide-y divide-black/5">
              {usages.map((u) => (
                <div key={u.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div>
                    <p className="text-sm text-regantify-text">{u.note || 'Redeemed'}</p>
                    <p className="text-xs text-regantify-text-muted">{formatDateTime(u.createdAt)}</p>
                  </div>
                  <span className="text-sm font-medium text-regantify-text shrink-0">−{money(u.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => activeMutation.mutate(!card.active)}
            disabled={activeMutation.isPending}
            className="text-sm text-regantify-text-muted hover:text-regantify-text disabled:opacity-60"
          >
            {card.active ? 'Disable this gift card' : 'Enable this gift card'}
          </button>
          {usages.length === 0 && (
            <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
