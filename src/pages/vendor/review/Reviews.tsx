import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Star } from 'lucide-react';
import { reviewsApi, type Review } from '../../../lib/reviewsApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Plain-text preview of the rich-text content — tags stripped, not rendered, for a table cell. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface ReviewRowProps {
  review: Review;
}

function ReviewRow({ review }: ReviewRowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reviews'] });

  const featuredMutation = useMutation({
    mutationFn: (featured: boolean) => reviewsApi.setFeatured(review.id, featured),
    onSuccess: (_, featured) => {
      invalidate();
      toast.success(featured ? 'Review marked as featured.' : 'Review removed from featured.');
    },
    onError: () => toast.error('Could not update this review. Please try again.'),
  });

  const approvedMutation = useMutation({
    mutationFn: (approved: boolean) => reviewsApi.setApproved(review.id, approved),
    onSuccess: (_, approved) => {
      invalidate();
      toast.success(approved ? 'Review approved.' : 'Review disapproved.');
    },
    onError: () => toast.error('Could not update this review. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => reviewsApi.remove(review.id),
    onSuccess: () => {
      invalidate();
      toast.success('Review deleted.');
    },
    onError: () => toast.error('Could not delete this review. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete the review "${review.title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">{formatDateTime(review.createdAt)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">{review.approved ? 'Yes' : 'No'}</td>
      <td className="p-4 min-w-[280px] max-w-[420px]">
        <button
          onClick={() => navigate(`/vendor/reviews/${review.id}/edit`)}
          className="text-sm font-semibold text-regantify-text hover:text-regantify-cta text-left"
        >
          {review.title}
        </button>
        {review.featured && (
          <span className="inline-flex items-center gap-1 ml-2 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <Star size={10} className="fill-amber-500 text-amber-500" />
            Featured
          </span>
        )}
        {review.content && <p className="text-sm text-regantify-text-muted mt-1 line-clamp-2">{stripHtml(review.content)}</p>}
      </td>
      <td className="p-4 text-sm text-regantify-text">{review.rating}</td>
      <td className="p-4 min-w-[160px]">
        <p className="text-sm text-regantify-text">{review.customerName || '—'}</p>
        {review.customerPhone && <p className="text-xs text-regantify-text-muted mt-0.5">{review.customerPhone}</p>}
      </td>
      <td className="p-4">
        <DropdownMenu
          trigger={
            <button className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
              Actions
            </button>
          }
        >
          <DropdownMenuItem onSelect={() => featuredMutation.mutate(!review.featured)}>
            {review.featured ? 'Un-feature' : 'Mark as Featured'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => approvedMutation.mutate(!review.approved)}>
            {review.approved ? 'Disapprove' : 'Approve'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} danger>
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function Reviews() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', { search, page }],
    queryFn: () => reviewsApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Reviews</h1>
        <button
          onClick={() => navigate('/vendor/reviews/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">Date</th>
                <th className="p-4">Approved</th>
                <th className="p-4">Review</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    No reviews yet.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => <ReviewRow key={review.id} review={review} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
