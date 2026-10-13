import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { adminAlertsApi } from '../../lib/adminAlertsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

const KEY = ['admin-alerts'];

/** The platform team's bell in the admin top bar (super-admin-plan.md Step 18): what happened on the platform, filtered by this person's role and chosen topics. */
export function AdminBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: KEY, queryFn: adminAlertsApi.feed, refetchInterval: 30_000, retry: false });
  const read = useMutation({ mutationFn: adminAlertsApi.markRead, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const unread = data?.unread ?? 0;
  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={unread ? `${unread} new alerts` : 'Alerts'} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm">
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[64px] z-50 overflow-hidden rounded-xl border border-line bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-sm font-semibold text-regantify-text">Alerts</p>
            <div className="flex items-center gap-3 text-xs">
              {unread > 0 && <button type="button" onClick={() => read.mutate()} className="text-regantify-cta hover:underline">Mark all read</button>}
              <button type="button" onClick={() => { setOpen(false); navigate('/admin/settings?tab=alerts'); }} className="text-regantify-text-muted hover:underline">Choose alerts</button>
            </div>
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {(data?.items ?? []).length === 0 && <li className="px-4 py-8 text-center text-sm text-regantify-text-muted">Nothing yet. New stores, plan payments, withdraw requests and problems show up here.</li>}
            {data?.items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (a.unread) read.mutate();
                    if (a.link) navigate(a.link);
                  }}
                  className={`block w-full px-4 py-3 text-left hover:bg-regantify-content ${a.unread ? 'bg-sky-50/60' : ''}`}
                >
                  <p className="text-sm font-medium text-regantify-text">{a.title}</p>
                  {a.body && <p className="mt-0.5 whitespace-pre-line text-xs text-regantify-text-muted">{a.body}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400">{formatDhakaDateTime(a.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
