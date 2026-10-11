import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsApi } from '../../lib/smsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Field, productInputClass } from '../product/ProductFormPieces';
import { ToggleRow } from '../product/ProductFormKit';
import { primaryBtn } from '../ui/PageKit';

/**
 * SMS > Birthday wishes (TellMe idea 49): on a customer's birthday or special day (saved on Customer Detail, day and
 * month only) the store texts them at 10 AM, once a year, from its SMS credits. Never at night, never to a blacklisted
 * customer. Leave a message empty to use the ready-made one.
 */
export function BirthdayWishes() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['birthday-sms'], queryFn: smsApi.getBirthday });
  const [enabled, setEnabled] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [special, setSpecial] = useState('');
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setBirthday(data.birthdayMessage);
    setSpecial(data.specialMessage);
    setCoupon(data.couponCode);
  }, [data]);

  const save = useMutation({
    mutationFn: () => smsApi.updateBirthday({ enabled, birthdayMessage: birthday, specialMessage: special, couponCode: coupon }),
    onSuccess: (next) => {
      queryClient.setQueryData(['birthday-sms'], next);
      toast.success('Birthday wishes saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  return (
    <div className="mt-3 space-y-4 text-sm">
      <p className="text-neutral-600">
        Text your customers on their birthday or special day (an anniversary, say). Add the dates on a customer’s page under Note &amp; tags. It goes out at 10 AM
        Dhaka time, once a year, from your SMS credits.
      </p>
      <ToggleRow checked={enabled} onChange={setEnabled} label="Send birthday wishes" hint="Off by default. Customers you blacklisted never get one." />

      <Field label="Birthday message" hint={`Leave empty for: ${data?.defaultBirthdayMessage ?? ''}`}>
        <textarea value={birthday} onChange={(e) => setBirthday(e.target.value)} maxLength={300} rows={3} className={`${productInputClass} resize-y`} />
      </Field>
      <Field label="Special day message" hint={`Leave empty for: ${data?.defaultSpecialMessage ?? ''}`}>
        <textarea value={special} onChange={(e) => setSpecial(e.target.value)} maxLength={300} rows={3} className={`${productInputClass} resize-y`} />
      </Field>
      <Field label="Coupon code (optional)" hint="Goes where {coupon} is in the message. Make the coupon in Marketing > Coupons.">
        <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={40} placeholder="e.g. HBD10" className={productInputClass} />
      </Field>
      <p className="text-xs text-neutral-500">Words you can use: {'{name}'} the customer’s name, {'{store}'} your store’s name, {'{coupon}'} the code above.</p>

      <div className="flex justify-end">
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={`${primaryBtn} h-10 px-4`}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
