import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, MessageCircleQuestion, Trash2 } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, PillTabs, TableFooter, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { productQuestionsApi, type ProductQuestion, type QuestionStatus } from '../../../lib/productQuestionsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { useCan } from '../../../lib/useStaffAccess';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MAX_ANSWER = 1000;
const QUERY_KEY = ['product-questions'];

/** One question: the shopper's words, the product, and the answer box (or the saved answer with hide and delete). */
function QuestionCard({ q, canEdit }: { q: ProductQuestion; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(q.answer ?? '');
  const [editing, setEditing] = useState(q.answer === null);
  const [deleting, setDeleting] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const answer = useMutation({
    mutationFn: (value: string) => productQuestionsApi.answer(q.id, value),
    onSuccess: (saved) => {
      toast.success(saved.answer ? 'Answer saved. It shows on the product page.' : 'Answer removed. The question is no longer on the page.');
      setEditing(!saved.answer);
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the answer.')),
  });
  const hide = useMutation({
    mutationFn: (hidden: boolean) => productQuestionsApi.setHidden(q.id, hidden),
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t change this question.')),
  });
  const remove = useMutation({
    mutationFn: () => productQuestionsApi.remove(q.id),
    onSuccess: () => {
      setDeleting(false);
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t delete this question.')),
  });

  return (
    <div className={`rounded-xl border bg-white ${q.hidden ? 'border-dashed border-neutral-300 opacity-80' : 'border-line'}`}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        {q.productImage ? <img src={q.productImage} alt="" className="h-9 w-9 rounded-md border border-line object-cover" /> : <span className="h-9 w-9 rounded-md bg-neutral-100" />}
        <div className="min-w-0 flex-1">
          <Link to={`/vendor/product/edit/${q.productId}`} className="block truncate text-sm font-medium text-brand hover:underline">
            {q.productName}
          </Link>
          <p className="text-xs text-neutral-500">
            {q.customerName} · {formatDhakaDateTime(q.createdAt)}
            {q.hidden ? ' · hidden from the page' : ''}
          </p>
        </div>
        {canEdit && q.answer !== null && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => hide.mutate(!q.hidden)} aria-label={q.hidden ? 'Show on the page' : 'Hide from the page'} title={q.hidden ? 'Show on the page' : 'Hide from the page'} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100">
              {q.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button type="button" onClick={() => setDeleting(true)} aria-label="Delete this question" className="rounded p-1.5 text-red-600 hover:bg-red-50">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 py-3 text-sm">
        <p className="whitespace-pre-line text-regantify-text">
          <span className="font-semibold">Q.</span> {q.question}
        </p>

        {canEdit && editing ? (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_ANSWER))}
              rows={3}
              placeholder="Write the answer. It will show under the question on the product page."
              aria-label="Your answer"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">
                {text.length}/{MAX_ANSWER}
              </span>
              <div className="flex gap-2">
                {q.answer !== null && (
                  <button type="button" onClick={() => { setText(q.answer ?? ''); setEditing(false); }} className={outlineBtn}>
                    Cancel
                  </button>
                )}
                <button type="button" onClick={() => answer.mutate(text)} disabled={!text.trim() || answer.isPending} className={primaryBtn}>
                  {answer.isPending ? 'Saving…' : q.answer === null ? 'Answer and show' : 'Save answer'}
                </button>
              </div>
            </div>
          </div>
        ) : q.answer !== null ? (
          <div className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="whitespace-pre-line text-regantify-text">
              <span className="font-semibold">A.</span> {q.answer}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {q.answeredBy ? `${q.answeredBy}` : ''}
              {q.answeredAt ? `${q.answeredBy ? ' · ' : ''}${formatDhakaDateTime(q.answeredAt)}` : ''}
              {canEdit && (
                <button type="button" onClick={() => setEditing(true)} className="ml-2 text-brand hover:underline">
                  Edit answer
                </button>
              )}
            </p>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this question?"
        message="It is removed from the product page and from here."
        confirmLabel="Delete"
        busy={remove.isPending}
        danger
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

/**
 * Reviews > Questions (TellMe idea 35): what shoppers asked on StorePal product pages. A question stays off the page
 * until it is answered here; the answer then shows under the product for everyone. Answered ones can be hidden from the
 * page (kept here) or deleted. Anyone who can see reviews sees the questions; answering, hiding and deleting need reviews.edit.
 */
export default function Questions() {
  const canEdit = useCan('reviews.edit');
  const [status, setStatus] = useState<QuestionStatus>('UNANSWERED');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, status, page, perPage],
    queryFn: () => productQuestionsApi.list({ status, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];

  return (
    <PageSection>
      <PageHeader
        title="Questions"
        description={data && data.unanswered > 0 ? `${data.unanswered} waiting for your answer. A question shows on the product page once you answer it.` : 'Questions shoppers ask on your product pages.'}
        actions={
          <Link to="/vendor/reviews" className={outlineBtn}>
            Reviews
          </Link>
        }
      />

      <PillTabs<QuestionStatus>
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        tabs={[
          { id: 'UNANSWERED', label: 'Waiting', count: data?.unanswered },
          { id: 'ANSWERED', label: 'Answered' },
        ]}
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title={status === 'UNANSWERED' ? 'No questions waiting' : 'No answered questions yet'}
          hint="Shoppers can ask a question from the “Questions” tab on a product page of your StorePal store."
        />
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <QuestionCard key={`${q.id}-${q.answer ?? ''}-${q.hidden}`} q={q} canEdit={canEdit} />
          ))}
        </div>
      )}

      <TableFooter page={page} perPage={perPage} total={data?.total ?? 0} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
    </PageSection>
  );
}
