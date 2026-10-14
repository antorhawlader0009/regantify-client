import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { adminStep17Api, type MarketingStore } from '../../lib/adminStep17Api';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { MarketingContentEditor } from './marketing/MarketingContentEditor';
import { PlatformBlog } from './marketing/PlatformBlog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

type MarketingTab = 'banner' | 'content' | 'blog';
const TABS: Array<{ id: MarketingTab; label: string }> = [
  { id: 'content', label: 'Homepage content' },
  { id: 'banner', label: 'Banner and stores' },
  { id: 'blog', label: 'Blog' },
];

/**
 * Super Admin > Reach > Marketing: everything the public marketing site says, with no deploy. Homepage content and Blog are super-admin-new.md Step 14;
 * the banner and featured stores are super-admin-plan.md Step 17.
 */
export default function AdminMarketing() {
  const [tab, setTab] = useState<MarketingTab>('content');
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Marketing</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">What the public site (the pages before sign-in) says. Saved changes show on the next page load.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-regantify-black text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'banner' && <BannerAndStores />}
      {tab === 'content' && <MarketingContentEditor />}
      {tab === 'blog' && <PlatformBlog />}
    </div>
  );
}

/** The banner line and the featured stores of the public marketing homepage (super-admin-plan.md Step 17). */
function BannerAndStores() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-marketing'], queryFn: adminStep17Api.marketing });
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [featured, setFeatured] = useState<MarketingStore[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!data) return;
    setText(data.bannerText);
    setLink(data.bannerLink);
    setFeatured(data.featured.map((f) => ({ id: f.id, name: f.name, subdomain: f.subdomain, logoUrl: f.logoUrl })));
  }, [data]);
  const { data: found = [] } = useQuery({ queryKey: ['admin-marketing-stores', q], queryFn: () => adminStep17Api.marketingStores(q), enabled: q.trim().length >= 2 });
  const save = useMutation({
    mutationFn: () => adminStep17Api.saveMarketing({ bannerText: text.trim(), bannerLink: link.trim(), featuredStoreIds: featured.map((f) => f.id) }),
    onSuccess: () => {
      toast.success('Saved. The homepage updates within a minute.');
      qc.invalidateQueries({ queryKey: ['admin-marketing'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const move = (i: number, d: -1 | 1) =>
    setFeatured((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  if (isLoading) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const linkOk = !link.trim() || /^(https?:\/\/|\/)/.test(link.trim());
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-regantify-text-muted">A banner line at the top of the homepage and a row of featured stores.</p>

      <section className="space-y-3 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-sm font-semibold text-regantify-text">Banner</h2>
        <label className="block text-sm font-medium text-regantify-text">
          Text (empty = no banner)
          <input className={`${field} mt-1.5 font-normal`} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Eid offer: 30% off every paid plan until Friday" />
        </label>
        <label className="block text-sm font-medium text-regantify-text">
          Link (optional)
          <input className={`${field} mt-1.5 font-normal`} value={link} maxLength={300} onChange={(e) => setLink(e.target.value)} placeholder="/vendor/signup or https://…" />
        </label>
        {!linkOk && <p className="text-xs text-red-600">The link must start with https:// or /</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-sm font-semibold text-regantify-text">Featured stores <span className="font-normal text-regantify-text-muted">(up to 12, shown in this order)</span></h2>
        {featured.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">None yet. The homepage shows no stores row.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {featured.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 py-2">
                {f.logoUrl ? <img src={f.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-regantify-search text-xs font-semibold text-regantify-text-muted">{f.name.slice(0, 1)}</span>}
                <span className="min-w-0 flex-1 truncate text-sm text-regantify-text">{f.name} <span className="text-xs text-regantify-text-muted">{f.subdomain}</span></span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-regantify-search disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" aria-label="Move down" disabled={i === featured.length - 1} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-regantify-search disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" aria-label="Remove" onClick={() => setFeatured((l) => l.filter((x) => x.id !== f.id))} className="rounded p-1 text-red-600 hover:bg-red-50"><X size={15} /></button>
              </li>
            ))}
          </ul>
        )}
        {featured.length < 12 && (
          <div>
            <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a store: type its name or address" />
            {q.trim().length >= 2 && (
              <ul className="mt-2 divide-y divide-black/5 rounded-xl border border-black/5">
                {found.filter((s) => !featured.some((f) => f.id === s.id)).length === 0 && <li className="px-3 py-2 text-sm text-regantify-text-muted">No active store matches.</li>}
                {found.filter((s) => !featured.some((f) => f.id === s.id)).map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => { setFeatured((l) => [...l, s]); setQ(''); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-regantify-search">
                      <span>{s.name} <span className="text-xs text-regantify-text-muted">{s.subdomain}</span></span>
                      <span className="text-xs text-regantify-cta">Add</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <button type="button" disabled={!linkOk || save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
