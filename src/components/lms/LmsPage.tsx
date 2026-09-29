import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { isPlanLocked, lmsApi, LMS_STAGES, type LmsMe } from '../../lib/lmsApi';
import { STAGE_RULE } from './stageStyles';
import '../../pages/vendor/lms/lms-theme.css';

export const LMS_ME_KEY = ['lms', 'me'] as const;

/**
 * The shell every LMS page renders in: its own light theme (lms-theme.css)
 * over the whole content area, the page title, and the one gate all pages
 * share. Children only render once the plan allows the LMS and it's turned on.
 */
export function LmsPage({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: (me: LmsMe) => ReactNode;
}) {
  const meQuery = useQuery({ queryKey: LMS_ME_KEY, queryFn: lmsApi.me, retry: false });

  let body: ReactNode;
  if (meQuery.isPending) {
    body = <p className="text-sm text-lms-muted">Loading…</p>;
  } else if (meQuery.isError) {
    body = isPlanLocked(meQuery.error) ? (
      <PlanLocked />
    ) : (
      <Panel>
        <p className="text-sm">{apiErrorMessage(meQuery.error, "LMS couldn't load. Refresh the page to try again.")}</p>
      </Panel>
    );
  } else if (!meQuery.data.enabled) {
    body = <TurnOnLms me={meQuery.data} />;
  } else {
    body = children(meQuery.data);
  }

  const showHeader = meQuery.isSuccess && meQuery.data.enabled;

  return (
    // Cancels VendorLayout's p-8 so the LMS background fills the whole content area.
    <div className="lms-root -m-8 min-h-[calc(100%+4rem)] bg-lms-page px-4 py-6 sm:px-8 sm:py-8">
      {showHeader && (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{title}</h1>
          {actions}
        </header>
      )}
      {body}
    </div>
  );
}

/** A white surface for page content. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[10px] border border-lms-line bg-lms-surface p-5 sm:p-6 ${className}`}>{children}</section>;
}

/** The empty state inside a panel: what's missing and what fills it. */
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-10 sm:py-14 max-w-md">
      <p className="text-base font-medium">{title}</p>
      <p className="mt-1 text-sm text-lms-muted">{text}</p>
    </div>
  );
}

function PlanLocked() {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">LMS is part of the Advance plan</h1>
      <p className="mt-2 text-sm text-lms-muted leading-6">
        LMS puts new orders, abandoned checkouts and form requests in one list, so your team calls each person on time
        and every call is on record.
      </p>
      <Link
        to="/vendor/billing"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-lms-ink px-4 text-sm font-medium text-white hover:opacity-90"
      >
        See plans
      </Link>
    </div>
  );
}

const INCOMING = [
  { name: 'New orders from your store', what: 'waiting for a confirmation call' },
  { name: 'Abandoned checkouts', what: 'people who filled in checkout but didn’t order' },
  { name: 'Landing page forms', what: 'people who asked you to contact them' },
];

function TurnOnLms({ me }: { me: LmsMe }) {
  const queryClient = useQueryClient();
  const turnOn = useMutation({
    mutationFn: () => lmsApi.updateSettings({ enabled: true }),
    onSuccess: () => {
      toast.success('LMS turned on');
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "LMS couldn't be turned on. Try again.")),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">LMS</h1>
      <p className="mt-2 text-sm text-lms-muted leading-6">
        Every order, abandoned checkout and form request in one list, so your team calls each person on time and nobody
        slips through.
      </p>

      <Panel className="mt-6">
        <h2 className="text-sm font-semibold">What comes in by itself</h2>
        <ul className="mt-3 divide-y divide-lms-line">
          {INCOMING.map((item) => (
            <li key={item.name} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
              <span className="font-medium">{item.name}</span>
              <span className="text-lms-muted">{item.what}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-sm font-semibold">How a lead moves</h2>
        <p className="mt-1 text-sm text-lms-muted">
          Your team records what happened on each call. The stage changes by itself.
        </p>
        <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {LMS_STAGES.map((stage) => (
            <li key={stage} className="flex items-center gap-2 rounded-md border border-lms-line py-2 pr-2 text-sm">
              <span aria-hidden className={`h-6 w-1 shrink-0 rounded-r ${STAGE_RULE[stage]}`} />
              {me.stageLabels[stage]}
            </li>
          ))}
        </ol>
      </Panel>

      {me.isOwner ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => turnOn.mutate()}
            disabled={turnOn.isPending}
            className="inline-flex h-11 items-center rounded-md bg-lms-ink px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {turnOn.isPending ? 'Turning on…' : 'Turn on LMS'}
          </button>
          <span className="text-sm text-lms-muted">You can turn it off any time in LMS settings.</span>
        </div>
      ) : (
        <p className="mt-6 text-sm text-lms-muted">LMS isn't on for this store yet. Ask the store owner to turn it on.</p>
      )}
    </div>
  );
}
