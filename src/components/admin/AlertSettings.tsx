import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAlertsApi } from '../../lib/adminAlertsApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

/**
 * Admin > Settings > Alerts (super-admin-plan.md Step 18): what this person hears about, in the bell and on Telegram. Every role has it; a topic appears only if the
 * role may open the page it leads to. Urgent money problems are also texted to the platform alert phone (Settings > Contact), whoever picked what.
 */
export function AlertSettings() {
  const qc = useQueryClient();
  const [waiting, setWaiting] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['admin-alert-settings'], queryFn: adminAlertsApi.settings, refetchInterval: waiting ? 3000 : false });
  const [picked, setPicked] = useState<string[]>([]);
  const [summary, setSummary] = useState(false);
  useEffect(() => {
    if (!data) return;
    setPicked(data.topics.filter((t) => t.enabled).map((t) => t.key));
    setSummary(data.dailySummary);
  }, [data]);
  // Stop polling once a chat has appeared, or after the link's 10 minutes.
  useEffect(() => {
    if (waiting && (data?.telegram.chats.length ?? 0) > 0) setWaiting(false);
  }, [waiting, data]);
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setWaiting(false), 10 * 60_000);
    return () => clearTimeout(t);
  }, [waiting]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-alert-settings'] });
  const save = useMutation({
    mutationFn: () => adminAlertsApi.saveSettings(picked, summary),
    onSuccess: () => {
      toast.success('Saved.');
      refresh();
      qc.invalidateQueries({ queryKey: ['admin-alerts'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  // The tab is opened right on the click (a browser only lets that happen straight from a click) and sent to
  // Telegram once the link is made; opening it after the request was blocked as a pop-up.
  const tab = useRef<Window | null>(null);
  const connect = useMutation({
    mutationFn: adminAlertsApi.telegramLink,
    onSuccess: (r) => {
      if (tab.current && !tab.current.closed) tab.current.location.href = r.url;
      else window.open(r.url, '_blank');
      tab.current = null;
      setWaiting(true);
    },
    onError: (err) => {
      tab.current?.close();
      tab.current = null;
      toast.error(apiErrorMessage(err, 'Could not make the link.'));
    },
  });
  const startConnect = () => {
    const w = window.open('', '_blank');
    if (w) w.opener = null;
    tab.current = w;
    connect.mutate();
  };
  const test = useMutation({
    mutationFn: adminAlertsApi.telegramTest,
    onSuccess: (r) => (r.sent > 0 ? toast.success('Sent. Check Telegram.') : toast.error('Nothing was sent. Connect Telegram first.')),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the test message.')),
  });
  const remove = useMutation({ mutationFn: adminAlertsApi.telegramRemove, onSuccess: refresh, onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect it.')) });

  if (isLoading || !data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const allowed = data.topics.filter((t) => t.allowed);
  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-sm font-semibold text-regantify-text">What you hear about</h2>
        <p className="mt-0.5 text-xs text-regantify-text-muted">Shown in the bell at the top and sent to your Telegram. Only things your role can open are listed.</p>
        <ul className="mt-3 divide-y divide-black/5">
          {allowed.map((t) => (
            <li key={t.key}>
              <label className="flex cursor-pointer items-center gap-3 py-2.5 text-sm text-regantify-text">
                <input type="checkbox" checked={picked.includes(t.key)} onChange={() => toggle(t.key)} />
                {t.label}
              </label>
            </li>
          ))}
          {allowed.length === 0 && <li className="py-3 text-sm text-regantify-text-muted">Your role has no alerts.</li>}
        </ul>
        {data.canSummary && (
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-regantify-search px-4 py-3 text-sm text-regantify-text">
            <input type="checkbox" className="mt-0.5" checked={summary} onChange={(e) => setSummary(e.target.checked)} />
            <span>
              Daily summary at 9 PM
              <span className="block text-xs text-regantify-text-muted">New stores, platform income, payouts waiting, open tickets and reports, and any payment not applied.</span>
            </span>
          </label>
        )}
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="mt-4 rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-sm font-semibold text-regantify-text">Telegram</h2>
        {!data.telegram.available ? (
          <p className="mt-1 text-sm text-regantify-text-muted">Telegram is not set up on this server (TELEGRAM_BOT_TOKEN), so alerts only show in the bell.</p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-regantify-text-muted">Get the same alerts on your phone. Press Connect, then Start in Telegram. Your own private chat only; send /stop to the bot to disconnect.</p>
            {data.telegram.chats.length > 0 && (
              <ul className="mt-3 divide-y divide-black/5">
                {data.telegram.chats.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="text-regantify-text">{c.title ?? 'Telegram chat'} <span className="text-xs text-regantify-text-muted">· connected {formatDhakaDateTime(c.createdAt)}</span></span>
                    <button type="button" onClick={() => remove.mutate(c.id)} className="text-xs text-red-600 hover:underline">Disconnect</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={connect.isPending} onClick={startConnect} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-regantify-text disabled:opacity-50">
                {data.telegram.chats.length ? 'Connect another chat' : 'Connect Telegram'}
              </button>
              {data.telegram.chats.length > 0 && (
                <button type="button" disabled={test.isPending} onClick={() => test.mutate()} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-regantify-text disabled:opacity-50">
                  Send a test
                </button>
              )}
            </div>
            {waiting && <p className="mt-2 text-xs text-regantify-text-muted">Waiting for you to press Start in Telegram…</p>}
          </>
        )}
      </section>
    </div>
  );
}
