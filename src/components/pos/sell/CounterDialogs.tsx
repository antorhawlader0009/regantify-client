import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { posApi, type PosDiscount, type PosHeldCart, type PosUnlock } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { POS_CASHIERS_KEY } from '../CashierUnlock';
import { Field, PosButton, PosDialog, PosInput, taka } from '../ui';
import { lineAmounts, type CartLine } from './cartMath';

/* The counter's dialogs for Step 7 (POS-system-plan.md): discounts, a manager's PIN, parked carts. */

/** What a manager is asked to approve: a sale's discount / price change, or a refund or void (Step 8). */
export interface ApprovalAsk {
  discountPercent: number;
  priceOverride: boolean;
  refund?: boolean;
  voidSale?: boolean;
}

/** % or ৳, the one control every discount here uses. */
function DiscountInput({ value, onChange }: { value: PosDiscount | undefined; onChange: (d: PosDiscount | undefined) => void }) {
  const type = value?.type ?? 'PERCENT';
  const [text, setText] = useState(value ? String(value.value) : '');
  useEffect(() => setText(value ? String(value.value) : ''), [value?.type]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (nextType: PosDiscount['type'], nextText: string) => {
    setText(nextText);
    const n = Number(nextText);
    onChange(nextText.trim() === '' || !(n > 0) ? undefined : { type: nextType, value: nextType === 'PERCENT' ? Math.min(n, 100) : n, reason: value?.reason });
  };
  return (
    <div className="flex gap-2">
      <div role="group" aria-label="Discount type" className="inline-flex shrink-0 overflow-hidden rounded-md border border-pos-line">
        {(['PERCENT', 'AMOUNT'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => set(t, text)} className={`h-10 px-3 text-sm ${type === t ? 'bg-pos-ink text-white' : 'bg-pos-surface'}`}>
            {t === 'PERCENT' ? '%' : '৳'}
          </button>
        ))}
      </div>
      <PosInput inputMode="decimal" value={text} onChange={(e) => set(type, e.target.value)} placeholder={type === 'PERCENT' ? 'e.g. 10' : 'e.g. 50'} className="tabular-nums" />
    </div>
  );
}

/** Tap a cart line: quantity, a new price, or a discount off the line. */
export function LineEditDialog({
  line,
  canChangePrice,
  onSave,
  onRemove,
  onClose,
}: {
  line: CartLine;
  canChangePrice: boolean;
  onSave: (next: CartLine) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CartLine>(line);
  const [priceText, setPriceText] = useState(line.customPrice !== undefined ? String(line.customPrice) : '');
  const amounts = lineAmounts(draft);
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title={line.name}>
      <div className="space-y-4">
        {line.options && <p className="-mt-2 text-sm text-pos-muted">{line.options}</p>}
        <Field label="Quantity">
          <div className="flex items-center gap-2">
            <PosButton aria-label="One less" onClick={() => setDraft((d) => ({ ...d, quantity: Math.max(1, d.quantity - 1) }))}>
              <Minus size={15} />
            </PosButton>
            <PosInput
              inputMode="numeric"
              value={String(draft.quantity)}
              onChange={(e) => {
                const n = Math.trunc(Number(e.target.value));
                if (n >= 1 && n <= 10000) setDraft((d) => ({ ...d, quantity: n }));
              }}
              className="w-20 text-center tabular-nums"
            />
            <PosButton aria-label="One more" onClick={() => setDraft((d) => ({ ...d, quantity: Math.min(10000, d.quantity + 1) }))}>
              <Plus size={15} />
            </PosButton>
          </div>
        </Field>
        <Field label={`Price each (regular ${taka(line.price)})`} hint={canChangePrice ? undefined : 'Changing the price needs a manager’s PIN when you pay.'}>
          <PosInput
            inputMode="decimal"
            value={priceText}
            placeholder={String(line.price)}
            onChange={(e) => {
              setPriceText(e.target.value);
              const n = Number(e.target.value);
              setDraft((d) => ({ ...d, customPrice: e.target.value.trim() === '' || !(n >= 0) ? undefined : n }));
            }}
            className="tabular-nums"
          />
        </Field>
        <Field label="Discount on this line">
          <DiscountInput value={draft.discount} onChange={(discount) => setDraft((d) => ({ ...d, discount }))} />
        </Field>
        {draft.discount && (
          <Field label="Reason (optional)">
            <PosInput maxLength={80} value={draft.discount.reason ?? ''} onChange={(e) => setDraft((d) => ({ ...d, discount: d.discount && { ...d.discount, reason: e.target.value || undefined } }))} />
          </Field>
        )}
        <div className="flex items-baseline justify-between rounded-lg bg-pos-page px-4 py-3">
          <span className="text-sm">Line total</span>
          <span className="text-xl font-semibold tabular-nums">
            {amounts.total < amounts.regularTotal && <span className="mr-2 text-sm font-normal text-pos-muted line-through">{taka(amounts.regularTotal)}</span>}
            {taka(amounts.total)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <PosButton onClick={onRemove}>
            <Trash2 size={15} aria-hidden />
            Remove
          </PosButton>
          <PosButton variant="primary" onClick={() => onSave(draft)}>
            Done
          </PosButton>
        </div>
      </div>
    </PosDialog>
  );
}

/** A discount off the whole cart, after the line discounts. */
export function CartDiscountDialog({ value, onSave, onClose }: { value: PosDiscount | undefined; onSave: (d: PosDiscount | undefined) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<PosDiscount | undefined>(value);
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Discount on the whole sale">
      <div className="space-y-4">
        <DiscountInput value={draft} onChange={setDraft} />
        <Field label="Reason (optional)" hint="Shows on the receipt.">
          <PosInput maxLength={80} value={draft?.reason ?? ''} onChange={(e) => setDraft((d) => d && { ...d, reason: e.target.value || undefined })} disabled={!draft} />
        </Field>
        <div className="flex justify-between gap-2">
          <PosButton onClick={() => onSave(undefined)}>No discount</PosButton>
          <PosButton variant="primary" onClick={() => onSave(draft)}>
            Apply
          </PosButton>
        </div>
      </div>
    </PosDialog>
  );
}

/**
 * A manager types their PIN for what the cashier may not do alone. What's being approved is
 * shown, so the manager knows what they're saying yes to.
 */
export function ManagerApprovalDialog({
  ask,
  token,
  onApproved,
  onClose,
}: {
  ask: ApprovalAsk;
  token: string;
  onApproved: (approval: { id: string; managerName: string }) => void;
  onClose: () => void;
}) {
  const cashiers = useQuery({ queryKey: POS_CASHIERS_KEY, queryFn: posApi.cashiers });
  const managers = cashiers.data?.filter((c) => c.role === 'MANAGER') ?? [];
  const [managerId, setManagerId] = useState('');
  const [pin, setPin] = useState('');
  useEffect(() => {
    if (!managerId && managers.length === 1) setManagerId(managers[0].id);
  }, [managers, managerId]);
  const approve = useMutation({
    mutationFn: () =>
      posApi.approve({ managerId, pin, discountPercent: ask.discountPercent, priceOverride: ask.priceOverride, refund: ask.refund, voidSale: ask.voidSale }, token),
    onSuccess: (r) => onApproved({ id: r.approvalId, managerName: r.managerName }),
    onError: (err) => {
      setPin('');
      toast.error(apiErrorMessage(err, 'That didn’t work. Try again.'));
    },
  });
  const what = [
    ask.discountPercent > 0 && `a ${ask.discountPercent}% discount`,
    ask.priceOverride && 'a changed price',
    ask.refund && 'a refund',
    ask.voidSale && 'voiding a sale',
  ]
    .filter(Boolean)
    .join(' and ');
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Manager approval">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (managerId && /^\d{4,6}$/.test(pin)) approve.mutate();
        }}
      >
        <p className="flex items-start gap-2 text-sm">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-pos-go" aria-hidden />
          This needs {what}, which this cashier can’t do alone. A manager’s PIN approves it once.
        </p>
        {cashiers.isSuccess && managers.length === 0 ? (
          <p className="text-sm text-pos-alert">No manager has a PIN yet. Set one under POS &gt; Staff.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Manager">
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="h-10 w-full rounded-md border border-pos-line bg-pos-surface px-3 text-sm">
                <option value="">Choose</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Their PIN">
              <PosInput
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="font-mono tracking-[0.3em]"
              />
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <PosButton onClick={onClose}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!managerId || pin.length < 4 || approve.isPending}>
            {approve.isPending ? 'Checking…' : 'Approve'}
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

/** Put the cart aside with a name, to finish later on any counter. */
export function HoldDialog({ onHold, pending, onClose }: { onHold: (name: string) => void; pending: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Hold this cart">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onHold(name.trim());
        }}
      >
        <Field label="A name to find it by" hint="For example the customer’s name or what they’re wearing. Kept for 24 hours.">
          <PosInput autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <PosButton onClick={onClose}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!name.trim() || pending}>
            Hold
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

