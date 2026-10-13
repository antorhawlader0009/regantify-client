import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, Copy, ExternalLink, Loader2, Save, XCircle } from 'lucide-react';
import { DESCRIPTION_IDEAL, seoApi, TITLE_IDEAL, type SeoGrade, type SeoHealth, type SeoSettings } from '../../../lib/seoApi';
import { updateVendorBranding } from '../../../lib/vendorApi';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Checkbox } from '../../../components/ui/Checkbox';
import { AdvancedPanel } from '../../../components/ui/AdvancedToggle';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors';

interface Form {
  title: string;
  description: string;
  allowIndexing: boolean;
  appendStoreName: boolean;
  preferCustomDomain: boolean;
  googleVerification: string;
  bingVerification: string;
}

function fromServer(s: SeoSettings): Form {
  return {
    title: s.store.brandMetaTitle ?? '',
    description: s.store.brandMetaDescription ?? '',
    allowIndexing: s.allowIndexing,
    appendStoreName: s.appendStoreName,
    preferCustomDomain: s.preferCustomDomain,
    googleVerification: s.googleVerification ?? '',
    bingVerification: s.bingVerification ?? '',
  };
}

/** Green inside the length search results show, amber outside, grey when empty. */
function counterTone(length: number, ideal: { min: number; max: number }): string {
  if (length === 0) return 'text-neutral-400';
  return length >= ideal.min && length <= ideal.max ? 'text-emerald-600' : 'text-amber-600';
}

const GRADE_ICON: Record<SeoGrade, JSX.Element> = {
  good: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-label="Good" />,
  warn: <AlertTriangle size={18} className="text-amber-500 shrink-0" aria-label="Could be better" />,
  missing: <XCircle size={18} className="text-red-500 shrink-0" aria-label="Missing" />,
};

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`SEO score ${score} out of 100`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 44 44)" />
      <text x="44" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">
        {score}
      </text>
    </svg>
  );
}

