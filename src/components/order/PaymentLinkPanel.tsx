import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, Link2, Loader2, MessageSquare } from 'lucide-react';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';
import { SendSmsDialog } from '../sms/SendSmsDialog';

const money = (value: number) => `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const HOURS = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '1 day' },
  { value: 48, label: '2 days' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
];

/**
 * Order Detail > Advance > "Payment link" (TellMe idea 19): for an order you entered yourself (from a Facebook or
 * WhatsApp chat), ask the customer to pay an advance online. You pick the amount (the delivery charge, the whole
 * total, or any amount) and how long the link works; send it by SMS or copy it into the chat. The customer pays through
 * PayStation, and it lands like the store's own COD advance: in your wallet, with the courier told to collect only the
 * rest. Needs Online Payment turned on in Payment Gateway.
 */
export function PaymentLinkPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const link = order.paymentLink && (order.paymentLink.state === 'READY' || order.paymentLink.state === 'EXPIRED') ? order.paymentLink : null;
  const total = Number(order.total);
  const delivery = Number(order.deliveryCharge);
  const canSms = useCan('sms.manage');
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(link ? String(link.amount) : delivery > 0 ? String(delivery) : '');
  const [hours, setHours] = useState(24);
  const [smsOpen, setSmsOpen] = useState(false);
  const booked = order.courierBookingStatus === 'BOOKED' || order.courierBookingStatus === 'BOOKING';
  const showForm = !link || editing;

  const make = useMutation({
    mutationFn: () => ordersApi.createPaymentLink(order.id, Number(amount), hours),
    onSuccess: () => {
      toast.success('Payment link ready. Send it to the customer.');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the payment link.')),
  });
  const cancel = useMutation({
    mutationFn: () => ordersApi.cancelPaymentLink(order.id),
    onSuccess: () => {
      toast.success('Payment link cancelled.');
      setEditing(false);
      setAmount(delivery > 0 ? String(delivery) : '');
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel the payment link.')),
  });

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast.error('Enter how much to ask for, at least ৳1.');
      return;
    }
    if (value > total) {
      toast.error('The advance can’t be more than the order total.');
      return;
    }
    make.mutate();
  };

  const copy = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copied. Paste it into the chat.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  const ref = order.publicCode ?? `ORDER-${order.invoiceNumber}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-regantify-text">
        <Link2 size={15} aria-hidden />
        Payment link
      </div>

      {link && !editing && (
        <div className="space-y-2.5">
          <p className="text-sm text-regantify-text">
            {link.state === 'READY' ? (
              <>
                Asking the customer for <b>{money(link.amount)}</b> in advance (they pay <b>{money(link.payable)}</b>
                {link.fee > 0 ? ` with a ${money(link.fee)} processing fee that doesn’t come out of your money` : ''}). The link works until{' '}
                <b>{link.expiresAt ? formatDhakaDateTime(link.expiresAt) : '…'}</b>.
              </>
            ) : (
              <span className="text-amber-800">
                This link expired{link.expiresAt ? ` on ${formatDhakaDateTime(link.expiresAt)}` : ''}. Make a new one for the customer.
              </span>
            )}
          </p>
          {link.state === 'READY' && link.url && (
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={`${productInputClass} min-w-[220px] flex-1 font-mono text-xs`} aria-label="Payment link" />
              <button type="button" onClick={copy} className={outlineBtn}>
                <Copy size={14} />
                Copy
              </button>
              {canSms && (
                <button type="button" onClick={() => setSmsOpen(true)} className={outlineBtn}>
                  <MessageSquare size={14} />
                  Send by SMS
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setEditing(true)} className={outlineBtn}>
              Make a new link
            </button>
            <button type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending} className={`${outlineBtn} text-red-600`}>
              {cancel.isPending && <Loader2 size={14} className="animate-spin" />}
              Cancel link
            </button>
          </div>
          <p className="text-xs text-neutral-500">When the customer pays, the order shows it here, you get a notice, and the courier is asked to collect only the rest.</p>
        </div>
      )}

      {showForm && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Ordered over Facebook or WhatsApp? Ask for an advance (or the whole amount) with a link. The customer pays online and you don’t chase a bKash TrxID.
          </p>
          <div className="grid gap-3 sm:grid-cols-[10rem_12rem]">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Ask for (৳)</label>
              <input type="number" min={1} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={productInputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Link works for</label>
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={productInputClass}>
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {delivery > 0 && (
              <button type="button" onClick={() => setAmount(String(delivery))} className={outlineBtn}>
                Delivery charge ({money(delivery)})
              </button>
            )}
            <button type="button" onClick={() => setAmount(String(total))} className={outlineBtn}>
              Full amount ({money(total)})
            </button>
            <button type="button" onClick={submit} disabled={make.isPending} className={primaryBtn}>
              {make.isPending && <Loader2 size={14} className="animate-spin" />}
              {link ? 'Make new link' : 'Make payment link'}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(false)} className={outlineBtn}>
                Back
              </button>
            )}
          </div>
        </div>
      )}

      {booked && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This parcel is already booked with the courier for the full amount. After the customer pays, cancel the booking and book it again so the courier collects only the rest.
        </p>
      )}

      {link?.url && (
        <SendSmsDialog
          phone={order.customerPhone}
          orderId={order.id}
          open={smsOpen}
          onOpenChange={setSmsOpen}
          initialMessage={`Please pay ${money(link.payable)} in advance for your order ${ref}: ${link.url}`}
        />
      )}
    </div>
  );
}
