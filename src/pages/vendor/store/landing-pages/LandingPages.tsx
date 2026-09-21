import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  LayoutTemplate,
  Sparkles,
} from 'lucide-react';
import { landingPagesApi, type LandingPage } from '../../../../lib/landingPagesApi';
import { toast } from '../../../../lib/toast';
import { useAuthStore } from '../../../../store/authStore';
import { storefrontLandingPageUrl } from '../../../../lib/storefrontUrl';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface CardProps {
  page: LandingPage;
  subdomain?: string;
}

/**
 * One landing page, as a card rather than a table row — a landing page is
 * a visual artifact, so a cover thumbnail carries more signal at a glance
 * than another line of text in a table (which is all the reference
 * competitor's own list gives you). Falls back to a generated gradient
 * placeholder when the vendor hasn't set a cover image.
 */
function LandingPageCard({ page, subdomain }: CardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [menuOpen]);

  const deleteMutation = useMutation({
    mutationFn: () => landingPagesApi.remove(page.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success('Landing page deleted.');
    },
    onError: () => toast.error('Could not delete this landing page. Please try again.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => landingPagesApi.duplicate(page.id),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success(`Copied as "${copy.title}".`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not copy this landing page. Please try again.';
      toast.error(message);
    },
  });

  const handleDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete "${page.title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const publicUrl = subdomain ? storefrontLandingPageUrl(subdomain, page.slug) : null;
  const isPublished = page.status === 'PUBLISHED';
  const sectionCount = page.sections?.length ?? 0;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-black/5 bg-white overflow-hidden
        transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      {/* Cover / preview */}
      <button
        onClick={() => navigate(`/vendor/store/landing-pages/${page.id}/builder`)}
        className="relative block h-40 w-full overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100"
      >
        {page.coverImageUrl ? (
          <img src={page.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-violet-400">
            <LayoutTemplate size={32} strokeWidth={1.5} />
          </span>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
            isPublished ? 'bg-emerald-500 text-white' : 'bg-white/90 text-regantify-text-muted'
          }`}
        >
          {isPublished ? 'PUBLISHED' : 'DRAFT'}
        </span>

        {page.aiGenerated && (
          <span
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1
              text-[11px] font-semibold text-violet-600"
            title="Drafted with AI"
          >
            <Sparkles size={11} />
            AI
          </span>
        )}
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => navigate(`/vendor/store/landing-pages/${page.id}/builder`)}
            className="text-left text-[15px] font-semibold text-regantify-text hover:text-regantify-cta line-clamp-1"
          >
            {page.title}
          </button>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-1 text-regantify-text-muted hover:bg-regantify-content"
              aria-label="Actions"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-black/5
                  bg-white py-1 shadow-xl shadow-black/10"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/vendor/store/landing-pages/${page.id}/builder`);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content"
                >
                  <Eye size={14} />
                  Open in builder
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    duplicateMutation.mutate();
                  }}
                  disabled={duplicateMutation.isPending}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-regantify-text
                    hover:bg-regantify-content disabled:opacity-50"
                >
                  <Copy size={14} />
                  Make a copy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600
                    hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-regantify-text-muted line-clamp-1">
          {page.slug === '/' ? 'Homepage' : `/l/${page.slug}`}
        </p>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-regantify-text-muted">
          <span>{sectionCount === 1 ? '1 section' : `${sectionCount} sections`}</span>
          <span className="h-1 w-1 rounded-full bg-black/15" />
          <span>{page.visitCount.toLocaleString()} visits</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5">
        <span className="text-[11px] text-regantify-text-muted">{formatDate(page.createdAt)}</span>
        {publicUrl && isPublished && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-regantify-cta hover:underline"
          >
            Visit
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function LandingPages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['landing-pages', search],
    queryFn: () => landingPagesApi.list(search.trim() || undefined),
  });

  // "Add New" creates a DRAFT immediately and drops the vendor straight
  // into the builder — a landing page has nothing meaningful to fill in
  // on a separate "create" form (unlike Store > Pages, whose whole
  // content IS one form field), so an intermediate step would just be a
  // speed bump before the actual work.
  const createMutation = useMutation({
    mutationFn: () => landingPagesApi.create({ title: 'Untitled landing page' }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      navigate(`/vendor/store/landing-pages/${created.id}/builder`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not create a landing page. Please try again.';
      toast.error(message);
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Landing Pages</h1>
          <p className="mt-0.5 text-sm text-regantify-text-muted">
            Build high-converting pages for your ad campaigns — no code needed.
          </p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-4 py-2.5 text-sm font-medium
            text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
        >
          <Plus size={16} />
          {createMutation.isPending ? 'Creating…' : 'Add New'}
        </button>
      </div>

      <div className="relative mb-5 w-full max-w-xs">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm
            text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>

      {isLoading && <p className="py-12 text-center text-sm text-regantify-text-muted">Loading…</p>}

      {!isLoading && pages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
            <LayoutTemplate size={26} strokeWidth={1.5} />
          </span>
          <h2 className="text-base font-semibold text-regantify-text">
            {search.trim() ? 'No landing pages match that search.' : 'No landing pages yet'}
          </h2>
          {!search.trim() && (
            <>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-regantify-text-muted">
                Create a focused page for a single product or offer, then send your Facebook and TikTok
                traffic straight to it.
              </p>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-regantify-cta px-4 py-2.5
                  text-sm font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
              >
                <Plus size={16} />
                Create your first landing page
              </button>
            </>
          )}
        </div>
      )}

      {!isLoading && pages.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pages.map((p) => (
              <LandingPageCard key={p.id} page={p} subdomain={subdomain} />
            ))}
          </div>
          <p className="mt-5 text-xs text-regantify-text-muted">Total: {pages.length}</p>
        </>
      )}
    </div>
  );
}
