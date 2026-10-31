import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ImagePlus, Loader2, X } from 'lucide-react';
import { SectionCard, Field } from '../../../components/product/ProductFormPieces';
import { Can } from '../../../lib/useStaffAccess';
import { APP_AUDIENCE_OPTIONS, appNotificationsApi, type AppAudience, type AppCampaign } from '../../../lib/appNotificationsApi';
import { customersApi } from '../../../lib/customersApi';
import { productsApi } from '../../../lib/productsApi';
import { mediaApi } from '../../../lib/mediaApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { dhakaInputToIso, nowDhakaInput } from '../../../lib/dhakaInput';

const input = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none';

const STATUS_TEXT: Record<AppCampaign['status'], string> = {
  SCHEDULED: 'Scheduled',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function CampaignRow({ c, onCancel, cancelling }: { c: AppCampaign; onCancel: () => void; cancelling: boolean }) {
  const audience = APP_AUDIENCE_OPTIONS.find((a) => a.value === c.audience)?.label ?? c.audience;
  return (
    <li className="space-y-1 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.title || '(no title)'}</p>
          <p className="truncate text-xs text-neutral-600">{c.body}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${c.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-700'}`}>{STATUS_TEXT[c.status]}</span>
      </div>
      <p className="text-xs text-neutral-500">
        {audience} · {c.status === 'SCHEDULED' ? `goes out ${when(c.sendAt)}` : when(c.sendAt)}
      </p>
      {c.status === 'SENDING' && c.recipients !== null && (
        <p className="text-xs text-neutral-700">
          Sending, {c.processed} of {c.recipients} done
        </p>
      )}
      {c.status === 'SENT' && (
        <p className="text-xs text-neutral-700">
          Sent to {c.recipients ?? 0} {c.recipients === 1 ? 'shopper' : 'shoppers'} ({c.devicesQueued} {c.devicesQueued === 1 ? 'phone' : 'phones'}). {c.noApp} in the audience did not get it: no app, or they muted your shop.
        </p>
      )}
      {c.status === 'FAILED' && c.error && <p className="text-xs text-red-700">{c.error}</p>}
      {c.status === 'SCHEDULED' && (
        <Can perm="sms.manage">
          <button type="button" disabled={cancelling} onClick={onCancel} className="text-xs text-neutral-700 underline disabled:opacity-60">
            Cancel this one
          </button>
        </Can>
      )}
    </li>
  );
}

/**
 * Marketing > App notifications (STORE-APP-plan.md Step 7): a notification to the shoppers who have the Regantify app. Free, no SMS credits.
 * The title always starts with your shop's name. Between 8 AM and 10 PM only. Never to blocked customers, customers with "No promotional SMS",
 * or shoppers who muted your shop. How many you can send a day is set by the platform.
 */
export default function AppNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['app-notifications'],
    queryFn: appNotificationsApi.list,
    refetchInterval: (q) => (q.state.data?.campaigns.some((c) => c.status === 'SENDING') ? 5000 : false),
  });
  const tags = useQuery({ queryKey: ['customer-tags'], queryFn: customersApi.listTags });
  const products = useQuery({ queryKey: ['app-notify-products'], queryFn: () => productsApi.list({ visibility: 'PUBLIC', perPage: 100 }) });

  const [audience, setAudience] = useState<AppAudience>('FOLLOWERS');
  const [days, setDays] = useState('30');
  const [tag, setTag] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [linkKind, setLinkKind] = useState<'HOME' | 'PRODUCT' | 'PATH'>('HOME');
  const [productSlug, setProductSlug] = useState('');
  const [path, setPath] = useState('');
  const [later, setLater] = useState(false);
  const [sendAt, setSendAt] = useState('');

  const needsDays = audience === 'RECENT' || audience === 'INACTIVE';
  const target = { audience, ...(needsDays ? { days: Number(days) || 30 } : {}), ...(audience === 'TAG' ? { tag } : {}) };
  const ready = !(audience === 'TAG' && !tag);
  const preview = useQuery({
    queryKey: ['app-notifications', 'preview', target],
    queryFn: () => appNotificationsApi.preview(target),
    enabled: ready,
  });

  const linkPath = linkKind === 'PRODUCT' ? (productSlug ? `/p/${productSlug}` : '') : linkKind === 'PATH' ? path.trim() : '';
  const sendIso = later ? dhakaInputToIso(sendAt) : null;
  const problem = !body.trim() ? 'Write the message.' : later && !sendIso ? 'Pick the date and time.' : linkKind === 'PRODUCT' && !productSlug ? 'Pick the product.' : null;

  const send = useMutation({
    mutationFn: () =>
      appNotificationsApi.create({
        ...target,
        title: title.trim(),
        body: body.trim(),
        ...(imageUrl ? { imageUrl } : {}),
        ...(linkPath ? { linkPath } : {}),
        ...(later && sendIso ? { sendAt: sendIso } : {}),
      }),
    onSuccess: () => {
      toast.success(later ? 'Scheduled' : 'Sending now');
      setTitle('');
      setBody('');
      setImageUrl('');
      setLater(false);
      setSendAt('');
      void queryClient.invalidateQueries({ queryKey: ['app-notifications'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send. Try again.')),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => appNotificationsApi.cancel(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['app-notifications'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel.')),
  });

  async function pickImage(file: File) {
    setUploading(true);
    try {
      setImageUrl((await mediaApi.upload(file)).url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the picture.'));
    } finally {
      setUploading(false);
    }
  }

  const data = list.data;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Bell size={20} /> App notifications
        </h1>
        <p className="text-sm text-neutral-600">
          Send an offer or news to shoppers who have the Regantify app. It is free and uses no SMS credits. Your shop's name always comes first in the title.
        </p>
      </div>

      {data && !data.pushOn && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">App notifications are not switched on for the platform yet. You can schedule one, but nothing goes out until they are.</p>}

      <SectionCard title="New notification">
        <div className="space-y-4">
          <Field label="Who gets it">
            <select className={input} value={audience} onChange={(e) => setAudience(e.target.value as AppAudience)}>
              {APP_AUDIENCE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">{APP_AUDIENCE_OPTIONS.find((a) => a.value === audience)?.hint}</p>
          </Field>
          {needsDays && (
            <Field label="Number of days">
              <input className={`${input} max-w-[140px]`} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
            </Field>
          )}
          {audience === 'TAG' && (
            <Field label="Tag">
              <select className={input} value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Pick a tag</option>
                {(tags.data ?? []).map((t) => (
                  <option key={t.tag} value={t.tag}>
                    {t.tag} ({t.count})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <p className="text-sm text-neutral-700">
            {!ready ? 'Pick a tag to see how many.' : preview.isLoading ? 'Counting...' : preview.data ? `${preview.data.withApp} of ${preview.data.audience} ${preview.data.audience === 1 ? 'person has' : 'people have'} the app right now.` : ''}
          </p>

          <Field label="Title" hint="Optional. Shown after your shop's name.">
            <input className={input} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Eid sale is on" />
          </Field>
          <Field label="Message" hint={`${body.length} of 250`}>
            <textarea className={input} rows={3} maxLength={250} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Up to 30 percent off on all panjabis until Friday." />
          </Field>

          <Field label="Picture (optional)">
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="h-16 w-28 rounded-lg object-cover" />
                <button type="button" onClick={() => setImageUrl('')} className="inline-flex items-center gap-1 text-xs text-neutral-700 underline">
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-700">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? 'Uploading...' : 'Add a picture'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && void pickImage(e.target.files[0])} />
              </label>
            )}
          </Field>

          <Field label="Opens">
            <select className={input} value={linkKind} onChange={(e) => setLinkKind(e.target.value as 'HOME' | 'PRODUCT' | 'PATH')}>
              <option value="HOME">My shop's home page</option>
              <option value="PRODUCT">A product</option>
              <option value="PATH">Another page of my shop</option>
            </select>
            {linkKind === 'PRODUCT' && (
              <select className={`${input} mt-2`} value={productSlug} onChange={(e) => setProductSlug(e.target.value)}>
                <option value="">Pick a product</option>
                {(products.data?.products ?? []).map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {linkKind === 'PATH' && <input className={`${input} mt-2`} value={path} onChange={(e) => setPath(e.target.value)} placeholder="/page/about-us" />}
          </Field>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium">When</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={!later} onChange={() => setLater(false)} className="accent-neutral-900" /> Send now
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={later} onChange={() => setLater(true)} className="accent-neutral-900" /> Send later
            </label>
            {later && (
              <div>
                <input type="datetime-local" className={`${input} max-w-[240px]`} min={nowDhakaInput()} value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                <p className="mt-1 text-xs text-neutral-500">Bangladesh time, between 8 AM and 10 PM.</p>
              </div>
            )}
          </fieldset>

          <div className="rounded-xl bg-neutral-100 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">What the shopper sees</p>
            <p className="mt-1 font-medium">Your shop name{title.trim() ? `: ${title.trim()}` : ''}</p>
            <p className="text-neutral-700">{body.trim() || 'Your message'}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">{data ? `You can send ${data.perDay} a day. ${data.leftToday} left today.` : ''}</p>
            <Can perm="sms.manage">
              <button
                type="button"
                disabled={send.isPending || !!problem || !ready}
                onClick={() => send.mutate()}
                title={problem ?? undefined}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {send.isPending ? 'Working...' : later ? 'Schedule' : 'Send now'}
              </button>
            </Can>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sent and scheduled">
        {list.isLoading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : data && data.campaigns.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {data.campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} onCancel={() => cancel.mutate(c.id)} cancelling={cancel.isPending} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Nothing sent yet.</p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          The report shows how many shoppers and phones it was handed to. Whether a phone showed it, or the shopper opened it, is not reported yet.
        </p>
      </SectionCard>
    </div>
  );
}
