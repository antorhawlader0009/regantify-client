import { useEffect, useState } from 'react';
import { useDashboardView } from '../../../lib/useDashboardView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff, Pin, PinOff, RefreshCw, Youtube } from 'lucide-react';
import { SectionCard } from '../../../components/product/ProductFormPieces';
import { AdvancedHint } from '../../../components/ui/AdvancedToggle';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { socialFeedApi, type SocialFeedSettings, type SocialFeedState } from '../../../lib/socialFeedApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const inputClass = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';
const MAX_PINNED = 6;

const count = (n: number | null) => (n == null ? null : n.toLocaleString('en-US'));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');

/**
 * Store > Content > Social Feed (SOCIAL-FEED-plan.md). Version 1 shows the store's YouTube channel: the seller pastes the channel link once and the
 * newest videos appear on the StorePal home page by themselves (read every few hours). Videos can be hidden or pinned. Instagram, Facebook and
 * TikTok come later (they need the platforms' app approval).
 */
export default function SocialFeed() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['social-feed'], queryFn: socialFeedApi.state });
  const [form, setForm] = useState<SocialFeedSettings | null>(null);
  const [channel, setChannel] = useState('');
  const [advOpen, setAdv] = useState(false);
  // Simple mode never shows these options (SIMPLE-VIEW-plan.md Step 4).
  const { isSimple } = useDashboardView();
  const adv = !isSimple && advOpen;
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  const apply = (next: SocialFeedState) => {
    queryClient.setQueryData(['social-feed'], next);
    setForm(next.settings);
  };
  const onError = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));

  const save = useMutation({
    mutationFn: (s: Partial<SocialFeedSettings>) => socialFeedApi.saveSettings(s),
    onSuccess: (next) => {
      apply(next);
      toast.success('Saved. Your storefront will reflect this shortly.');
    },
    onError: onError('Could not save. Please try again.'),
  });
  const connect = useMutation({
    mutationFn: () => socialFeedApi.connectYoutube(channel),
    onSuccess: (next) => {
      apply(next);
      setChannel('');
      toast.success(next.settings.enabled ? 'Channel connected.' : 'Channel connected. Turn the section on to show it on your store.');
    },
    onError: onError('Could not connect the channel. Please try again.'),
  });
  const disconnect = useMutation({
    mutationFn: socialFeedApi.disconnectYoutube,
    onSuccess: (next) => {
      apply(next);
      setConfirmOff(false);
      toast.success('Channel removed from your store.');
    },
    onError: onError('Could not remove the channel. Please try again.'),
  });
  const sync = useMutation({
    mutationFn: socialFeedApi.syncYoutube,
    onSuccess: (next) => {
      apply(next);
      toast.success('Latest videos read from YouTube.');
    },
    onError: onError('Could not read the channel. Please try again.'),
  });
  const updatePost = useMutation({
    mutationFn: (v: { id: string; hidden?: boolean; pinned?: boolean }) => socialFeedApi.updatePost(v.id, { hidden: v.hidden, pinned: v.pinned }),
    onSuccess: apply,
    onError: onError('Could not change the video. Please try again.'),
  });

  if (isLoading || !data || !form) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Social Feed</h1>
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  const yt = data.youtube;
  const pinnedCount = data.posts.filter((p) => p.pinOrder != null).length;
  const shown = form.columns * form.rows;
  const advancedInUse = (form.columns !== 3 ? 1 : 0) + (form.rows !== 2 ? 1 : 0) + (!form.showHeader ? 1 : 0);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Social Feed</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Show your newest YouTube videos on your store’s home page. Connect your channel once; new videos appear by themselves. Move the section in Store &gt; Design &gt; Customize. Works on the StorePal theme only.
      </p>

      <div className="space-y-4">
        <SectionCard title="YouTube channel">
          {!data.youtubeReady && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              YouTube is not set up on this server yet. Please contact support.
            </p>
          )}
          {yt ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {yt.avatarUrl ? <img src={yt.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <Youtube size={40} className="text-red-600" />}
                <div className="min-w-0 flex-1">
                  <a href={yt.profileUrl} target="_blank" rel="noreferrer" className="block truncate font-semibold text-regantify-text hover:underline">
                    {yt.title}
                  </a>
                  <p className="text-xs text-neutral-500">
                    {[yt.handle ? `@${yt.handle}` : null, count(yt.followers) ? `${count(yt.followers)} subscribers` : null, count(yt.postsCount) ? `${count(yt.postsCount)} videos` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-neutral-500">Last read: {when(yt.lastSyncAt)}</p>
                </div>
                <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending || !data.youtubeReady} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-50">
                  <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} />
                  Read now
                </button>
                <button type="button" onClick={() => setConfirmOff(true)} className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  Disconnect
                </button>
              </div>
              {yt.status === 'ERROR' && yt.lastError && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {yt.lastError}
                </p>
              )}
            </div>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (channel.trim()) connect.mutate();
              }}
            >
              <input type="text" value={channel} onChange={(e) => setChannel(e.target.value)} maxLength={300} placeholder="youtube.com/@yourchannel or @yourchannel" className={inputClass} />
              <button type="submit" disabled={connect.isPending || !channel.trim() || !data.youtubeReady} className="shrink-0 rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
                {connect.isPending ? 'Connecting…' : 'Connect'}
              </button>
            </form>
          )}
          {!yt && <p className="mt-2 text-xs text-neutral-500">Open your channel on YouTube and copy the address from the browser. No YouTube login is needed; only public videos are shown.</p>}
        </SectionCard>

        <SectionCard title="On your store">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Show the videos on my home page
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-regantify-text">Section title</label>
              <input type="text" value={form.title} maxLength={60} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Watch us on YouTube" className={inputClass} />
            </div>
            <AdvancedHint open={adv} onToggle={() => setAdv((v) => !v)} inUse={advancedInUse} what="columns, rows, channel header" />
            {adv && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-regantify-text">Videos per row (computer)</label>
                  <select value={form.columns} onChange={(e) => setForm({ ...form, columns: Number(e.target.value) as 3 | 4 | 6 })} className={inputClass}>
                    {[3, 4, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-regantify-text">Rows</label>
                  <select value={form.rows} onChange={(e) => setForm({ ...form, rows: Number(e.target.value) })} className={inputClass}>
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-regantify-text">
                  <input type="checkbox" checked={form.showHeader} onChange={(e) => setForm({ ...form, showHeader: e.target.checked })} />
                  Show the channel name and subscribers
                </label>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => save.mutate(form)} disabled={save.isPending || !dirty} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <span className="text-xs text-neutral-500">Your store shows up to {shown} videos.</span>
            </div>
          </div>
        </SectionCard>

        {yt && (
          <SectionCard title="Videos" description={`Newest first. Pinned videos (up to ${MAX_PINNED}) come before the newest; hidden ones never show on your store.`}>
            {data.posts.length === 0 ? (
              <p className="text-sm text-neutral-500">No public videos were found on this channel yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.posts.map((p) => (
                  <div key={p.id} className={`overflow-hidden rounded-xl border border-black/5 bg-white ${p.hidden ? 'opacity-50' : ''}`}>
                    <a href={p.permalink} target="_blank" rel="noreferrer" className="relative block aspect-video bg-neutral-100">
                      <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {p.pinOrder != null && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Pinned {p.pinOrder}</span>}
                    </a>
                    <div className="space-y-2 p-2">
                      <p className="line-clamp-2 text-xs text-regantify-text">{p.title}</p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => updatePost.mutate({ id: p.id, pinned: p.pinOrder == null })}
                          disabled={updatePost.isPending || (p.pinOrder == null && pinnedCount >= MAX_PINNED)}
                          title={p.pinOrder == null ? 'Pin before the newest' : 'Unpin'}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                        >
                          {p.pinOrder == null ? <Pin size={13} /> : <PinOff size={13} />}
                          {p.pinOrder == null ? 'Pin' : 'Unpin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePost.mutate({ id: p.id, hidden: !p.hidden })}
                          disabled={updatePost.isPending}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                        >
                          {p.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                          {p.hidden ? 'Show' : 'Hide'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </div>

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Disconnect the channel?"
        message="The videos leave your store at once. Your YouTube channel itself is not touched, and you can connect it again any time."
        confirmLabel="Disconnect"
        danger
        busy={disconnect.isPending}
        onConfirm={() => disconnect.mutate()}
      />
    </div>
  );
}
