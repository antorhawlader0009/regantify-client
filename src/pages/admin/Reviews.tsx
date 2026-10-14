import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, EyeOff, Star } from 'lucide-react';
import { adminStep17Api, type AdminReview } from '../../lib/adminStep17Api';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { ReasonNeed } from '../../components/admin/ReasonNeed';

const field = 'rounded-xl bg-regantify-search px-3 py-2 text-sm text-regantify-text focus:outline-none';

/** Super Admin > Reviews (super-admin-plan.md Step 17): every store's reviews. Reviews stay the store's to moderate; here a review can be hidden for everyone, with a reason the store reads. */
export default function AdminReviews() {
  const qc = useQueryClient();
  const viewer = useAdminViewer();
  const canHide = adminCan(viewer, 'support.manage');
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [newStore, setNewStore] = useState(false);
  const [hidden, setHidden] = useState<'' | 'hidden' | 'visible'>('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<{ review: AdminReview; hide: boolean } | null>(null);
  const [reason, setReason] = useState('');

  const filters = { rating: rating ? Number(rating) : undefined, search: search.trim() || undefined, hasPhoto, newStoreDays: newStore ? 30 : undefined, hidden, page };
  const { data, isLoading } = useQuery({ queryKey: ['admin-reviews', filters], queryFn: () => adminStep17Api.reviews(filters), placeholderData: keepPreviousData });
  const act = useMutation({
    mutationFn: () => (acting!.hide ? adminStep17Api.hideReview(acting!.review.id, reason.trim()) : adminStep17Api.unhideReview(acting!.review.id, reason.trim())),
    onSuccess: () => {
      toast.success(acting!.hide ? 'The review is hidden. The store was told.' : 'The review is shown again.');
      setActing(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-regantify-text">Reviews</h1>
      <p className="mt-1 text-sm text-regantify-text-muted">Reviews on every store. Stores approve and reply to their own; hide one here only for abuse or a fake. The store sees the reason.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Search a store, title or text" className={`${field} w-64`} />
        <select value={rating} onChange={(e) => reset(setRating)(e.target.value)} className={field}>
          <option value="">Any rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>
          ))}
        </select>
        <select value={hidden} onChange={(e) => reset(setHidden)(e.target.value as '' | 'hidden' | 'visible')} className={field}>
          <option value="">Shown and hidden</option>
          <option value="visible">Shown</option>
          <option value="hidden">Hidden by Regantify</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-regantify-text"><input type="checkbox" checked={hasPhoto} onChange={(e) => reset(setHasPhoto)(e.target.checked)} /> Has photo</label>
        <label className="flex items-center gap-1.5 text-sm text-regantify-text"><input type="checkbox" checked={newStore} onChange={(e) => reset(setNewStore)(e.target.checked)} /> Store under 30 days old</label>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-regantify-text-muted">Loading…</p>}
        {data?.items.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-regantify-text-muted ring-1 ring-black/5">No review matches.</p>}
        {data?.items.map((r) => (
          <article key={r.id} className={`rounded-2xl border bg-white p-4 ${r.hidden ? 'border-red-200' : 'border-black/5'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
                  <span className="inline-flex items-center gap-0.5 text-amber-500">{r.rating}<Star size={13} fill="currentColor" /></span>
                  <span className="truncate">{r.title}</span>
                  {r.photos > 0 && <span className="inline-flex items-center gap-0.5 text-xs font-normal text-regantify-text-muted"><Camera size={12} />{r.photos}</span>}
                  {!r.approved && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-800">Not approved by the store</span>}
                </p>
                <p className="mt-0.5 text-xs text-regantify-text-muted">
                  <Link to={`/admin/vendors/${r.store.id}`} className="font-medium text-regantify-cta hover:underline">{r.store.name}</Link>
                  {r.store.ageDays < 30 && <span className="ml-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-sky-700">new store · {r.store.ageDays}d</span>}
                  {' · '}{r.customerName || 'Customer'}{' · '}{formatDhakaDateTime(r.createdAt)}
                  {r.products.length > 0 && <> · {r.products.join(', ')}</>}
                </p>
              </div>
              {canHide && (
                <button type="button" onClick={() => { setActing({ review: r, hide: !r.hidden }); setReason(''); }} className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${r.hidden ? 'border-black/10 text-regantify-text' : 'border-red-300 text-red-700'}`}>
                  <EyeOff size={14} />{r.hidden ? 'Show again' : 'Hide'}
                </button>
              )}
            </div>
            {r.excerpt && <p className="mt-2 text-sm text-regantify-text">{r.excerpt}</p>}
            {r.hidden && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-800">Hidden by {r.hidden.by ?? 'Super Admin'}, {formatDhakaDateTime(r.hidden.at)}: {r.hidden.reason}</p>}
          </article>
        ))}
      </div>

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span className="text-regantify-text-muted">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}

      <Dialog open={acting !== null} onOpenChange={(o) => !o && setActing(null)} maxWidth="max-w-md">
        {acting && (
          <div className="space-y-4 p-6">
            <h2 className="font-semibold text-regantify-text">{acting.hide ? 'Hide this review on every store page' : 'Show this review again'}</h2>
            <p className="text-sm text-regantify-text-muted">{acting.hide ? 'It stops showing and counting on the storefront whatever the store does with it. The store gets a notice with your reason.' : 'It follows the store’s own moderation again.'}</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} placeholder="Reason (kept in the admin log)" className={`${field} w-full`} />
            <ReasonNeed value={reason} />
            <button type="button" disabled={reason.trim().length < 5 || act.isPending} onClick={() => act.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {act.isPending ? 'Working…' : acting.hide ? 'Hide review' : 'Show review'}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
