import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronUp, ExternalLink, Headphones, Lightbulb, Loader2, Search, Sparkles, BookOpen } from 'lucide-react';
import {
  articleForPath,
  CHANGELOG_KIND_LABEL,
  helpApi,
  REQUEST_STATUS_LABEL,
  type ChangelogEntry,
  type FeatureRequest,
  type HelpArticleSummary,
} from '../../lib/helpApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { HelpVideo, Markdown } from './Markdown';

export type HelpTab = 'help' | 'new' | 'ideas';

const TABS: Array<{ key: HelpTab; label: string; icon: typeof BookOpen }> = [
  { key: 'help', label: 'Help', icon: BookOpen },
  { key: 'new', label: "What's new", icon: Sparkles },
  { key: 'ideas', label: 'Ideas', icon: Lightbulb },
];

const KIND_CLASS: Record<string, string> = {
  NEW: 'bg-emerald-50 text-emerald-800',
  IMPROVED: 'bg-sky-50 text-sky-800',
  FIXED: 'bg-neutral-100 text-neutral-700',
};
const STATUS_CLASS: Record<string, string> = {
  REVIEW: 'bg-neutral-100 text-neutral-600',
  OPEN: 'bg-neutral-100 text-neutral-700',
  PLANNED: 'bg-sky-50 text-sky-800',
  IN_PROGRESS: 'bg-amber-50 text-amber-800',
  DONE: 'bg-emerald-50 text-emerald-800',
  DECLINED: 'bg-neutral-100 text-neutral-500',
};

/**
 * Help, What's new and Ideas (super-admin-new.md Step 11): the same panel in the top bar's Help drawer and on the /vendor/help page. In the drawer it opens
 * the article written for the page the seller is on (`pathname`), if there is one.
 */
export function HelpPanel({ tab, onTab, pathname, slug, onSlug, wide }: { tab: HelpTab; onTab: (t: HelpTab) => void; pathname?: string; slug: string | null; onSlug: (s: string | null) => void; wide?: boolean }) {
  const { data: changelog } = useQuery({ queryKey: ['help-changelog'], queryFn: helpApi.changelog, staleTime: 5 * 60_000 });
  const unread = changelog?.unread ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-line px-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm ${tab === t.key ? 'border-regantify-text font-medium text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'}`}
          >
            <t.icon size={15} />
            {t.label}
            {t.key === 'new' && unread > 0 && tab !== 'new' && <span className="h-2 w-2 rounded-full bg-red-500" aria-label={`${unread} new`} />}
          </button>
        ))}
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto ${wide ? 'p-5' : 'p-4'}`}>
        {tab === 'help' && <HelpTabView pathname={pathname} slug={slug} onSlug={onSlug} />}
        {tab === 'new' && <WhatsNew entries={changelog?.entries} unread={unread} />}
        {tab === 'ideas' && <Ideas />}
      </div>
    </div>
  );
}

function HelpTabView({ pathname, slug, onSlug }: { pathname?: string; slug: string | null; onSlug: (s: string | null) => void }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data: all, isLoading } = useQuery({ queryKey: ['help-articles'], queryFn: () => helpApi.articles(), staleTime: 5 * 60_000 });
  const { data: found, isFetching } = useQuery({ queryKey: ['help-articles', term], queryFn: () => helpApi.articles(term), enabled: term.length >= 2 });

  if (slug) return <ArticleView slug={slug} onBack={() => onSlug(null)} />;

  const here = pathname && all ? articleForPath(all, pathname) : null;
  const groups = new Map<string, HelpArticleSummary[]>();
  for (const a of all ?? []) groups.set(a.category, [...(groups.get(a.category) ?? []), a]);

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 rounded-xl bg-regantify-search px-3 py-2.5">
        <Search size={16} className="text-regantify-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help" className="w-full bg-transparent text-sm focus:outline-none" />
        {isFetching && <Loader2 size={14} className="animate-spin text-regantify-text-muted" />}
      </label>

      {term.length >= 2 ? (
        <ArticleList list={found ?? []} empty="Nothing matches that. Try another word, or ask support." onOpen={onSlug} />
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {here && (
            <section>
              <p className="mb-1.5 text-xs font-medium text-regantify-text-muted">For this page</p>
              <ArticleList list={[here]} onOpen={onSlug} highlight />
            </section>
          )}
          {[...groups.entries()].map(([category, list]) => (
            <section key={category}>
              <p className="mb-1.5 text-xs font-medium text-regantify-text-muted">{category}</p>
              <ArticleList list={list} onOpen={onSlug} />
            </section>
          ))}
          {groups.size === 0 && <p className="py-6 text-center text-sm text-regantify-text-muted">Help articles are on their way. Meanwhile, support is happy to help.</p>}
        </>
      )}

      <Link to="/vendor/support" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm text-regantify-text hover:bg-regantify-search">
        <Headphones size={16} className="text-regantify-text-muted" />
        Still stuck? Ask support
      </Link>
    </div>
  );
}