function HealthCard({ health }: { health: SeoHealth | undefined }) {
  if (!health) return <div className="bg-white rounded-2xl border border-black/5 p-6 h-40 animate-pulse" aria-busy />;
  const todo = health.checks.filter((c) => c.grade !== 'good');
  const headline = health.score >= 80 ? 'Your store is in good shape for search.' : health.score >= 50 ? 'A few things would help people find you.' : 'Search engines will struggle to find your store. Start with the items below.';
  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={health.score} />
        <div>
          <h2 className="text-base font-semibold text-regantify-text m-0">Search health</h2>
          <p className="text-sm text-regantify-text-muted mt-1 mb-0">{headline}</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-black/5 list-none p-0 m-0">
        {[...todo, ...health.checks.filter((c) => c.grade === 'good')].map((c) => (
          <li key={c.id} className="flex items-start gap-3 py-2.5">
            {GRADE_ICON[c.grade]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-regantify-text m-0">{c.label}</p>
              <p className="text-xs text-regantify-text-muted m-0 mt-0.5">{c.detail}</p>
            </div>
            {c.grade !== 'good' && c.fixPath && c.fixPath !== '/vendor/store/seo' && (
              <Link to={c.fixPath} className="text-xs font-medium text-regantify-cta hover:underline shrink-0">
                Fix
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono text-xs`} />
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * Store > SEO: how search engines see the store. The home page title, description and share picture are the same fields as
 * Store > Branding (saved with the same call), so there is still one place for each value. Everything else here lives in the
 * StoreSeoSettings row on the server: indexing on/off, " | Store name" after titles, the preferred address, and the Google
 * Search Console / Bing ownership codes. A health check lists what a search engine will and will not find.
 */
export default function Seo() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['seo-settings'], queryFn: seoApi.get });
  const { data: health } = useQuery({ queryKey: ['seo-health'], queryFn: seoApi.health });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (data) setForm(fromServer(data));
  }, [data]);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      // The home title and description are Branding's fields; the rest is this page's own row.
      await updateVendorBranding({ brandMetaTitle: f.title.trim(), brandMetaDescription: f.description.trim() });
      return seoApi.update({
        allowIndexing: f.allowIndexing,
        appendStoreName: f.appendStoreName,
        preferCustomDomain: f.preferCustomDomain,
        googleVerification: f.googleVerification,
        bingVerification: f.bingVerification,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['seo-settings'], updated);
      setForm(fromServer(updated));
      void queryClient.invalidateQueries({ queryKey: ['seo-health'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-branding'] });
      toast.success('SEO settings saved. Search engines pick up the change the next time they visit.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save SEO settings. Please try again.')),
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  if (isLoading || !form || !data) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      </div>
    );
  }

  const store = data.store;
  const storeUrl = store.customDomain ? `https://${store.customDomain}` : storefrontStoreUrl(store.subdomain);
  const displayHost = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const sitemapUrl = `${storeUrl}/sitemap.xml`;
  const shownTitle = form.title.trim() || store.storeName;
  const shownDescription = form.description.trim();
  const dirty = JSON.stringify(form) !== JSON.stringify(fromServer(data));

  const advancedInUse = [form.googleVerification.trim() !== '', form.bingVerification.trim() !== '', !form.appendStoreName].filter(Boolean).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">SEO</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Help people find your store on Google when they search your store name or what you sell.
        </p>
      </div>

      {!form.allowIndexing && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          Your store is hidden from search engines right now. Nobody can find it on Google until you turn that back on below.
        </div>
      )}

      <HealthCard health={health} />

      <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-regantify-text m-0">Home page in search results</h2>
          <p className="text-xs text-regantify-text-muted mt-1 mb-0">This is what appears when someone searches for your store name.</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-sm font-medium text-regantify-text" htmlFor="seo-title">
              Title
            </label>
            <span className={`text-xs tabular-nums ${counterTone(form.title.trim().length, TITLE_IDEAL)}`}>
              {form.title.trim().length} / {TITLE_IDEAL.max}
            </span>
          </div>
          <input id="seo-title" type="text" value={form.title} maxLength={70} onChange={(e) => set('title', e.target.value)} placeholder={store.storeName} className={inputClass} />
          <p className="text-xs text-regantify-text-muted mt-1">
            Say what you sell and where, with your store name, e.g. “{store.storeName} — Mobile accessories in Dhaka”. Aim for {TITLE_IDEAL.min}-{TITLE_IDEAL.max} characters.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-sm font-medium text-regantify-text" htmlFor="seo-description">
              Description
            </label>
            <span className={`text-xs tabular-nums ${counterTone(form.description.trim().length, DESCRIPTION_IDEAL)}`}>
              {form.description.trim().length} / {DESCRIPTION_IDEAL.max}
            </span>
          </div>
          <textarea
            id="seo-description"
            value={form.description}
            maxLength={200}
            rows={3}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What you sell, who it is for, and why to buy from you (delivery, cash on delivery, quality)."
            className={`${inputClass} resize-y`}
          />
          <p className="text-xs text-regantify-text-muted mt-1">
            Aim for {DESCRIPTION_IDEAL.min}-{DESCRIPTION_IDEAL.max} characters. Google may show its own text if this does not match the page.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">Preview on Google</p>
          <div className="rounded-xl border border-black/10 p-4 bg-white">
            <p className="m-0 text-xs text-neutral-600 truncate">{displayHost}</p>
            <p className="m-0 mt-0.5 text-[18px] leading-snug text-[#1a0dab] truncate">{shownTitle}</p>
            <p className="m-0 mt-1 text-sm leading-snug text-neutral-600 line-clamp-2">
              {shownDescription || 'No description yet. Google will pick some text from your page.'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">Preview when the link is shared</p>
          <div className="rounded-xl border border-black/10 overflow-hidden max-w-sm bg-white">
            {store.brandCoverImageUrl ? (
              <img src={store.brandCoverImageUrl} alt="" className="w-full aspect-[1.91/1] object-cover bg-neutral-100" />
            ) : (
              <div className="w-full aspect-[1.91/1] bg-neutral-100 flex items-center justify-center text-xs text-neutral-400 px-4 text-center">No share picture yet</div>
            )}
            <div className="p-3">
              <p className="m-0 text-[11px] uppercase text-neutral-500 truncate">{displayHost}</p>
              <p className="m-0 mt-0.5 text-sm font-semibold text-regantify-text truncate">{shownTitle}</p>
              {shownDescription && <p className="m-0 mt-0.5 text-xs text-neutral-600 line-clamp-2">{shownDescription}</p>}
            </div>
          </div>
          <p className="text-xs text-regantify-text-muted mt-2">
            The picture is your cover photo. <Link to="/vendor/store/branding" className="text-regantify-cta hover:underline">Change it in Branding</Link>.
          </p>
        </div>
      </section>

      <AdvancedPanel id="seo" what="How page titles are named, Google and Bing verification, which address search engines list" inUse={advancedInUse} spaced>
      <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
        <h2 className="text-base font-semibold text-regantify-text m-0">How your pages are named</h2>
        <Checkbox
          checked={form.appendStoreName}
          onChange={(v) => set('appendStoreName', v)}
          label="Add my store name after page titles"
          hint={`A product page then reads “Blue Sneakers | ${store.storeName}” instead of just “Blue Sneakers”. It helps people who search for your store by name.`}
        />
        <Checkbox
          checked={form.allowIndexing}
          onChange={(v) => set('allowIndexing', v)}
          label="Let search engines show my store"
          hint="Turn this off while you are still setting up, and your store stays out of Google. Remember to turn it on again before you launch."
        />
      </section>

      <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-regantify-text m-0">Connect Google Search Console</h2>
          <p className="text-xs text-regantify-text-muted mt-1 mb-0">
            Search Console is Google’s free tool. It tells Google your store exists and shows how people find it. This is the single most useful step to appear at the top for your store name.
          </p>
        </div>
        <ol className="m-0 pl-5 space-y-1.5 text-sm text-regantify-text">
          <li>
            Open{' '}
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-regantify-cta hover:underline inline-flex items-center gap-1">
              Google Search Console <ExternalLink size={12} />
            </a>{' '}
            and add your store as a “URL prefix” property: <span className="font-mono text-xs">{storeUrl}</span>
          </li>
          <li>Choose “HTML tag” as the way to verify, and copy the whole line it shows.</li>
          <li>Paste it below and save. Then go back to Search Console and press Verify.</li>
          <li>Open “Sitemaps” in Search Console and add the address below.</li>
        </ol>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5" htmlFor="seo-google">
            Google verification code
          </label>
          <input
            id="seo-google"
            type="text"
            value={form.googleVerification}
            onChange={(e) => set('googleVerification', e.target.value)}
            placeholder='<meta name="google-site-verification" content="..." />'
            className={`${inputClass} font-mono text-xs`}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-regantify-text-muted mt-1">You can paste the whole line or only the code inside content="…".</p>
        </div>
        <div>
          <p className="text-sm font-medium text-regantify-text mb-1.5">Your sitemap address</p>
          <CopyField value={sitemapUrl} />
          <p className="text-xs text-regantify-text-muted mt-1">New products and pages are added to it by themselves.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5" htmlFor="seo-bing">
            Bing verification code (optional)
          </label>
          <input
            id="seo-bing"
            type="text"
            value={form.bingVerification}
            onChange={(e) => set('bingVerification', e.target.value)}
            placeholder='<meta name="msvalidate.01" content="..." />'
            className={`${inputClass} font-mono text-xs`}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-regantify-text-muted mt-1">
            From{' '}
            <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-regantify-cta hover:underline">
              Bing Webmaster Tools
            </a>
            . Bing also powers DuckDuckGo.
          </p>
        </div>
      </section>

      {store.customDomain && (
        <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
          <h2 className="text-base font-semibold text-regantify-text m-0">Which address should search engines list?</h2>
          <p className="text-xs text-regantify-text-muted m-0">
            Your store opens on <span className="font-mono">{store.customDomain}</span> and on its platform address. Pick one so Google does not split your visitors between two.
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm text-regantify-text cursor-pointer">
              <input type="radio" name="addr" checked={form.preferCustomDomain} onChange={() => set('preferCustomDomain', true)} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
              <span>
                My own domain ({store.customDomain})
                <span className="block text-xs text-regantify-text-muted">Recommended once your domain works. Every page tells Google this is the main address.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-regantify-text cursor-pointer">
              <input type="radio" name="addr" checked={!form.preferCustomDomain} onChange={() => set('preferCustomDomain', false)} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
              <span>
                The address the visitor used
                <span className="block text-xs text-regantify-text-muted">Each address lists itself.</span>
              </span>
            </label>
          </div>
        </section>
      )}
      </AdvancedPanel>

      <section className="rounded-2xl bg-neutral-50 border border-black/5 p-5 text-sm text-regantify-text space-y-2">
        <p className="m-0 font-medium">Good to know</p>
        <ul className="m-0 pl-5 space-y-1 text-xs text-regantify-text-muted">
          <li>Google needs days to weeks to list a new store. Nobody can promise first place, but these steps are what make it possible.</li>
          <li>Your store name in the title, a clear description, your own domain, and Search Console are the biggest wins for a search of your store’s name.</li>
          <li>Each product has its own search title and description on its edit page. Real photos and a written description help most.</li>
          <li>The cart, checkout and account pages are kept out of Google automatically.</li>
        </ul>
      </section>

      <button
        onClick={() => save.mutate(form)}
        disabled={save.isPending || !dirty}
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {save.isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
