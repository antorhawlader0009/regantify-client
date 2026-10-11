import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  FEATURE_LABEL,
  TONE_LABEL,
  adminAnnouncementsApi,
  type AdminAnnouncement,
  type AnnouncementFeature,
  type AnnouncementTone,
  type PlanCodeValue,
  type SaveAnnouncement,
} from '../../lib/announcementsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const PLAN_CODES: PlanCodeValue[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];
const DHAKA_MS = 6 * 3600 * 1000;
const toInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + DHAKA_MS).toISOString().slice(0, 16) : '');
const fromInput = (v: string) => (v ? new Date(`${v}:00+06:00`).toISOString() : null);
const field = 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-regantify-cta focus:outline-none';

interface Form {
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  tone: AnnouncementTone;
  planCodes: PlanCodeValue[];
  feature: AnnouncementFeature | '';
  startsAt: string;
  endsAt: string;
}
const BLANK: Form = { title: '', body: '', linkLabel: '', linkUrl: '', tone: 'INFO', planCodes: [], feature: '', startsAt: '', endsAt: '' };

const statusOf = (a: AdminAnnouncement) => {
  const now = Date.now();
  if (new Date(a.startsAt).getTime() > now) return 'Scheduled';
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return 'Ended';
  return 'Live';
};

/**
 * Super Admin > Announcements (TellMe idea 131): tell every store (or one plan, or the stores with a feature such as POS)
 * about a new feature, maintenance or a holiday. Stores see a thin banner on top of their dashboard that they can close, and a
 * row in the bell. Times are Dhaka time. Nothing is sent by SMS or push. "Closed by" counts the stores that closed the banner.
 */
export default function Announcements() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-announcements'], queryFn: adminAnnouncementsApi.list });

  const save = useMutation({
    mutationFn: () => {
      const body: SaveAnnouncement = {
        title: form.title,
        body: form.body,
        linkLabel: form.linkLabel || null,
        linkUrl: form.linkUrl || null,
        tone: form.tone,
        planCodes: form.planCodes,
        feature: form.feature || null,
        startsAt: fromInput(form.startsAt),
        endsAt: fromInput(form.endsAt),
      };
      return editing === 'new' || editing === null ? adminAnnouncementsApi.create(body) : adminAnnouncementsApi.update(editing, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setEditing(null);
      toast.success('Announcement saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the announcement.')),
  });
  const remove = useMutation({
    mutationFn: adminAnnouncementsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });

  const edit = (a: AdminAnnouncement) => {
    setForm({ title: a.title, body: a.body, linkLabel: a.linkLabel ?? '', linkUrl: a.linkUrl ?? '', tone: a.tone, planCodes: a.planCodes, feature: a.feature ?? '', startsAt: toInput(a.startsAt), endsAt: toInput(a.endsAt) });
    setEditing(a.id);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">Announcements</h1>
        <button
          type="button"
          onClick={() => {
            setForm(BLANK);
            setEditing('new');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white"
        >
          <Plus size={15} /> New announcement
        </button>
      </div>

      {editing && (
        <div className="mb-6 space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <input className={field} maxLength={120} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={field} rows={3} maxLength={1000} placeholder="Message (plain text)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} maxLength={40} placeholder="Button text (optional)" value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} />
            <input className={field} maxLength={300} placeholder="Button link: https://… or /vendor/…" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Type
              <select className={`${field} mt-1`} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value as AnnouncementTone })}>
                {(Object.keys(TONE_LABEL) as AnnouncementTone[]).map((t) => (
                  <option key={t} value={t}>
                    {TONE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              From (Dhaka time, empty = now)
              <input type="datetime-local" className={`${field} mt-1`} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </label>
            <label className="text-sm">
              Until (empty = until deleted)
              <input type="datetime-local" className={`${field} mt-1`} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </label>
          </div>
          <div className="text-sm">
            <p className="mb-1 font-medium">Who sees it</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {PLAN_CODES.map((c) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.planCodes.includes(c)}
                    onChange={(e) => setForm({ ...form, planCodes: e.target.checked ? [...form.planCodes, c] : form.planCodes.filter((x) => x !== c) })}
                  />
                  {c}
                </label>
              ))}
              <label className="flex items-center gap-1.5">
                Only stores with
                <select className="rounded-lg border border-black/10 px-2 py-1" value={form.feature} onChange={(e) => setForm({ ...form, feature: e.target.value as AnnouncementFeature | '' })}>
                  <option value="">any feature</option>
                  {(Object.keys(FEATURE_LABEL) as AnnouncementFeature[]).map((f) => (
                    <option key={f} value={f}>
                      {FEATURE_LABEL[f]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-1 text-xs text-black/50">No plan ticked = every plan.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-black/10 px-3.5 py-2 text-sm">
              Cancel
            </button>
            <button type="button" disabled={save.isPending || !form.title.trim() || !form.body.trim()} onClick={() => save.mutate()} className="rounded-lg bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-black/50">No announcements yet.</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
          {data.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold">
                  {a.title} <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-normal">{statusOf(a)}</span>{' '}
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-normal">{TONE_LABEL[a.tone]}</span>
                </p>
                <p className="m-0 mt-0.5 whitespace-pre-line text-black/70">{a.body}</p>
                <p className="m-0 mt-1 text-xs text-black/50">
                  {a.planCodes.length ? a.planCodes.join(', ') : 'All plans'}
                  {a.feature ? ` · with ${FEATURE_LABEL[a.feature]}` : ''} · closed by {a.dismissedCount} {a.dismissedCount === 1 ? 'store' : 'stores'}
                </p>
              </div>
              <button type="button" aria-label="Edit" onClick={() => edit(a)} className="rounded p-1.5 hover:bg-black/5">
                <Pencil size={15} />
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={() => window.confirm('Delete this announcement? It disappears for every store.') && remove.mutate(a.id)}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
