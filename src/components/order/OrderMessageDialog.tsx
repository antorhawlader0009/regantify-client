import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, MessageCircle, Send } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { smsApi } from '../../lib/smsApi';
import { whatsappNumber } from '../../lib/bdPhone';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface Sample {
  id: string;
  name: string;
  bn: string;
  en: string;
}

/** Ready messages (TellMe idea 107). The words in {braces} are filled in for the order; {paylink} is this order's payment link. */
const SAMPLES: Sample[] = [
  {
    id: 'confirm',
    name: 'Confirm the order',
    bn: 'আসসালামু আলাইকুম {name}, আপনার অর্ডার {order} (মোট {total}): {items}। ঠিকানা: {address}। কনফার্ম করছি?',
    en: 'Assalamu alaikum {name}, your order {order} (total {total}): {items}. Delivery address: {address}. Shall I confirm it?',
  },
  {
    id: 'address',
    name: 'Check the address',
    bn: 'আসসালামু আলাইকুম {name}, অর্ডার {order}-এর ঠিকানা কি ঠিক আছে? {address}। ভুল থাকলে জানান।',
    en: 'Assalamu alaikum {name}, is the address for order {order} correct? {address}. Please tell me if anything is wrong.',
  },
  {
    id: 'payment',
    name: 'Payment link',
    bn: 'আসসালামু আলাইকুম {name}, অর্ডার {order}-এর পেমেন্ট করতে এই লিংকে যান: {paylink}',
    en: 'Assalamu alaikum {name}, please pay for order {order} with this link: {paylink}',
  },
  {
    id: 'delivery',
    name: 'Delivery news',
    bn: 'আসসালামু আলাইকুম {name}, আপনার অর্ডার {order} পাঠানো হয়েছে। ডেলিভারির সময় {cod} দিতে হবে। ট্র্যাক করুন: {tracking}',
    en: 'Assalamu alaikum {name}, your order {order} is on its way. Please keep {cod} ready for delivery. Track it: {tracking}',
  },
];

/**
 * Order detail > "Message" (TellMe idea 107): pick a saved SMS message or a ready one, see it filled in for this order ({name}, {total}, {items}, {address},
 * {tracking}, {cod}), edit it, then open it in WhatsApp (text already typed), copy it for Messenger, or send it as an SMS (costs credits). The words are
 * filled by the server with the same rules as an SMS. Only for someone who can see the customer's contact.
 */
export function OrderMessageDialog({ order, open, onOpenChange, canSms }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void; canSms: boolean }) {
  const { data: saved = [] } = useQuery({ queryKey: ['sms-templates'], queryFn: smsApi.listTemplates, staleTime: 60_000, enabled: open });
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [text, setText] = useState('');
  const payUrl = order.paymentLink?.state === 'READY' ? order.paymentLink.url : null;

  const fill = useMutation({
    mutationFn: (body: string) => ordersApi.fillMessage(order.id, body),
    onSuccess: (res) => setText(res.text),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not prepare the message.')),
  });

  const pick = (body: string) => fill.mutate(body.replace('{paylink}', payUrl ?? ''));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied. Paste it into Messenger or any chat.');
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  const sendSms = useMutation({
    mutationFn: () => smsApi.sendSingle(order.customerPhone, text.trim(), order.id),
    onSuccess: () => {
      toast.success(`SMS sent to ${order.customerPhone}.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t send the SMS. Please try again.')),
  });

  const samples = SAMPLES.filter((s) => s.id !== 'payment' || payUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Message to this customer" maxWidth="max-w-lg">
      <div className="space-y-3 px-6 pb-6 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pick a message"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('s:')) {
                const t = saved.find((x) => x.id === v.slice(2));
                if (t) pick(t.body);
              } else if (v.startsWith('r:')) {
                const s = SAMPLES.find((x) => x.id === v.slice(2));
                if (s) pick(s[lang]);
              }
            }}
            className={`${productInputClass} !w-auto min-w-[200px] !py-1.5`}
          >
            <option value="">Pick a message…</option>
            <optgroup label="Ready messages">
              {samples.map((s) => (
                <option key={s.id} value={`r:${s.id}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            {saved.length > 0 && (
              <optgroup label="Your saved messages">
                {saved.map((t) => (
                  <option key={t.id} value={`s:${t.id}`}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <select aria-label="Language of ready messages" value={lang} onChange={(e) => setLang(e.target.value as 'bn' | 'en')} className={`${productInputClass} !w-auto !py-1.5`}>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </select>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={6} placeholder="Pick a message above, or write your own" className={productInputClass} />
        <p className="text-xs text-neutral-500">The words like {'{total}'} and {'{address}'} are filled in for this order. You can change the text before you use it. Saved messages are managed in SMS &gt; Send to customers.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href={text.trim() ? `https://wa.me/${whatsappNumber(order.customerPhone)}?text=${encodeURIComponent(text.trim())}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!text.trim()}
            className={`${primaryBtn} ${text.trim() ? '' : 'pointer-events-none opacity-60'}`}
          >
            <MessageCircle size={14} />
            Open in WhatsApp
          </a>
          <button type="button" onClick={copy} disabled={!text.trim()} className={outlineBtn}>
            <Copy size={14} />
            Copy
          </button>
          {canSms && (
            <button type="button" onClick={() => sendSms.mutate()} disabled={!text.trim() || sendSms.isPending} className={outlineBtn} title="Uses SMS credits">
              <Send size={14} />
              {sendSms.isPending ? 'Sending…' : 'Send by SMS'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
