import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { getWatermarkSettings, updateWatermarkSettings, type WatermarkSettings } from '../../lib/vendorApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const POSITIONS: Array<[WatermarkSettings['position'], string]> = [
  ['TOP_LEFT', 'Top left'],
  ['TOP_RIGHT', 'Top right'],
  ['BOTTOM_LEFT', 'Bottom left'],
  ['BOTTOM_RIGHT', 'Bottom right'],
  ['CENTER', 'Centre'],
];

/**
 * Store > Branding > Photo watermark (TellMe idea 103): your logo or shop name over every product photo in the store, so a copied photo
 * carries your name. Off by default. The photos you uploaded are not changed (the mark is added when the store shows them), so it
 * works on every photo already there and goes the moment you switch it off. The Facebook product feed keeps the plain photos. StorePal only.
 */
export function WatermarkSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['watermark-settings'], queryFn: getWatermarkSettings, retry: false });
  const [mode, setMode] = useState<WatermarkSettings['mode']>('OFF');
  const [position, setPosition] = useState<WatermarkSettings['position']>('BOTTOM_RIGHT');
  const [opacity, setOpacity] = useState(40);
  useEffect(() => {
    if (data) {
      setMode(data.mode);
      setPosition(data.position);
      setOpacity(data.opacity);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateWatermarkSettings({ mode, position, opacity }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['watermark-settings'], saved);
      toast.success('Watermark saved. It can take a minute to show in the store.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  return (
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-base font-medium text-regantify-text">Photo watermark</h2>
      <p className="mt-1 text-sm text-regantify-text-muted">
        Put your logo or shop name over every product photo in your store, so copied photos carry your name. Your uploaded photos are not changed, so you can switch it off any time. StorePal only.
      </p>
      {isLoading ? (
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {([['OFF', 'Off'], ['LOGO', 'My logo'], ['TEXT', 'My shop name']] as const).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="wm-mode" checked={mode === value} onChange={() => setMode(value)} className="accent-regantify-cta" />
                {label}
              </label>
            ))}
          </div>
          {mode === 'LOGO' && !data?.hasLogo && <p className="text-xs text-amber-700">Upload your logo above first (a logo uploaded here, not a link to another site).</p>}
          {mode !== 'OFF' && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs text-regantify-text-muted">
                Where
                <select value={position} onChange={(e) => setPosition(e.target.value as WatermarkSettings['position'])} className="mt-1 block h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-regantify-text">
                  {POSITIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-regantify-text-muted">
                Strength ({opacity}%)
                <input type="range" min={10} max={80} step={5} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 block w-44" />
              </label>
            </div>
          )}
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save watermark
          </button>
        </div>
      )}
    </section>
  );
}
