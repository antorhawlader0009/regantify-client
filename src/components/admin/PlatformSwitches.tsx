import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSwitchesApi, type PlatformSwitch } from '../../lib/adminSwitchesApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/** Admin > Settings > Switches (super-admin-plan.md Step 14): pause a feature for every store in one click. A paused feature tells the person using it so. */
export function PlatformSwitches() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-switches'], queryFn: () => adminSwitchesApi.list() });
  const [target, setTarget] = useState<{ sw: PlatformSwitch; on: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');

  const close = () => {
    setTarget(null);
    setNote('');
    setCode('');
  };
  const m = useMutation({
    mutationFn: () => adminSwitchesApi.set(target!.sw.key, { on: target!.on, note: note.trim() || undefined, code: code || undefined }),
    onSuccess: () => {
      toast.success(target!.on ? `${target!.sw.label} is back on.` : `${target!.sw.label} is paused.`);
      qc.invalidateQueries({ queryKey: ['admin-switches'] });
      close();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  if (isLoading || !data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const off = data.filter((s) => !s.on).length;
  const ready = target && (target.on || note.trim().length >= 5) && (!target.sw.needsCode || /^\d{6}$/.test(code));

  return (
    <div>
      <p className="mb-4 text-sm text-regantify-text-muted">
        Pause a feature for every store at once, for example during an outage or when a provider is down. Stores that use it see a short “temporarily paused” message; nothing is deleted
        and it comes back the moment you turn it on. A change reaches every server within 30 seconds.
      </p>
      {off > 0 && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-900">{off === 1 ? '1 feature is' : `${off} features are`} paused right now.</p>}
      <div className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
        {data.map((s) => (
          <div key={s.key} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-regantify-text">
                {s.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.on ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{s.on ? 'On' : 'Paused'}</span>
              </p>
              <p className="mt-0.5 text-xs text-regantify-text-muted">{s.description}</p>
              {!s.on && s.note && <p className="mt-1 text-xs text-regantify-text">Why: {s.note}</p>}
              {s.changedAt && (
                <p className="mt-1 text-xs text-regantify-text-muted">
                  Last changed by {s.changedBy ?? 'Super Admin'}, {formatDhakaDateTime(s.changedAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTarget({ sw: s, on: !s.on })}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${s.on ? 'border border-red-300 text-red-700' : 'bg-regantify-cta text-white'}`}
            >
              {s.on ? 'Pause' : 'Turn on'}
            </button>
          </div>
        ))}
      </div>

      <Dialog open={target !== null} onOpenChange={(o) => !o && close()} maxWidth="max-w-md">
        {target && (
          <div className="space-y-4 p-6">
            <h2 className="font-semibold text-regantify-text">{target.on ? `Turn on ${target.sw.label}` : `Pause ${target.sw.label}`}</h2>
            <p className="text-sm text-regantify-text-muted">{target.on ? 'Every store can use it again.' : 'Every store loses it until you turn it back on.'}</p>
            {!target.on && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-regantify-text">Why? (kept in the admin log)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className={field} placeholder="For example: Cloudflare AI is down" />
              </div>
            )}
            {target.sw.needsCode && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-regantify-text">Authenticator code</label>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className={field} />
                <p className="mt-1 text-xs text-regantify-text-muted">This one touches money, so it asks for your code again.</p>
              </div>
            )}
            <button type="button" disabled={!ready || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {m.isPending ? 'Working…' : target.on ? 'Turn on' : 'Pause for everyone'}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