const sinceText = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

/** The carts on hold in this store: resume one (the cart must be empty) or throw it away. */
export function HeldCartsDialog({
  unlock,
  cartEmpty,
  onResume,
  onClose,
}: {
  unlock: PosUnlock;
  cartEmpty: boolean;
  onResume: (name: string, payload: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const query = useQuery({ queryKey: ['pos', 'held'], queryFn: () => posApi.heldCarts(unlock.token) });
  const resume = useMutation({
    mutationFn: (cart: PosHeldCart) => posApi.resumeCart(cart.id, unlock.token),
    onSuccess: (r) => onResume(r.name, r.payload),
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'That cart couldn’t be opened.'));
      void query.refetch();
    },
  });
  const discard = useMutation({
    mutationFn: (cart: PosHeldCart) => posApi.discardCart(cart.id, unlock.token),
    onSuccess: () => void query.refetch(),
  });
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Carts on hold" width="max-w-lg">
      {!cartEmpty && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Finish or hold the cart on screen first.</p>}
      {query.isPending ? (
        <p className="text-sm text-pos-muted">Loading…</p>
      ) : !query.data?.length ? (
        <p className="text-sm text-pos-muted">Nothing on hold.</p>
      ) : (
        <ul className="divide-y divide-pos-line">
          {query.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-pos-muted">
                  {c.itemCount} item{c.itemCount === 1 ? '' : 's'} · {c.createdByName} · {sinceText(c.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <PosButton variant="quiet" className="h-9 px-2 text-xs" onClick={() => discard.mutate(c)} disabled={discard.isPending}>
                  Delete
                </PosButton>
                <PosButton variant="primary" className="h-9" onClick={() => resume.mutate(c)} disabled={!cartEmpty || resume.isPending}>
                  Resume
                </PosButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PosDialog>
  );
}

/** Whether an approval (good for 2 minutes) still covers what the cart asks. */
export function approvalCovers(
  approval: { at: number; discountPercent: number; priceOverride: boolean } | null,
  ask: { discountPercent: number; priceOverride: boolean },
) {
  return !!approval && Date.now() - approval.at < 110_000 && approval.discountPercent + 0.005 >= ask.discountPercent && (!ask.priceOverride || approval.priceOverride);
}
