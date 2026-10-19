import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addonsApi, type AdminAddon, type AddonState } from '../../lib/addonsApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

const STATE_LABEL: Record<AddonState, { text: string; cls: string }> = {
  READY: { text: 'Built', cls: 'bg-emerald-50 text-emerald-700' },
  SOON: { text: 'Being built', cls: 'bg-amber-50 text-amber-700' },
  WAITING: { text: 'Waiting for docs', cls: 'bg-neutral-100 text-neutral-600' },
};

/**
 * Super Admin > Add-ons: turn each add-on on or off for every store at once. Off hides it on the stores' Add-ons page
 * and stops it where it is used (the "When off" column says how). Nothing is deleted: a store's saved settings and
 * connected accounts come back the moment it is turned on. A change reaches every server within 30 seconds.
 */
export default function AdminAddons() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-addons'], queryFn: addonsApi.adminList });
  const [target, setTarget] = useState<{ addon: AdminAddon; on: boolean } | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    setTarget(null);
    setNote('');
  };
  const m = useMutation({
    mutationFn: () => addonsApi.adminSet(target!.addon.key, { on: target!.on, note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success(target!.on ? `${target!.addon.label} is on for every store.` : `${target!.addon.label} is off for every store.`);
      qc.invalidateQueries({ queryKey: ['admin-addons'] });
      close();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  const groups = [...new Set((data ?? []).map((a) => a.group))];
  const off = (data ?? []).filter((a) => !a.on).length;

  return (
    <div className="max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-regantify-text">Add-ons</h1>
        <p className="mt-1 max-w-2xl text-sm text-regantify-text-muted">
          Turn an add-on on or off for every store at once. When it is off, stores see it as turned off on their Add-ons page and it stops where it is used. Nothing is deleted: saved
          settings and connected accounts come back when you turn it on.
        </p>
      </header>

      {off > 0 && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-900">{off === 1 ? '1 add-on is' : `${off} add-ons are`} off right now.</p>}

      {isLoading || !data ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g} className="rounded-xl border border-line bg-white">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">{g}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4">Add-on</th>
                      <th className="px-4">Status</th>
                      <th className="px-4">When off</th>
                      <th className="px-4 text-right">Stores using</th>
                      <th className="px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {data
                      .filter((a) => a.group === g)
                      .map((a) => (
                        <tr key={a.key}>
                          <td className="px-4 align-top">
                            <p className="font-medium text-regantify-text">{a.label}</p>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${STATE_LABEL[a.state].cls}`}>{STATE_LABEL[a.state].text}</span>
                          </td>
                          <td className="px-4 align-top">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${a.on ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{a.on ? 'On' : 'Off'}</span>
                            {!a.on && a.note && <p className="mt-1 max-w-[16rem] text-xs text-regantify-text">Why: {a.note}</p>}
                            {a.changedAt && (
                              <p className="mt-1 text-xs text-regantify-text-muted">
                                {a.changedBy ?? 'Super Admin'}, {formatDhakaDateTime(a.changedAt)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 align-top text-xs text-regantify-text-muted">{a.enforced || 'Hidden on the stores’ Add-ons page.'}</td>
                          <td className="px-4 text-right align-top tabular-nums">{a.storesUsing ?? '–'}</td>
                          <td className="px-4 text-right align-top">
                            <button
                              type="button"
                              onClick={() => setTarget({ addon: a, on: !a.on })}
                              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${a.on ? 'border border-red-300 text-red-700' : 'bg-regantify-cta text-white'}`}
                            >
                              {a.on ? 'Turn off' : 'Turn on'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={target !== null} onOpenChange={(o) => !o && close()} maxWidth="max-w-md">
        {target && (
          <div className="space-y-4 p-6">
            <h2 className="font-semibold text-regantify-text">{target.on ? `Turn on ${target.addon.label}` : `Turn off ${target.addon.label}`}</h2>
            <p className="text-sm text-regantify-text-muted">
              {target.on ? 'Every store can use it again.' : target.addon.enforced || 'Stores see it as turned off on their Add-ons page.'}
              {!target.on && (target.addon.storesUsing ?? 0) > 0 && ` ${target.addon.storesUsing} store${target.addon.storesUsing === 1 ? ' uses' : 's use'} it right now.`}
            </p>
            {!target.on && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-regantify-text">Why? (kept in the admin log)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className={field} placeholder="For example: provider is changing its API" />
              </div>
            )}
            <button
              type="button"
              disabled={(!target.on && note.trim().length < 5) || m.isPending}
              onClick={() => m.mutate()}
              className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {m.isPending ? 'Working…' : target.on ? 'Turn on for everyone' : 'Turn off for everyone'}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
