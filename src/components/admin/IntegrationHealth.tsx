import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, CircleDashed, TriangleAlert } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { integrationHealthApi, type AppErrorRow, type IntegrationCard, type IntegrationState } from '../../lib/systemStatusApi';
import { toast } from '../../lib/toast';

const STATE: Record<IntegrationState, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: 'Working', cls: 'text-green-700', Icon: CheckCircle2 },
  shaky: { label: 'Some failing', cls: 'text-red-700', Icon: TriangleAlert },
  down: { label: 'Looks down', cls: 'text-red-700', Icon: CircleAlert },
  idle: { label: 'No calls', cls: 'text-regantify-text-muted', Icon: CircleDashed },
};

const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', hour12: true, timeZone: 'Asia/Dhaka' });

/** 24 hourly bars: calls that worked in gray, failed calls stacked on top in red. Hover a bar for its numbers. */
function HourBars({ hours }: { hours: IntegrationCard['hours'] }) {
  const max = Math.max(1, ...hours.map((h) => h.ok + h.failed));
  const H = 28;
  return (
    <div className="mt-3 flex h-7 items-end gap-[2px]" role="img" aria-label="Calls per hour over the last 24 hours">
      {hours.map((h) => {
        const total = h.ok + h.failed;
        const okH = total ? Math.max(1, Math.round((h.ok / max) * H)) : 0;
        const failH = h.failed ? Math.max(2, Math.round((h.failed / max) * H)) : 0;
        return (
          <div
            key={h.hour}
            title={`${hourLabel(h.hour)}: ${h.ok} worked, ${h.failed} failed`}
            className="flex h-full flex-1 flex-col-reverse items-stretch gap-[2px] rounded-sm hover:bg-black/[0.03]"
          >
            {total === 0 ? (
              <span className="h-px bg-black/10" />
            ) : (
              <>
                {okH > 0 && h.ok > 0 && <span className="rounded-t-[2px] bg-slate-300" style={{ height: okH }} />}
                {failH > 0 && <span className="rounded-t-[2px] bg-red-500" style={{ height: failH }} />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Super Admin > System status > Outside services (super-admin-new.md Step 2). */
export function IntegrationsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['integration-health'], queryFn: integrationHealthApi.integrations, refetchInterval: 60_000 });
  if (isLoading || !data) return <p className="text-sm text-regantify-text-muted">Loading outside services...</p>;
  const trouble = data.cards.filter((c) => c.status === 'down' || c.status === 'shaky').length;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-regantify-text">Outside services</h2>
        <p className="flex items-center gap-3 text-xs text-regantify-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" /> worked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> failed
          </span>
          <span>per hour, last 24 hours</span>
        </p>
      </div>
      {trouble > 0 && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-900">
          {trouble === 1 ? '1 service is' : `${trouble} services are`} failing calls right now. The red bars show when it started.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((c) => {
          const s = STATE[c.status];
          return (
            <div key={c.key} className={`rounded-xl border bg-white p-4 ${c.status === 'down' ? 'border-red-200' : 'border-black/5'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-regantify-text">{c.label}</p>
                <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${s.cls}`}>
                  <s.Icon size={13} /> {s.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-regantify-text-muted">
                {c.ok + c.failed === 0 ? 'No calls in 24 hours' : `${(c.ok + c.failed).toLocaleString()} calls, ${c.failed.toLocaleString()} failed (${c.failedShare}%)`}
              </p>
              <HourBars hours={c.hours} />
              {c.lastError && (
                <p className="mt-2 line-clamp-2 text-xs text-regantify-text-muted" title={c.lastError}>
                  Last failure{c.lastErrorAt ? ` ${formatDhakaDateTime(c.lastErrorAt)}` : ''}: <span className="text-regantify-text">{c.lastError}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      {data.failingWebhookStores.length > 0 && (
        <div className="mt-3 rounded-xl border border-black/5 bg-white p-4">
          <p className="text-sm font-medium text-regantify-text">Stores whose webhooks failed (24 hours)</p>
          <p className="mb-2 text-xs text-regantify-text-muted">Usually the store's own address is down or wrong. Their Settings &gt; Webhooks page shows each try.</p>
          <ul className="divide-y divide-black/5 text-sm">
            {data.failingWebhookStores.map((s) => (
              <li key={s.vendorId} className="flex items-center justify-between gap-3 py-1.5">
                <Link to={`/admin/vendors/${s.vendorId}`} className="truncate text-regantify-text hover:underline">
                  {s.storeName}
                </Link>
                <span className="shrink-0 tabular-nums text-xs text-regantify-text-muted">{s.failed} failed</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Super Admin > System status > Server errors (super-admin-new.md Step 2): unexpected 5xx errors, grouped by kind and place. */
export function ErrorLogSection() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [show, setShow] = useState<'open' | 'resolved'>('open');
  const [openId, setOpenId] = useState<string | null>(params.get('error'));
  const { data, isLoading } = useQuery({ queryKey: ['app-errors', show], queryFn: () => integrationHealthApi.errors(show), refetchInterval: 60_000 });
  const resolve = useMutation({
    mutationFn: integrationHealthApi.resolve,
    onSuccess: () => {
      toast.success('Marked as fixed. If it happens again it comes back here and alerts the team.');
      qc.invalidateQueries({ queryKey: ['app-errors'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not mark it as fixed.')),
  });

  // Opened from an alert link: scroll to it.
  useEffect(() => {
    if (openId && data?.some((e) => e.id === openId)) document.getElementById(`error-${openId}`)?.scrollIntoView({ block: 'center' });
  }, [openId, data]);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-regantify-text">Server errors</h2>
        <div className="flex gap-1 rounded-lg bg-regantify-search p-0.5 text-xs">
          {(['open', 'resolved'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`rounded-md px-2.5 py-1 ${show === k ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
              {k === 'open' ? 'Not fixed' : 'Fixed'}
            </button>
          ))}
        </div>
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-regantify-text-muted">Loading...</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-6 text-center text-sm text-regantify-text-muted">
          {show === 'open' ? 'No unexpected server errors. Refused requests (wrong input, no permission) are not errors and are not listed.' : 'Nothing marked as fixed yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
          {data.map((e) => (
            <ErrorRow key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} onResolve={() => resolve.mutate(e.id)} busy={resolve.isPending} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ErrorRow({ e, open, onToggle, onResolve, busy }: { e: AppErrorRow; open: boolean; onToggle: () => void; onResolve: () => void; busy: boolean }) {
  return (
    <li id={`error-${e.id}`} className={open ? 'bg-neutral-50/60' : ''}>
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-regantify-text">
            {e.name}: {e.message}
          </span>
          <span className="block truncate font-mono text-[11px] text-regantify-text-muted">{e.where}</span>
          <span className="block text-xs text-regantify-text-muted">
            Last {formatDhakaDateTime(e.lastSeenAt)}
            {e.lastPath ? ` on ${e.lastMethod ?? ''} ${e.lastPath}` : ''}
            {e.resolvedAt ? ` - fixed by ${e.resolvedBy ?? 'Super Admin'}` : ''}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs tabular-nums text-red-700">{e.count.toLocaleString()}x</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-xs text-regantify-text-muted">First seen {formatDhakaDateTime(e.firstSeenAt)}.</p>
          {e.stack && <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-100">{e.stack}</pre>}
          {!e.resolvedAt && (
            <button type="button" disabled={busy} onClick={onResolve} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              Mark as fixed
            </button>
          )}
        </div>
      )}
    </li>
  );
}
