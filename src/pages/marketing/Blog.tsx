import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import SiteNav, { readStoredLang, readStoredNight, storeLang, storeNight, type NavLang } from '../../components/marketing/SiteNav';
import { Markdown } from '../../components/help/Markdown';
import { publicSiteApi } from '../../lib/marketingCmsApi';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { usePageMeta } from '../../lib/pageMeta';

/** The page's language and day/night, shared with the homepage through the same stored choices. */
function useSiteChrome() {
  const [lang, setLang] = useState<NavLang>(readStoredLang);
  const [night, setNight] = useState(readStoredNight);
  return {
    lang,
    night,
    toggleLang: () => setLang((l) => {
      const next: NavLang = l === 'en' ? 'bn' : 'en';
      storeLang(next);
      return next;
    }),
    toggleNight: () => setNight((n) => {
      storeNight(!n);
      return !n;
    }),
  };
}

/**
 * /blog (super-admin-new.md Step 14): the platform's own articles, written in Admin > Marketing > Blog. Articles are written in one language, so the
 * language switch changes only the page's own words.
 */
export default function Blog() {
  const ui = useSiteChrome();
  const { data, isLoading } = useQuery({ queryKey: ['public-blog'], queryFn: publicSiteApi.blog, staleTime: 5 * 60_000 });
  const bn = ui.lang === 'bn';
  usePageMeta(bn ? 'ব্লগ | Regantify' : 'Blog | Regantify', bn ? 'অনলাইনে বিক্রির টিপস আর Regantify-র খবর।' : 'Selling tips and news from Regantify.');

  return (
    <div className={ui.night ? 'dark' : ''}>
    <div lang={ui.lang} className={`min-h-screen bg-white text-[#1A1A1A] dark:bg-[#141414] dark:text-white ${bn ? 'font-bn' : ''}`}>
      <SiteNav lang={ui.lang} onToggleLang={ui.toggleLang} variant="solid" night={ui.night} onToggleTheme={ui.toggleNight} light={!ui.night} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">{bn ? 'ব্লগ' : 'Blog'}</h1>
        <p className="mt-2 text-[#1A1A1A]/60 dark:text-white/60">{bn ? 'অনলাইনে বিক্রির টিপস আর Regantify-র খবর।' : 'Selling tips and news from Regantify.'}</p>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-neutral-400" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-16 text-center text-[#1A1A1A]/60 dark:text-white/60">{bn ? 'এখনো কোনো লেখা নেই।' : 'No posts yet.'}</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-black/10 transition-colors hover:border-[#008060] dark:border-white/10">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/9] w-full bg-[#F3F7EC] dark:bg-[#1A1A1A]" />
                )}
                <div className="space-y-1.5 p-4">
                  <p className="text-xs text-[#1A1A1A]/50 dark:text-white/50">{formatDhakaDate(p.publishedAt)}</p>
                  <h2 className="font-semibold leading-snug group-hover:text-[#008060]">{p.title}</h2>
                  {p.excerpt && <p className="line-clamp-3 text-sm text-[#1A1A1A]/60 dark:text-white/60">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
    </div>
  );
}

/** /blog/:slug: one platform blog post. */
export function BlogPostPage() {
  const { slug = '' } = useParams();
  const ui = useSiteChrome();
  const { data, isLoading, isError } = useQuery({ queryKey: ['public-blog', slug], queryFn: () => publicSiteApi.post(slug), retry: false });
  const bn = ui.lang === 'bn';
  usePageMeta(data ? `${data.seoTitle || data.title} | Regantify` : 'Regantify', data?.seoDescription || data?.excerpt || undefined, data?.coverUrl ?? undefined);

  return (
    <div className={ui.night ? 'dark' : ''}>
    <div lang={ui.lang} className={`min-h-screen bg-white text-[#1A1A1A] dark:bg-[#141414] dark:text-white ${bn ? 'font-bn' : ''}`}>
      <SiteNav lang={ui.lang} onToggleLang={ui.toggleLang} variant="solid" night={ui.night} onToggleTheme={ui.toggleNight} light={!ui.night} />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-1 text-sm text-[#1A1A1A]/60 hover:text-[#008060] dark:text-white/60">
          <ArrowLeft size={14} /> {bn ? 'সব লেখা' : 'All posts'}
        </Link>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-neutral-400" />
          </div>
        ) : isError || !data ? (
          <p className="py-16 text-center text-[#1A1A1A]/60 dark:text-white/60">{bn ? 'লেখাটি পাওয়া যায়নি।' : 'This post was not found.'}</p>
        ) : (
          <article>
            <p className="text-sm text-[#1A1A1A]/50 dark:text-white/50">{formatDhakaDate(data.publishedAt)}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">{data.title}</h1>
            {data.coverUrl && <img src={data.coverUrl} alt="" className="mt-6 w-full rounded-2xl object-cover" />}
            <Markdown text={data.body} className="mt-8 !text-base dark:!text-white/90" />
            {data.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {data.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[#F3F7EC] px-3 py-1 text-xs text-[#008060] dark:bg-white/10 dark:text-[#95BF47]">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-12 rounded-2xl bg-[#F3F7EC] p-6 dark:bg-white/5">
              <p className="font-semibold">{bn ? 'নিজের অনলাইন দোকান খুলুন' : 'Open your own online shop'}</p>
              <Link to="/vendor/signup" className="mt-3 inline-flex rounded-full bg-[#008060] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#006B51]">
                {bn ? 'ফ্রি শুরু করুন' : 'Start free'}
              </Link>
            </div>
          </article>
        )}
      </main>
    </div>
    </div>
  );
}
