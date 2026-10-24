import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Smartphone } from 'lucide-react';
import { DESIGN_SETTINGS_KEY, designSettingsApi } from '../../lib/designSettingsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Store > Branding > Install as app. Every store already has its own web manifest (name, an icon made from the logo, the accent colour),
 * so a shopper can add it to the phone's home screen from the browser menu. This switch also shows returning shoppers a small
 * "Add to your home screen" banner (Android: an Install button; iPhone: the two steps). Off by default. StorePal draws the banner.
 */
export function InstallAppSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: DESIGN_SETTINGS_KEY, queryFn: designSettingsApi.get });
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => {
    if (data) {
      setEnabled(data.appInstallEnabled ?? false);
      setName(data.appName ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => designSettingsApi.update({ appInstallEnabled: enabled, appName: name.trim() }),
    onSuccess: (saved) => {
      queryClient.setQueryData(DESIGN_SETTINGS_KEY, saved);
      toast.success('Saved. It can take a minute to show in the store.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  return (
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-medium text-regantify-text">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <Smartphone size={15} aria-hidden />
        </span>
        Install as app
      </h2>
      <p className="mt-1 text-sm text-regantify-text-muted">
        Customers can keep your shop on their phone’s home screen, with your logo as the icon, and open it like an app without the browser bar. No app to build, no cost.
      </p>
      {isLoading ? (
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : (
        <div className="mt-4 space-y-4">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-regantify-text">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5 accent-regantify-cta" />
            <span>
              Invite returning customers to add the shop to their home screen
              <span className="block text-xs text-neutral-500">A small banner on phones, only for customers who came back on another day or ordered before. “Not now” hides it for 30 days.</span>
            </span>
          </label>
          <label className="block text-sm font-medium text-regantify-text">
            Name under the icon
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your store name"
              className="mt-1.5 h-10 w-full max-w-sm rounded-xl border border-black/10 bg-white px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-regantify-cta/30"
            />
            <span className="mt-1 block text-xs font-normal text-neutral-500">Phones show about 12 letters under an icon, so a short name looks best. The icon is your logo (Store &gt; Branding).</span>
          </label>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save
          </button>
        </div>
      )}
    </section>
  );
}
