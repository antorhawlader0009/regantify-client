import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ScheduledBanner, SiteBannerStyle } from '../../../../lib/designSettingsApi';
import { blankHtmlToEmpty } from '../../../../lib/storeSettingsApi';
import { RichTextEditor } from '../../../../components/editor/RichTextEditor';
import { toast } from '../../../../lib/toast';
import { SaveButton, inputClass } from './designShared';

const DHAKA_MS = 6 * 3600 * 1000;

/** An instant as the Dhaka wall clock `datetime-local` wants (YYYY-MM-DDTHH:mm), or '' for none. */
const toDhakaInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + DHAKA_MS).toISOString().slice(0, 16) : '');
/** What the Dhaka wall clock in a `datetime-local` value means as an instant. */
const fromDhakaInput = (value: string) => (value ? new Date(`${value}:00+06:00`).toISOString() : null);

interface Row {
  id: string;
  content: string;
  from: string;
  to: string;
  style: SiteBannerStyle | '';
  background: string;
}

const toRows = (items: ScheduledBanner[]): Row[] =>
  items.map((b) => ({ id: b.id, content: b.content, from: toDhakaInput(b.startAt), to: toDhakaInput(b.endAt), style: b.style ?? '', background: b.backgroundColor ?? '' }));

/**
 * Store > Design > Site Banner > "Scheduled banners" (TellMe idea 110): banners with their own start and end (Dhaka time), like an Eid offer for three
 * days or a "closed till the 15th" notice. The store shows the one whose time is on now (the one that started last if two overlap); when none is, the
 * usual banner above shows. Nothing to switch off afterwards: it goes by itself when its time ends.
 */
export function ScheduledBanners({ saved, pending, onSave }: { saved: ScheduledBanner[]; pending: boolean; onSave: (items: ScheduledBanner[]) => void }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(saved));
  useEffect(() => setRows(toRows(saved)), [saved]);
  const set = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    const items: ScheduledBanner[] = [];
    for (const [i, r] of rows.entries()) {
      const content = blankHtmlToEmpty(r.content);
      if (!content) {
        toast.error(`Scheduled banner ${i + 1} needs some text.`);
        return;
      }
      const startAt = fromDhakaInput(r.from);
      const endAt = fromDhakaInput(r.to);
      if (startAt && endAt && endAt <= startAt) {
        toast.error(`Scheduled banner ${i + 1} must end after it starts.`);
        return;
      }
      items.push({ id: r.id, content, startAt, endAt, style: r.style || null, backgroundColor: r.background.trim() || null });
    }
    onSave(items);
  };

  const status = (r: Row) => {
    const now = Date.now();
    const start = fromDhakaInput(r.from);
    const end = fromDhakaInput(r.to);
    if (end && Date.parse(end) <= now) return { label: 'Ended', cls: 'bg-neutral-100 text-neutral-600' };
    if (start && Date.parse(start) > now) return { label: 'Waiting', cls: 'bg-amber-100 text-amber-800' };
    return { label: 'Showing now', cls: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="mt-6 max-w-4xl space-y-4 rounded-2xl border border-black/5 bg-white p-5">
      <div>
        <h2 className="text-base font-medium text-regantify-text">Scheduled banners</h2>
        <p className="mt-0.5 text-xs text-regantify-text-muted">
          A banner for a fixed time, such as an Eid offer or a “closed till the 15th” notice. Times are Bangladesh time. It shows by itself from its start and goes by itself at its end, then your usual banner above comes back. If two are on at once, the one that started last shows.
        </p>
      </div>
      {rows.map((r, i) => {
        const st = status(r);
        return (
          <div key={r.id} className="space-y-3 rounded-xl border border-black/10 p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
              <button type="button" onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))} className="flex items-center gap-1 text-xs text-red-600">
                <Trash2 size={14} />
                Remove
              </button>
            </div>
            <RichTextEditor value={r.content} onChange={(html) => set(i, { content: html })} placeholder="Eid offer: 20% off everything till Friday" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-regantify-text-muted">
                Starts (blank = right away)
                <input type="datetime-local" value={r.from} onChange={(e) => set(i, { from: e.target.value })} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs text-regantify-text-muted">
                Ends (blank = no end)
                <input type="datetime-local" value={r.to} onChange={(e) => set(i, { to: e.target.value })} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs text-regantify-text-muted">
                Style
                <select value={r.style} onChange={(e) => set(i, { style: e.target.value as SiteBannerStyle | '' })} className={`${inputClass} mt-1`}>
                  <option value="">Same as the usual banner</option>
                  <option value="MARQUEE">Marquee (scrolling)</option>
                  <option value="STATIC">Static</option>
                </select>
              </label>
              <label className="block text-xs text-regantify-text-muted">
                Background colour (blank = same as the usual banner)
                <input type="text" maxLength={7} value={r.background} onChange={(e) => set(i, { background: e.target.value })} placeholder="#FFE4E6" className={`${inputClass} mt-1`} />
              </label>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        {rows.length < 10 && (
          <button
            type="button"
            onClick={() => setRows((cur) => [...cur, { id: `b${Date.now().toString(36)}`, content: '', from: '', to: '', style: '', background: '' }])}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-regantify-text hover:bg-regantify-search"
          >
            <Plus size={15} />
            Add a scheduled banner
          </button>
        )}
        <SaveButton pending={pending} onClick={submit} />
      </div>
    </div>
  );
}
