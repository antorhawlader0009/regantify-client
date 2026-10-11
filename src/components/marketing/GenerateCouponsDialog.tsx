import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { couponsApi, type Coupon } from '../../lib/couponsApi';
import { downloadCsv, toCsv } from '../../lib/csv';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Marketing > Coupons > "Make codes like this" (TellMe idea 83): up to 500 one-time codes copied from one coupon (same discount, minimum,
 * expiry and limits), each usable once. Download the list as a CSV. To give each customer their own code tied to their phone, use
 * {personal_coupon} in an SMS campaign instead.
 */
export function GenerateCouponsDialog({ coupon, open, onOpenChange }: { coupon: Coupon; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [count, setCount] = useState('50');
  const [prefix, setPrefix] = useState('');
  const make = useMutation({
    mutationFn: () => couponsApi.generateLike(coupon.id, Math.min(500, Math.max(1, Number(count) || 1)), prefix.trim() || undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      downloadCsv(
        `coupons-${coupon.code}.csv`,
        toCsv(['Code', 'Valid till'], res.coupons.map((c) => [c.code, c.validTill ? c.validTill.slice(0, 10) : 'No expiry'])),
      );
      toast.success(`${res.count} codes made. The list was downloaded.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the codes. Please try again.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Make codes like ${coupon.code}`} maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">Each new code gives the same discount, minimum order, expiry and limits as {coupon.code}, and can be used once. Codes are 8 letters and digits, without 0, O, 1 and I.</p>
        <label className="block text-xs text-neutral-500">
          How many (up to 500)
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(e.target.value)} className="mt-1 block h-10 w-32 rounded-lg border border-line px-3 text-sm text-regantify-text" />
        </label>
        <label className="block text-xs text-neutral-500">
          Start of every code (optional), like EID-
          <input value={prefix} maxLength={12} onChange={(e) => setPrefix(e.target.value)} className="mt-1 block h-10 w-40 rounded-lg border border-line px-3 text-sm uppercase text-regantify-text" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => make.mutate()} disabled={make.isPending} className={primaryBtn}>
            {make.isPending ? 'Making…' : 'Make and download'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
