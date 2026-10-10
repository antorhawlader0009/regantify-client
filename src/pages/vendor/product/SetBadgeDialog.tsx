import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { productsApi } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { MAX_BADGE_LENGTH } from '../../../components/product/BadgeField';

const fieldClass = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand';

/**
 * All Products > select products > "Set badge" (TellMe idea 37): the same badge ("New", "Hot", "Eid offer") on every
 * selected product, optionally going away by itself after some days; leave the text empty to take badges off. StorePal
 * stores only.
 */
export function SetBadgeDialog({ ids, onOpenChange, onDone }: { ids: string[]; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      const { updated } = await productsApi.setBadge(ids, text.trim() || null, text.trim() && days ? Number(days) : null);
      toast.success(text.trim() ? `Badge set on ${updated} ${updated === 1 ? 'product' : 'products'}.` : `Badge taken off ${updated} ${updated === 1 ? 'product' : 'products'}.`);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Couldn’t set the badge. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange} title="Set badge" maxWidth="max-w-sm">
      <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {ids.length} {ids.length === 1 ? 'product' : 'products'} selected. Leave the badge empty to take badges off.
        </p>
        <label className="block">
          <span className="mb-1 block text-neutral-700">Badge</span>
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_BADGE_LENGTH))} placeholder="e.g. New, Hot, Eid offer" autoFocus className={fieldClass} />
        </label>
        {text.trim() && (
          <label className="block">
            <span className="mb-1 block text-neutral-700">Remove it after (days)</span>
            <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="Empty = keep until removed" className={fieldClass} />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={apply} disabled={busy} className={primaryBtn}>
            {busy ? 'Saving…' : text.trim() ? 'Set badge' : 'Take badges off'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
