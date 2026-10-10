import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircleQuestion, MessageSquareQuote, MoreVertical, Plus, Star } from 'lucide-react';
import { reviewsApi, type Review } from '../../../lib/reviewsApi';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  PageHeader,
  PageSection,
  PillTabs,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  iconBtn,
  outlineBtn,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

type StatusTab = 'all' | 'pending' | 'approved';

/** Plain-text preview of the rich-text content — tags stripped, not rendered. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} aria-hidden />
      ))}
    </span>
  );
}

/** "Shown on store" switch: the review's approved flag. */
function ShowSwitch({ review }: { review: Review }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (approved: boolean) => reviewsApi.setApproved(review.id, approved),
    onSuccess: (_, approved) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(approved ? 'Review shown on your store' : 'Review hidden from your store');
    },
    onError: () => toast.error('Couldn’t change this review. Try again in a minute.'),
  });
  const on = mutation.isPending ? !review.approved : review.approved;
  // A read-only role sees the switch's state but can't flip it (rule-plan.md Step 10).
  const canEdit = useCan('reviews.edit');
  return (
    <label className={`inline-flex min-h-10 items-center gap-2 text-sm ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-70'}`}>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={on}
          disabled={mutation.isPending || !canEdit}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="peer sr-only"
          aria-label={on ? 'Shown on store. Turn off to hide.' : 'Hidden. Turn on to show on store.'}
        />
        <span className="h-6 w-10 rounded-full bg-neutral-200 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span className={on ? 'text-regantify-text' : 'text-neutral-500'}>{on ? 'Shown' : 'Not shown'}</span>
    </label>
  );
}

function useReviewMenu(review: Review) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reviews'] });

  const featuredMutation = useMutation({
    mutationFn: (featured: boolean) => reviewsApi.setFeatured(review.id, featured),
    onSuccess: (_, featured) => {
      invalidate();
      toast.success(featured ? 'Review featured' : 'Review no longer featured');
    },
    onError: () => toast.error('Couldn’t change this review. Try again in a minute.'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => reviewsApi.remove(review.id),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      toast.success('Review deleted');
    },
    onError: () => toast.error('Couldn’t delete this review. Try again in a minute.'),
  });

  // No menu for a read-only role (rule-plan.md Step 10).
  const canEdit = useCan('reviews.edit');
  const menu = canEdit && (
    <DropdownMenu
      trigger={
        <button aria-label={`Actions for review ${review.title}`} className={`${iconBtn} h-9 w-9 md:h-auto md:w-auto`}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={() => navigate(`/vendor/reviews/${review.id}/edit`)}>Edit</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => navigate(`/vendor/reviews/${review.id}/edit`)}>{review.replyText ? 'Edit reply' : 'Reply'}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => featuredMutation.mutate(!review.featured)}>{review.featured ? 'Stop featuring' : 'Feature it'}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setConfirmDelete(true)} danger>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
  const dialog = (
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title="Delete this review?"
      message={`“${review.title}” is removed from your store for good. To only take it off the store, turn off Shown instead.`}
      confirmLabel="Delete review"
      onConfirm={() => deleteMutation.mutate()}
      busy={deleteMutation.isPending}
      danger
    />
  );
  return { menu, dialog };
}

/** Shown on a review the store has answered. */
function RepliedBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-green-700">
      Replied
    </span>
  );
}

function FeaturedBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-amber-700">
      <Star size={10} className="fill-amber-500 text-amber-500" aria-hidden />
      Featured
    </span>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { menu, dialog } = useReviewMenu(review);
  return (
    <tr className={trClass()}>
      <td className={`${td} min-w-[300px] max-w-[460px]`}>
        <Stars value={review.rating} />
        <p className="mt-1">
          <Link to={`/vendor/reviews/${review.id}/edit`} className="font-medium hover:underline">
            {review.title}
          </Link>
          {review.featured && <FeaturedBadge />}
          {review.replyText && <RepliedBadge />}
        </p>
        {review.content && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{stripHtml(review.content)}</p>}
        {review.products.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-neutral-500">
            On
            {review.products.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                {p.name}
                {/* Opens the product's real page on the store in a new tab. */}
                <ViewProductOnStorefront slug={p.slug} />
                {i < review.products.length - 1 && ','}
              </span>
            ))}
          </p>
        )}
      </td>
      <td className={`${td} min-w-[150px]`}>
        <p>{review.customerName || '—'}</p>
        {review.customerPhone && <p className="text-xs text-neutral-500">{review.customerPhone}</p>}
        {review.order && (
          <Link to={`/vendor/orders/${review.order.id}`} className="text-xs text-brand hover:underline">
            ORDER-{review.order.invoiceNumber}
          </Link>
        )}
      </td>
      <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDate(review.createdAt)}</td>
      <td className={td}>
        <ShowSwitch review={review} />
      </td>
      <td className={td}>
        {menu}
        {dialog}
      </td>
    </tr>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const { menu, dialog } = useReviewMenu(review);
  return (
    <li className="px-3 py-3">
      <div className="flex items-start gap-2">
        <Link to={`/vendor/reviews/${review.id}/edit`} className="min-w-0 flex-1">
          <Stars value={review.rating} />
          <p className="mt-0.5 text-sm font-medium text-regantify-text">
            {review.title}
            {review.featured && <FeaturedBadge />}
            {review.replyText && <RepliedBadge />}
          </p>
          {review.content && <p className="line-clamp-2 text-xs text-neutral-500">{stripHtml(review.content)}</p>}
          <p className="mt-0.5 text-xs text-neutral-500">
            {review.customerName || 'No name'} · {formatDhakaDate(review.createdAt)}
          </p>
        </Link>
        {menu}
        {dialog}
      </div>
      <div className="mt-1">
        <ShowSwitch review={review} />
      </div>
    </li>
  );
}

/**
 * Reviews — what shoppers (and you) wrote. Reviews from the store come
 * in not shown until you turn "Shown" on (see Review model); ones you add
 * show straight away. Tabs and the star filter are server-side
 * (ReviewsService.findAllForVendor), with counts on each.
 */
export default function Reviews() {
  const canEdit = useCan('reviews.edit');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusTab>('all');
  const [rating, setRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => setPage(1), [search, status, rating, perPage]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reviews', { search, status, rating, page, perPage }],
    queryFn: () =>
      reviewsApi.list({
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
        rating: rating ?? undefined,
        page,
        perPage,
      }),
    placeholderData: keepPreviousData,
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts;
  const filtered = Boolean(search.trim() || status !== 'all' || rating);
  const COLS = 5;

  const addButton = canEdit ? (
    <Link to="/vendor/reviews/add" className={primaryBtn}>
      <Plus size={15} aria-hidden />
      Add review
    </Link>
  ) : undefined;
  const empty = filtered
    ? { title: 'No reviews match', hint: 'Try another tab, star filter or search.', action: undefined }
    : {
        title: 'No reviews yet',
        hint: 'Shoppers can review from your store’s product pages. You can also add reviews you got on Facebook or WhatsApp.',
        action: addButton,
      };

  return (
    <PageSection>
      <PageHeader
        title="Reviews"
        description={counts && counts.pending > 0 ? `${counts.pending} not shown on your store. Turn on Shown to publish them.` : 'What customers say about your products.'}
        actions={
          <>
            <Link to="/vendor/reviews/questions" className={outlineBtn}>
              <MessageCircleQuestion size={15} aria-hidden />
              Questions
            </Link>
            {addButton}
          </>
        }
      />
      <PillTabs<StatusTab>
        value={status}
        onChange={setStatus}
        tabs={[
          { id: 'all', label: 'All', count: counts?.all },
          { id: 'pending', label: 'Not shown', count: counts?.pending },
          { id: 'approved', label: 'Shown', count: counts?.approved },
        ]}
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search titles" />
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by stars">
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? null : n)}
              aria-pressed={rating === n}
              className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-xs transition-colors ${
                rating === n ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {n}
              <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden />
              {counts && <span className="tabular-nums text-neutral-500">{counts.ratings[String(n) as '1']}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="hidden md:block">
          <TableFrame minWidth="min-w-[820px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Review</th>
                <th className={th}>Customer</th>
                <th className={th}>Date</th>
                <th className={th}>On store</th>
                <th className={`${th} w-12`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={5} colSpan={COLS} height="h-12" />
              ) : reviews.length === 0 ? (
                <EmptyState as="row" colSpan={COLS} icon={MessageSquareQuote} title={empty.title} hint={empty.hint} action={empty.action} />
              ) : (
                reviews.map((r) => <ReviewRow key={r.id} review={r} />)
              )}
            </tbody>
          </TableFrame>
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={MessageSquareQuote} title={empty.title} hint={empty.hint} action={empty.action} />
            </div>
          ) : (
            <StackedList>
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </StackedList>
          )}
        </div>

        {total > 0 && <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />}
      </div>
    </PageSection>
  );
}
