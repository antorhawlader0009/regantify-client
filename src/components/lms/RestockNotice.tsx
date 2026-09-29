import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsMe, type LmsRestockItem } from '../../lib/lmsApi';
import { Field, LmsButton, LmsDialog, LmsTextarea } from './ui';

const DEFAULT_TEXT = 'Good news {name}: {product} is back in stock at {store}. Reply or call us to order.';

/**
 * LMS > Leads (managers): products people asked to hear about ("Notify me
 * when it's back", LMS-plan.md Step 9) that are in stock again, with one
 * button to text everyone waiting. Shows nothing when there's none.
 */
export function RestockNotice({ me, className = '' }: { me: LmsMe; className?: string }) {
  const list = useQuery({ queryKey: ['lms', 'restock'], queryFn: lmsApi.restock, enabled: me.isManager, refetchInterval: 5 * 60_000 });
  const [open, setOpen] = useState<LmsRestockItem | null>(null);
  if (!me.isManager || !list.data?.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {list.data.map((item) => (
        <div key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-lms-line bg-lms-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">{item.name}</span> is back in stock.{' '}
            <span className="tabular-nums">{item.waiting}</span> {item.waiting === 1 ? 'person asked' : 'people asked'} to be told.
          </p>
          <LmsButton variant="primary" onClick={() => setOpen(item)}>
            Text {item.waiting === 1 ? 'them' : `all ${item.waiting}`}
          </LmsButton>
        </div>
      ))}
      {open && <TextWaitingDialog item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TextWaitingDialog({ item, onClose }: { item: LmsRestockItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(DEFAULT_TEXT);
  const send = useMutation({
    mutationFn: () => lmsApi.textWaiting(item.productId, text.trim()),
    onSuccess: ({ sent, skipped, error }) => {
      queryClient.invalidateQueries({ queryKey: ['lms'] });
      const who = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;
      if (error) toast.error(`Sent to ${who(sent)}, then stopped: ${error}`);
      else toast.success(`Texted ${who(sent)}${skipped ? `. ${who(skipped)} marked do not contact were skipped` : ''}.`);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The messages weren't sent. Try again.")),
  });

  return (
    <LmsDialog open onOpenChange={(o) => !o && onClose()} title={`Tell ${item.waiting} ${item.waiting === 1 ? 'person' : 'people'} ${item.name} is back`}>
      <div className="space-y-4">
        <Field label="Message" hint="Each person gets their own SMS, with their name filled in. You can use {name} {product} {store}. Uses your SMS credits.">
          <LmsTextarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        </Field>
        <p className="text-sm text-lms-muted">They move to Trying to reach so your team can follow up with a call.</p>
        <div className="flex gap-2">
          <LmsButton variant="primary" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>
            {send.isPending ? 'Sending…' : `Send ${item.waiting} SMS`}
          </LmsButton>
          <LmsButton variant="quiet" onClick={onClose}>
            Cancel
          </LmsButton>
        </div>
      </div>
    </LmsDialog>
  );
}
