import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { SectionCard, Field } from '../../../components/product/ProductFormPieces';
import { ToggleRow } from '../../../components/product/ProductFormKit';
import { Can } from '../../../lib/useStaffAccess';
import { rewardsApi } from '../../../lib/rewardsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { UnitInput } from './MarketingKit';

/**
 * Marketing > Reward points (TellMe idea 41): customers earn points on every completed order and pay part of a later
 * order with them. Off by default. Points are earned on the goods actually paid for (delivery, VAT and fees leave out,
 * and so does the part paid with points or a gift card); a cancelled or returned order gives spent points back and
 * takes earned points away.
 */
export default function RewardPoints() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['reward-settings'], queryFn: rewardsApi.getSettings });
  const [enabled, setEnabled] = useState(false);
  const [earnPerBdt, setEarnPerBdt] = useState('100');
  const [maxPercent, setMaxPercent] = useState('20');
  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setEarnPerBdt(String(data.earnPerBdt));
    setMaxPercent(String(data.maxRedeemPercent));
  }, [data]);

  const earnError = !(Number(earnPerBdt) >= 1) ? 'Enter a number, 1 or more.' : null;
  const percentError = !(Number(maxPercent) >= 1 && Number(maxPercent) <= 100) ? 'Enter a percent from 1 to 100.' : null;

  const save = useMutation({
    mutationFn: () => rewardsApi.updateSettings({ enabled, earnPerBdt: Number(earnPerBdt), maxRedeemPercent: Number(maxPercent) }),
    onSuccess: (next) => {
      queryClient.setQueryData(['reward-settings'], next);
      toast.success('Reward points saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Try again.')),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Award size={20} /> Reward points
        </h1>
        <p className="text-sm text-neutral-600">Give returning customers points to spend on their next order. Only logged-in customers can spend them.</p>
      </div>

      <SectionCard title="Settings">
        <div className="space-y-4">
          <ToggleRow checked={enabled} onChange={setEnabled} label="Reward points are on" hint="Points are earned only on orders completed after you turn this on." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Earn 1 point for every" error={earnError} hint="Taka of goods paid for. 1 point is worth ৳1 when spent.">
              <UnitInput unit="৳" integer value={earnPerBdt} onChange={setEarnPerBdt} placeholder="100" />
            </Field>
            <Field label="Points can pay up to" error={percentError} hint="Of one order's total.">
              <UnitInput unit="%" integer value={maxPercent} onChange={setMaxPercent} placeholder="20" />
            </Field>
          </div>
          <Can perm="marketing.edit">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={save.isPending || !!earnError || !!percentError}
                onClick={() => save.mutate()}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </Can>
        </div>
      </SectionCard>

      {data && (
        <SectionCard title="So far">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{data.totalEarned.toLocaleString('en-US')}</p>
              <p className="text-sm text-neutral-600">Points earned by customers</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{data.totalSpent.toLocaleString('en-US')}</p>
              <p className="text-sm text-neutral-600">Points spent on orders</p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
