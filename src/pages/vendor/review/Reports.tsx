import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, PillTabs, TableFooter, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { contentReportsApi, type ContentReport, type ReportFilter } from '../../../lib/contentReportsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { useCan } from '../../../lib/useStaffAccess';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const QUERY_KEY = ['content-reports'];

const KIND_LABEL = { REVIEW: 'Review', QUESTION: 'Question', AI_ANSWER: 'Assistant answer' } as const;

/** What the report is about: the shopper's words, so the store can judge without opening another page. */
function ReportedItemView({ report }: { report: ContentReport }) {
  const item = report.item;
  if (!item) return <p className="text-sm text-neutral-500">This item was deleted.</p>;
  if ('exchange' in item) {
    return <p className="whitespace-pre-line rounded-lg bg-neutral-50 px-3 py-2 text-sm text-regantify-text">{item.exchange}</p>;
  }
  if ('reviewId' in item) {
    return (
      <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <p className="font-medium text-regantify-text">
          {item.rating} of 5 stars{item.title ? `: ${item.title}` : ''}
        </p>
        {item.text && <p className="mt-1 text-regantify-text">{item.text}</p>}
        <p className="mt-1 text-xs text-neutral-500">
          {item.by ?? 'Customer'} · {item.shown ? 'Shown on your store' : 'Not shown on your store'}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
      <p className="text-regantify-text">
        <span className="font-semibold">Q.</span> {item.question}
      </p>
      {item.answer && (
        <p className="mt-1 text-regantify-text">
          <span className="font-semibold">A.</span> {item.answer}
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-500">
        {item.by}
        {item.product ? ` · ${item.product}` : ''} · {item.shown ? 'Shown on your store' : 'Not shown on your store'}
      </p>
    </div>
  );
}

function ReportCard({ report, canEdit }: { report: ContentReport; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const dismiss = useMutation({
    mutationFn: () => contentReportsApi.dismiss(report.id),
    onSuccess: () => {
      toast.success('Report closed. The item stays.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t close this report.')),
  });
  const hide = useMutation({
    mutationFn: () => contentReportsApi.hide(report.id),
    onSuccess: () => {
      toast.success('Taken off your store. Every report about it is closed.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t hide this item.')),
  });
  const open = report.status === 'OPEN';
  const canHide = open && canEdit && report.kind !== 'AI_ANSWER' && !!report.item;

  return (
    <div className="space-y-2 rounded-xl border border-line bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{KIND_LABEL[report.kind]}</span>
        <span className="text-regantify-text">{report.reasonLabel}</span>
        <span className="ml-auto text-xs text-neutral-500">{formatDhakaDateTime(report.createdAt)}</span>
      </div>
      {report.note && <p className="text-neutral-600">“{report.note}”</p>}
      <ReportedItemView report={report} />
      {open && canEdit ? (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => dismiss.mutate()} disabled={dismiss.isPending || hide.isPending} className={outlineBtn}>
            Not a problem
          </button>
          {canHide && (
            <button type="button" onClick={() => hide.mutate()} disabled={dismiss.isPending || hide.isPending} className={primaryBtn}>
              {report.kind === 'REVIEW' ? 'Hide this review' : 'Hide this question'}
            </button>
          )}
        </div>
      ) : !open ? (
        <p className="text-xs text-neutral-500">{report.status === 'HIDDEN' ? 'You took this off your store.' : 'You closed this report.'}</p>
      ) : null}
    </div>
  );
}

/**
 * Reviews > Reports (STORE-APP-plan.md Step 4): what shoppers reported on your store's pages with the Report button on a review or an
 * answered question, or under an answer of your AI assistant. Hide the item or close the report. Who reported is never shown.
 * Anyone who can see reviews sees the reports; hiding and closing need reviews.edit.
 */
export default function Reports() {
  const canEdit = useCan('reviews.edit');
  const [status, setStatus] = useState<ReportFilter>('OPEN');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, status, page, perPage],
    queryFn: () => contentReportsApi.list({ status, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const items = data?.data ?? [];

  return (
    <PageSection>
      <PageHeader
        title="Reports"
        description={data && data.open > 0 ? `${data.open} waiting. Hide what breaks the rules, or close a report that is not a problem.` : 'What shoppers reported on your reviews, questions and assistant answers.'}
        back={{ to: '/vendor/reviews', label: 'Reviews' }}
      />

      <PillTabs<ReportFilter>
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        tabs={[
          { id: 'OPEN', label: 'Waiting', count: data?.open },
          { id: 'DONE', label: 'Handled' },
        ]}
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={status === 'OPEN' ? 'No reports waiting' : 'No handled reports yet'}
          hint="Shoppers can report a review or an answered question from your StorePal store, and an answer of your AI assistant."
        />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <ReportCard key={`${r.id}-${r.status}`} report={r} canEdit={canEdit} />
          ))}
        </div>
      )}

      <TableFooter page={page} perPage={perPage} total={data?.total ?? 0} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
    </PageSection>
  );
}
