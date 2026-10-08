import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { productsApi, type Product } from '../../../lib/productsApi';
import { dhakaInputToIso, nowDhakaInput } from '../../../lib/dhakaInput';
import { toast } from '../../../lib/toast';

const fieldClass =
  'mt-1 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand';

/**
 * All Products > select products > "Schedule": one go-live time and/or one hide time for every selected product
 * (a season's collection launching together, an offer ending together). "Go live at" is for the selected Draft
 * products (a Public one is already live); "Hide at" is for the Public ones, and for Draft ones that are being
 * given a go-live time. Times are Dhaka time. Nothing visible changes now: the server flips each product at its time.
 */
export function ScheduleProductsDialog({
  open,
  onOpenChange,
  products,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected products. */
  products: Product[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [publishInput, setPublishInput] = useState('');
  const [hideInput, setHideInput] = useState('');
  const [busy, setBusy] = useState(false);

  const drafts = products.filter((p) => p.visibility === 'DRAFT');
  const publics = products.filter((p) => p.visibility === 'PUBLIC');
  const publishAt = dhakaInputToIso(publishInput);
  const hideAt = dhakaInputToIso(hideInput);
  const invalidOrder = Boolean(publishAt && hideAt && new Date(hideAt) <= new Date(publishAt));

  async function run(changes: (p: Product) => { publishAt?: string | null; unpublishAt?: string | null } | null, done: string) {
    setBusy(true);
    let applied = 0;
    let skipped = 0;
    const jobs = products.map(async (p) => {
      const schedule = changes(p);
      if (!schedule) {
        skipped++;
        return;
      }
      await productsApi.updateVisibility(p.id, p.visibility, schedule);
      applied++;
    });
    const results = await Promise.allSettled(jobs);
    setBusy(false);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(`${applied} ${applied === 1 ? 'product' : 'products'} ${done}${skipped ? `, ${skipped} left as they were` : ''}.`);
      onDone();
      onOpenChange(false);
    } else {
      toast.error(`${applied} ${done}, ${failed} failed. Check the times (they must be in the future) and try again.`);
    }
  }

  const apply = () =>
    run((p) => {
      if (p.visibility === 'DRAFT') {
        if (publishAt) return { publishAt, ...(hideAt ? { unpublishAt: hideAt } : {}) };
        // No new go-live time: a hide time only fits a draft that already has one coming.
        return hideAt && p.publishAt ? { unpublishAt: hideAt } : null;
      }
      return hideAt ? { unpublishAt: hideAt } : null;
    }, 'scheduled');

  const clear = () => run(() => ({ publishAt: null, unpublishAt: null }), 'unscheduled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-regantify-text">
            <Clock size={16} aria-hidden />
            Schedule {products.length} {products.length === 1 ? 'product' : 'products'}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">They change by themselves at the time you choose (Dhaka time). Nothing changes now.</p>
        </div>

        <label className="block text-sm font-medium text-regantify-text">
          Go live at
          <input
            type="datetime-local"
            value={publishInput}
            min={nowDhakaInput()}
            disabled={drafts.length === 0}
            onChange={(e) => setPublishInput(e.target.value)}
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            {drafts.length > 0
              ? `For the ${drafts.length} Draft ${drafts.length === 1 ? 'product' : 'products'}.`
              : 'None of the selected products is a Draft (Public ones are already live).'}
          </span>
        </label>

        <label className="block text-sm font-medium text-regantify-text">
          Hide at
          <input type="datetime-local" value={hideInput} min={nowDhakaInput()} onChange={(e) => setHideInput(e.target.value)} className={fieldClass} />
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            {publics.length > 0 ? `For the ${publics.length} Public ${publics.length === 1 ? 'product' : 'products'}` : 'For products that are live'}
            {publishAt ? ' and for the Drafts getting a go-live time.' : '.'}
          </span>
        </label>

        {invalidOrder && <p className="text-sm text-red-600">The hide time must be after the go-live time.</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <button type="button" onClick={clear} disabled={busy} className="text-sm text-neutral-600 underline-offset-2 hover:text-regantify-text hover:underline disabled:opacity-60">
          Remove their schedules
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={busy || invalidOrder || (!publishAt && !hideAt)}
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Schedule'}
        </button>
      </div>
    </Dialog>
  );
}
