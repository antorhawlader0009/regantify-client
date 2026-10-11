import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { getHeardFromSettings, updateHeardFromSettings } from '../../lib/vendorApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Store > Order Tracking > "How did you hear about us?" (TellMe idea 100): an optional one-tap question under the thank-you and tracking page.
 * Off until switched on. The store may write its own answers (up to 8, one per line) or leave it for the built-in six. Analytics > Marketing
 * then shows what customers say next to what the tracked links say.
 */
export function HeardFromSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['heard-from-settings'], queryFn: getHeardFromSettings, retry: false });
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setText(data.options.join('\n'));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateHeardFromSettings({ enabled, options: text.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['heard-from-settings'], saved);
      toast.success('Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  return (
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">&ldquo;How did you find us?&rdquo;</h2>
          <p className="mt-1 text-sm text-regantify-text-muted">
            After an order, the thank-you and tracking page can ask one optional question with a few buttons. Nothing waits for the answer, it is saved once, and you see only counts (no names or phones).
            Analytics &gt; Marketing shows it next to what your tracked links say.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          On
        </label>
      </div>
      {isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : (
        <div className={`mt-4 ${enabled ? '' : 'opacity-60'}`}>
          <label className="block text-sm font-medium text-regantify-text">
            Your own answers (one per line, up to 8)
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!enabled}
              rows={5}
              placeholder={(data?.defaults ?? []).join('\n')}
              className="mt-1.5 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-normal"
            />
          </label>
          <p className="mt-1 text-xs text-regantify-text-muted">Leave it empty to use: {(data?.defaults ?? []).join(', ')}.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 flex items-center gap-1.5 rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
      >
        {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save
      </button>
    </section>
  );
}
