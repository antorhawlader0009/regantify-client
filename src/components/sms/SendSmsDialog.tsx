import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';
import { smsApi } from '../../lib/smsApi';
import { SmsTemplatePicker } from './SmsTemplatePicker';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/** Rough SMS count, same rule as the server (160 plain / 70 with Bangla; longer messages split). */
function smsCount(text: string): number {
  // eslint-disable-next-line no-control-regex
  const plain = /^[\x00-\x7F]*$/.test(text);
  const single = plain ? 160 : 70;
  return text.length <= single ? 1 : Math.ceil(text.length / (plain ? 153 : 67));
}

/** Order detail "SMS": one message to this customer, paid from the store's SMS credits. */
export function SendSmsDialog({
  phone,
  open,
  onOpenChange,
  initialMessage = '',
  orderId,
}: {
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Text to start the message with (a payment link, say); the sender can edit it. */
  initialMessage?: string;
  /** The order this is sent from: {order} and {name} in the text become that order's. */
  orderId?: string;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(initialMessage);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setMessage(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = useMutation({
    mutationFn: () => smsApi.sendSingle(phone, message.trim(), orderId),
    onSuccess: (data) => {
      queryClient.setQueryData(['sms-credits'], data);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      toast.success(`SMS sent to ${phone}.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t send the SMS. Please try again.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`SMS to ${phone}`} maxWidth="max-w-md">
      <div className="space-y-3 px-6 pb-6 pt-3">
        <SmsTemplatePicker message={message} setMessage={setMessage} textareaRef={messageRef} />
        <textarea
          ref={messageRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Write your message"
          className={productInputClass}
        />
        <p className="text-xs text-neutral-500">{message.trim() ? `Uses ${smsCount(message.trim())} SMS credit${smsCount(message.trim()) === 1 ? '' : 's'}.` : 'English: 160 letters = 1 SMS. Bangla: 70 letters = 1 SMS.'}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => send.mutate()} disabled={!message.trim() || send.isPending} className={primaryBtn}>
            {send.isPending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
