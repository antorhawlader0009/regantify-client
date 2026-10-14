import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { marketingCmsApi, type Bilingual, type MarketingContent } from '../../../lib/marketingCmsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none focus:border-regantify-text/40';
const newId = () => Math.random().toString(36).slice(2, 12);
const EMPTY_BI: Bilingual = { en: '', bn: '' };

/**
 * Admin > Marketing > Homepage content (super-admin-new.md Step 14): hero text and pictures, testimonials, FAQ, a note under pricing, the featured-stores
 * heading and the search/share text. Every text has English and Bangla; an empty Bangla box shows the English one, and an empty part keeps the
 * homepage's own built-in text, so nothing changes until something is filled in.
 */
export function MarketingContentEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-marketing-content'], queryFn: marketingCmsApi.content });
  const [c, setC] = useState<MarketingContent | null>(null);
  useEffect(() => {
    if (data) setC(structuredClone(data));
  }, [data]);
  const save = useMutation({
    mutationFn: () => marketingCmsApi.saveContent(c!),
    onSuccess: (saved) => {
      qc.setQueryData(['admin-marketing-content'], saved);
      toast.success('Saved. The homepage shows it on the next page load.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the homepage content.')),
  });

  if (isLoading || !c) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const set = (patch: Partial<MarketingContent>) => setC({ ...c, ...patch });
  const move = <T,>(list: T[], i: number, d: -1 | 1): T[] => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-regantify-text-muted">Empty boxes keep the homepage's own text. The Bangla box is optional; without it Bangla visitors read the English.</p>
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium text-regantify-text hover:underline">
          Open the homepage <ExternalLink size={13} />
        </a>
      </div>

      <Card title="Top of the page (hero)">
        <Bi label="Big title" value={c.hero.title} max={120} onChange={(title) => set({ hero: { ...c.hero, title } })} />
        <Bi label="Line under the title" value={c.hero.sub} max={200} onChange={(sub) => set({ hero: { ...c.hero, sub } })} />
        <div>
          <p className="mb-1 text-sm font-medium text-regantify-text">Pictures in the moving strip (up to 6)</p>
          <p className="mb-2 text-xs text-regantify-text-muted">With none added, the homepage keeps its own 4 pictures. Wide pictures work best (about 1600 x 1000).</p>
          <div className="space-y-3">
            {c.hero.slides.map((s, i) => (
              <div key={s.id} className="flex gap-3 rounded-lg border border-line p-3">
                <ImageBox url={s.imageUrl} kind="hero" onChange={(url) => set({ hero: { ...c.hero, slides: c.hero.slides.map((x) => (x.id === s.id ? { ...x, imageUrl: url ?? '' } : x)) } })} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Bi label="Caption" value={s.title} max={80} onChange={(title) => set({ hero: { ...c.hero, slides: c.hero.slides.map((x) => (x.id === s.id ? { ...x, title } : x)) } })} />
                  <Bi label="Small text" value={s.detail} max={160} onChange={(detail) => set({ hero: { ...c.hero, slides: c.hero.slides.map((x) => (x.id === s.id ? { ...x, detail } : x)) } })} />
                </div>
                <RowTools
                  onUp={i > 0 ? () => set({ hero: { ...c.hero, slides: move(c.hero.slides, i, -1) } }) : undefined}
                  onDown={i < c.hero.slides.length - 1 ? () => set({ hero: { ...c.hero, slides: move(c.hero.slides, i, 1) } }) : undefined}
                  onRemove={() => set({ hero: { ...c.hero, slides: c.hero.slides.filter((x) => x.id !== s.id) } })}
                />
              </div>
            ))}
          </div>
          {c.hero.slides.length < 6 && (
            <AddButton onClick={() => set({ hero: { ...c.hero, slides: [...c.hero.slides, { id: newId(), imageUrl: '', title: { ...EMPTY_BI }, detail: { ...EMPTY_BI } }] } })}>Add a picture</AddButton>
          )}
        </div>
      </Card>

      <Card title="What sellers say (testimonials)" hint="Shown as cards below the stores row. The section is hidden while there is none switched on.">
        <Bi label="Section heading" value={c.testimonials.title} max={80} placeholder="What sellers say" onChange={(title) => set({ testimonials: { ...c.testimonials, title } })} />
        <div className="space-y-3">
          {c.testimonials.items.map((t, i) => {
            const upd = (patch: Partial<typeof t>) => set({ testimonials: { ...c.testimonials, items: c.testimonials.items.map((x) => (x.id === t.id ? { ...x, ...patch } : x)) } });
            return (
              <div key={t.id} className={`flex gap-3 rounded-lg border border-line p-3 ${t.enabled ? '' : 'opacity-60'}`}>
                <ImageBox url={t.photoUrl} kind="testimonial" round onChange={(url) => upd({ photoUrl: url })} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className={field} value={t.name} maxLength={60} placeholder="Name" onChange={(e) => upd({ name: e.target.value })} />
                    <input className={`${field} sm:col-span-2`} value={t.role.en} maxLength={80} placeholder="Shop or role, e.g. Owner, Rahim Fashion" onChange={(e) => upd({ role: { ...t.role, en: e.target.value } })} />
                  </div>
                  <input className={field} value={t.role.bn} maxLength={80} placeholder="Shop or role in Bangla (optional)" onChange={(e) => upd({ role: { ...t.role, bn: e.target.value } })} />
                  <Bi label="What they said" value={t.quote} max={400} multiline onChange={(quote) => upd({ quote })} />
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      Stars
                      <select value={t.rating ?? ''} onChange={(e) => upd({ rating: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border border-line px-2 py-1">
                        <option value="">None</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={t.enabled} onChange={(e) => upd({ enabled: e.target.checked })} />
                      Show on the homepage
                    </label>
                  </div>
                </div>
                <RowTools
                  onUp={i > 0 ? () => set({ testimonials: { ...c.testimonials, items: move(c.testimonials.items, i, -1) } }) : undefined}
                  onDown={i < c.testimonials.items.length - 1 ? () => set({ testimonials: { ...c.testimonials, items: move(c.testimonials.items, i, 1) } }) : undefined}
                  onRemove={() => set({ testimonials: { ...c.testimonials, items: c.testimonials.items.filter((x) => x.id !== t.id) } })}
                />
              </div>
            );
          })}
        </div>
        {c.testimonials.items.length < 12 && (
          <AddButton
            onClick={() =>
              set({ testimonials: { ...c.testimonials, items: [...c.testimonials.items, { id: newId(), name: '', role: { ...EMPTY_BI }, quote: { ...EMPTY_BI }, photoUrl: null, rating: 5, enabled: true }] } })
            }
          >
            Add a testimonial
          </AddButton>
        )}
      </Card>

      <Card title="Questions and answers (FAQ)" hint="Once at least one question is switched on, these replace the homepage's own 5 questions.">
        <div className="space-y-3">
          {c.faq.map((f, i) => {
            const upd = (patch: Partial<typeof f>) => set({ faq: c.faq.map((x) => (x.id === f.id ? { ...x, ...patch } : x)) });
            return (
              <div key={f.id} className={`flex gap-3 rounded-lg border border-line p-3 ${f.enabled ? '' : 'opacity-60'}`}>
                <div className="min-w-0 flex-1 space-y-2">
                  <Bi label="Question" value={f.q} max={200} onChange={(q) => upd({ q })} />
                  <Bi label="Answer" value={f.a} max={1000} multiline onChange={(a) => upd({ a })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.enabled} onChange={(e) => upd({ enabled: e.target.checked })} />
                    Show on the homepage
                  </label>
                </div>
                <RowTools onUp={i > 0 ? () => set({ faq: move(c.faq, i, -1) }) : undefined} onDown={i < c.faq.length - 1 ? () => set({ faq: move(c.faq, i, 1) }) : undefined} onRemove={() => set({ faq: c.faq.filter((x) => x.id !== f.id) })} />
              </div>
            );
          })}
        </div>
        {c.faq.length < 20 && <AddButton onClick={() => set({ faq: [...c.faq, { id: newId(), q: { ...EMPTY_BI }, a: { ...EMPTY_BI }, enabled: true }] })}>Add a question</AddButton>}
      </Card>

      <Card title="Pricing and stores">
        <Bi label="Note under the plans (optional)" value={c.pricingNote} max={300} multiline placeholder="Prices include VAT. Pay by bKash, Nagad or card." onChange={(pricingNote) => set({ pricingNote })} />
        <Bi label="Heading over the featured stores" value={c.showcaseTitle} max={80} placeholder="Stores running on Regantify" onChange={(showcaseTitle) => set({ showcaseTitle })} />
        <p className="text-xs text-regantify-text-muted">The plans and prices themselves come from Plans; pick the featured stores under "Banner and stores".</p>
      </Card>

      <Card title="Search and sharing" hint="The page title in the browser tab and Google, and the text and picture shown when the homepage link is shared.">
        <label className="block text-sm font-medium text-regantify-text">
          Title <span className="font-normal text-regantify-text-muted">({c.seo.title.length}/70)</span>
          <input className={`${field} mt-1 font-normal`} value={c.seo.title} maxLength={70} placeholder="Regantify: your own online shop in minutes" onChange={(e) => set({ seo: { ...c.seo, title: e.target.value } })} />
        </label>
        <label className="block text-sm font-medium text-regantify-text">
          Description <span className="font-normal text-regantify-text-muted">({c.seo.description.length}/170)</span>
          <textarea className={`${field} mt-1 font-normal`} rows={2} value={c.seo.description} maxLength={170} onChange={(e) => set({ seo: { ...c.seo, description: e.target.value } })} />
        </label>
        <div>
          <p className="mb-1 text-sm font-medium text-regantify-text">Share picture (optional, about 1200 x 630)</p>
          <ImageBox url={c.seo.imageUrl} kind="share" wide onChange={(url) => set({ seo: { ...c.seo, imageUrl: url } })} />
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-1 flex justify-end bg-gradient-to-t from-white via-white/90 px-1 py-3">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save homepage content'}
        </button>
      </div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-regantify-text">{title}</h2>
        {hint && <p className="text-xs text-regantify-text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** An English and a Bangla box side by side. */
function Bi({ label, value, onChange, max, multiline, placeholder }: { label: string; value: Bilingual; onChange: (v: Bilingual) => void; max: number; multiline?: boolean; placeholder?: string }) {
  const Box = multiline ? 'textarea' : 'input';
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-regantify-text">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Box className={field} value={value.en} maxLength={max} rows={multiline ? 3 : undefined} placeholder={placeholder ? `English: ${placeholder}` : 'English'} onChange={(e) => onChange({ ...value, en: e.target.value })} />
        <Box className={field} value={value.bn} maxLength={max} rows={multiline ? 3 : undefined} placeholder="বাংলা (optional)" onChange={(e) => onChange({ ...value, bn: e.target.value })} />
      </div>
    </div>
  );
}

function ImageBox({ url, kind, onChange, round, wide }: { url: string | null; kind: string; onChange: (url: string | null) => void; round?: boolean; wide?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await marketingCmsApi.upload(file, kind));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the picture.'));
    } finally {
      setBusy(false);
    }
  };
  const size = wide ? 'h-24 w-44' : 'h-20 w-20';
  return (
    <div className="shrink-0 space-y-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`${size} relative grid place-items-center overflow-hidden border border-dashed border-line bg-regantify-search text-regantify-text-muted hover:border-regantify-text/40 ${round ? 'rounded-full' : 'rounded-lg'}`}
        aria-label="Choose a picture"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
      </button>
      {url && (
        <button type="button" onClick={() => onChange(null)} className="block text-xs text-regantify-text-muted hover:text-red-600">
          Remove picture
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
    </div>
  );
}

function RowTools({ onUp, onDown, onRemove }: { onUp?: () => void; onDown?: () => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button type="button" aria-label="Move up" disabled={!onUp} onClick={onUp} className="rounded p-1 hover:bg-regantify-search disabled:opacity-30">
        <ArrowUp size={15} />
      </button>
      <button type="button" aria-label="Move down" disabled={!onDown} onClick={onDown} className="rounded p-1 hover:bg-regantify-search disabled:opacity-30">
        <ArrowDown size={15} />
      </button>
      <button type="button" aria-label="Remove" onClick={onRemove} className="rounded p-1 text-red-600 hover:bg-red-50">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm font-medium text-regantify-text hover:bg-regantify-search">
      <Plus size={15} /> {children}
    </button>
  );
}