function ArticleList({ list, onOpen, empty, highlight }: { list: HelpArticleSummary[]; onOpen: (slug: string) => void; empty?: string; highlight?: boolean }) {
  if (list.length === 0) return <p className="py-4 text-center text-sm text-regantify-text-muted">{empty}</p>;
  return (
    <ul className={`divide-y divide-line overflow-hidden rounded-xl border ${highlight ? 'border-regantify-text/30' : 'border-line'}`}>
      {list.map((a) => (
        <li key={a.id}>
          <button type="button" onClick={() => onOpen(a.slug)} className="w-full px-3 py-2.5 text-left hover:bg-regantify-search">
            <p className="text-sm font-medium text-regantify-text">{a.title}</p>
            {a.excerpt && <p className="line-clamp-2 text-xs text-regantify-text-muted">{a.excerpt}</p>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ArticleView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ['help-article', slug], queryFn: () => helpApi.article(slug), retry: false });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text">
          <ArrowLeft size={15} /> All help
        </button>
        <Link to={`/vendor/help/${slug}`} className="flex items-center gap-1 text-xs text-regantify-text-muted hover:text-regantify-text">
          Open as a page <ExternalLink size={12} />
        </Link>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : isError || !data ? (
        <p className="py-6 text-center text-sm text-regantify-text-muted">This article was not found. It may have been removed.</p>
      ) : (
        <article className="space-y-4">
          <div>
            <p className="text-xs text-regantify-text-muted">{data.category}</p>
            <h2 className="text-lg font-semibold text-regantify-text">{data.title}</h2>
          </div>
          {data.videoUrl && <HelpVideo url={data.videoUrl} />}
          <Markdown text={data.body} />
          <p className="text-xs text-regantify-text-muted">Updated {formatDhakaDate(data.updatedAt)}</p>
        </article>
      )}
    </div>
  );
}

function WhatsNew({ entries, unread }: { entries?: ChangelogEntry[]; unread: number }) {
  const qc = useQueryClient();
  // Opening the tab marks everything as seen; the entries keep their "new" mark until the panel is opened again.
  useEffect(() => {
    if (unread === 0) return;
    void helpApi.markSeen().then(() => qc.setQueryData(['help-changelog'], (old: { unread: number; entries: ChangelogEntry[] } | undefined) => (old ? { ...old, unread: 0 } : old)));
  }, [unread, qc]);
  if (!entries) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  if (entries.length === 0) return <p className="py-6 text-center text-sm text-regantify-text-muted">Nothing here yet. New features will show up here.</p>;
  return (
    <ol className="space-y-5">
      {entries.map((e) => (
        <li key={e.id} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${KIND_CLASS[e.kind] ?? ''}`}>{CHANGELOG_KIND_LABEL[e.kind]}</span>
            {e.planCodes.map((p) => (
              <span key={p} className="rounded-full border border-line px-2 py-0.5 text-regantify-text-muted">
                {p.charAt(0) + p.slice(1).toLowerCase()} plan
              </span>
            ))}
            <span className="text-regantify-text-muted">{formatDhakaDate(e.publishedAt)}</span>
            {e.isNew && <span className="font-medium text-red-600">New</span>}
          </div>
          <p className="text-sm font-semibold text-regantify-text">{e.title}</p>
          {e.body && <Markdown text={e.body} />}
          {e.link &&
            (e.link.startsWith('/') ? (
              <Link to={e.link} className="inline-block text-sm font-medium underline underline-offset-2">
                Try it
              </Link>
            ) : (
              <a href={e.link} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium underline underline-offset-2">
                Read more
              </a>
            ))}
        </li>
      ))}
    </ol>
  );
}

function Ideas() {
  const qc = useQueryClient();
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['help-requests', sort], queryFn: () => helpApi.requests(sort) });
  const send = useMutation({
    mutationFn: () => helpApi.createRequest({ title: title.trim(), body: body.trim() || undefined }),
    onSuccess: () => {
      toast.success('Thank you. The team will look at it, then other stores can vote on it.');
      setTitle('');
      setBody('');
      setWriting(false);
      qc.invalidateQueries({ queryKey: ['help-requests'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send it.')),
  });
  const vote = useMutation({
    mutationFn: (id: string) => helpApi.vote(id),
    onSuccess: (res, id) => {
      for (const s of ['top', 'new'] as const) {
        qc.setQueryData<FeatureRequest[]>(['help-requests', s], (old) => old?.map((r) => (r.id === id ? { ...r, votes: res.votes, votedByMe: res.votedByMe } : r)));
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save your vote.')),
  });
  const list = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-regantify-text-muted">Tell us what would help your store. Vote for the ideas you want most; the team builds the most wanted first.</p>
      {writing ? (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="What should Regantify do?" className="w-full rounded-lg bg-regantify-search px-3 py-2 text-sm focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder="Why would it help? (optional)" className="w-full rounded-lg bg-regantify-search px-3 py-2 text-sm focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setWriting(false)} className="px-3 py-1.5 text-sm text-regantify-text-muted">
              Cancel
            </button>
            <button type="button" disabled={title.trim().length < 5 || send.isPending} onClick={() => send.mutate()} className="rounded-lg bg-regantify-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
              {send.isPending ? 'Sending...' : 'Send idea'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setWriting(true)} className="w-full rounded-xl border border-dashed border-line px-3 py-2.5 text-sm font-medium text-regantify-text hover:bg-regantify-search">
          Suggest an idea
        </button>
      )}

      <div className="flex gap-1 rounded-lg bg-regantify-search p-1 text-xs">
        {(['top', 'new'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSort(s)} className={`flex-1 rounded-md py-1 ${sort === s ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
            {s === 'top' ? 'Most wanted' : 'Newest'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-regantify-text-muted">No ideas yet. Be the first.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="flex gap-3 rounded-xl border border-line p-3">
              <button
                type="button"
                disabled={!r.canVote || vote.isPending}
                onClick={() => vote.mutate(r.id)}
                aria-pressed={r.votedByMe}
                aria-label={r.votedByMe ? 'Take back your vote' : 'Vote for this'}
                className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-xs tabular-nums ${
                  r.votedByMe ? 'border-regantify-text bg-regantify-text text-white' : 'border-line text-regantify-text hover:bg-regantify-search'
                } disabled:cursor-default disabled:opacity-70`}
              >
                <ChevronUp size={15} />
                {r.votes}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-regantify-text">{r.title}</p>
                {r.body && <p className="whitespace-pre-wrap break-words text-xs text-regantify-text-muted">{r.body}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`rounded-full px-2 py-0.5 ${STATUS_CLASS[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                  {r.mine && <span className="text-regantify-text-muted">Your store asked for this</span>}
                </div>
                {r.adminNote && <p className="mt-1 text-xs text-regantify-text">Regantify: {r.adminNote}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
