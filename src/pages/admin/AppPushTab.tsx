import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { appPushAdminApi, type PlatformPushKind } from '../../lib/appPushAdminApi';
import { toast } from '../../lib/toast';

const fieldBox = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const panel = 'rounded-xl border border-line bg-white';
const KIND_LABEL: Record<PlatformPushKind, string> = { FLASH_SALE: 'Flash sale', NEWS: 'News' };

/**
 * Super Admin > Platform > Shop > App push (MARKETPLACE-APP-plan.md Step 13): one message to every phone that has the Regantify app, through the
 * same slow promotion queue as a shop's offers. It lands in the app's inbox under "Platform". Two a day at most, 8 AM to 10 PM Dhaka only.
 */
export default function AppPushTab() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ['admin-app-push'], queryFn: appPushAdminApi.overview });
  const [kind, setKind] = useState<PlatformPushKind>('FLASH_SALE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => appPushAdminApi.send({ kind, title: title.trim(), body: body.trim() }),
    onSuccess: (r) => {
      toast.success(`Queued for ${r.queued} phones.`);
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['admin-app-push'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  const o = overview.data;
  if (overview.isLoading || !o) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const ready = title.trim().length >= 3 && body.trim().length >= 3 && o.canSendNow && !send.isPending;

  return (
    <div className="space-y-5">
      <section className={`${panel} space-y-4 p-4`}>
        <div>
          <h2 className="text-sm font-semibold text-regantify-text">Push to everyone with the app</h2>
          <p className="mt-1 text-xs text-regantify-text-muted">
            Reaches {o.phones} {o.phones === 1 ? 'phone' : 'phones'} seen in the last 30 days. Sent slowly through the same queue as shop offers, so order updates are never held back. A tap opens the app on Home.
            Shoppers can silence these in the phone's settings (channel "Regantify news"). Today {o.sentToday} of {o.perDay} sent; 8 AM to 10 PM Dhaka only.
          </p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(KIND_LABEL) as PlatformPushKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${kind === k ? 'border-regantify-cta bg-regantify-cta text-white' : 'border-line text-regantify-text'}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="block text-sm text-regantify-text">
          Title
          <input className={`${fieldBox} mt-1`} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Flash sale starts now" />
        </label>
        <label className="block text-sm text-regantify-text">
          Message
          <textarea className={`${fieldBox} mt-1`} rows={3} value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} placeholder="Up to 50% off on thousands of products. Ends at midnight." />
        </label>
        {!o.canSendNow && <p className="text-xs text-red-600">{o.sentToday >= o.perDay ? 'The daily limit is reached. Try again tomorrow.' : 'Push can only go out between 8 AM and 10 PM Dhaka time.'}</p>}
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (window.confirm(`Send this to ${o.phones} phones now? It cannot be taken back.`)) send.mutate();
          }}
          className="rounded-lg bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? 'Sending...' : 'Send to the app'}
        </button>
      </section>

      <section className={`${panel} overflow-x-auto`}>
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">Sent before</h2>
        {o.history.length === 0 ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">Nothing sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Message</th>
                <th className="px-4">Kind</th>
                <th className="px-4">Phones</th>
                <th className="px-4">When</th>
              </tr>
            </thead>
            <tbody>
              {o.history.map((r) => (
                <tr key={r.id}>
                  <td className="px-4">
                    <p className="text-regantify-text">{r.title}</p>
                    <p className="text-xs text-regantify-text-muted">{r.body}</p>
                  </td>
                  <td className="px-4 text-xs">{KIND_LABEL[r.kind] ?? r.kind}</td>
                  <td className="px-4 text-xs">{r.queued}</td>
                  <td className="px-4 text-xs">{formatDhakaDateTime(r.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
