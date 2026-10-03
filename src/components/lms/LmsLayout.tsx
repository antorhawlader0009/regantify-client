import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { isPlanLocked, lmsApi, LMS_STAGES, type LmsMe } from '../../lib/lmsApi';
import { LMS_HOME } from '../../lib/lmsPaths';
import { formatPhone } from './format';
import { STAGE_RULE } from './stageStyles';
import { Panel } from './LmsPage';
import { StageMark } from './ui';
import { BrowserAlerts, NavBadge, NotificationBell, useLmsSummary } from './Notifications';
import '../../pages/vendor/lms/lms-theme.css';

export const LMS_ME_KEY = ['lms', 'me'] as const;

/*
 * The LMS shell (LMS-plan.md Step 4, "The app shell"). The LMS is a page of
 * the vendor dashboard: it renders inside VendorLayout, so the dashboard's
 * sidebar and top bar stay. This adds the LMS's own bar on top of the page:
 * the five sections as tabs, lead search and the bell. It runs the one gate
 * every LMS page shares (plan / turned on), then hands `me` to the page
 * through the outlet context (LmsPage reads it).
 */

const SECTIONS: { label: string; path: string }[] = [
  { label: 'Leads', path: '/vendor/lms/leads' },
  { label: 'Call Desk', path: '/vendor/lms/desk' },
  { label: 'Tasks', path: '/vendor/lms/tasks' },
  { label: 'Reports', path: '/vendor/lms/reports' },
  { label: 'Settings', path: '/vendor/lms/settings' },
];

export function LmsLayout() {
  const meQuery = useQuery({ queryKey: LMS_ME_KEY, queryFn: lmsApi.me, retry: false });
  const me = meQuery.isSuccess && meQuery.data.enabled ? meQuery.data : null;

  // Pages set the tab title; put the dashboard's back when leaving the LMS.
  useEffect(() => {
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, []);

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
  } else if (!me) {
    body = <TurnOnLms me={meQuery.data} />;
  } else {
    body = <Outlet context={me} />;
  }

  return (
    <div className="lms-root">
      {me && <LmsBar me={me} />}
      <div className="mx-auto w-full max-w-[1440px] p-3 sm:p-6">{body}</div>
      {me && <BrowserAlerts />}
    </div>
  );
}

/** A link to a dashboard page from inside the LMS: the LMS is part of the dashboard, so it's a plain in-app link. */
export const DashboardLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(
  function DashboardLink({ to, ...props }, ref) {
    return <Link ref={ref} to={to} {...props} />;
  },
);

/* ---------------------------------------------------------------- LMS bar */

/** Section tabs on the left (they scroll sideways on a phone), lead search and the bell on the right. */
function LmsBar({ me }: { me: LmsMe }) {
  return (
    <header className="sticky top-0 z-20 border-b border-lms-line bg-lms-surface">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-6 lg:gap-6">
        {/* The dot is the caller's shift: green on shift, grey away. */}
        <span
          title={me.available ? 'You are on shift' : 'You are away'}
          className="hidden shrink-0 items-center gap-2 text-[13px] text-lms-muted sm:flex"
        >
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${me.available ? 'bg-lms-call' : 'bg-lms-line'}`} />
          {me.available ? 'On shift' : 'Away'}
        </span>

        <nav aria-label="LMS sections" className="-mb-px flex h-full min-w-0 items-stretch gap-5 overflow-x-auto sm:gap-6">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              className={({ isActive }) =>
                `flex items-center border-b-2 text-sm whitespace-nowrap ${
                  isActive ? 'border-lms-ink font-medium text-lms-ink' : 'border-transparent text-lms-muted hover:text-lms-ink'
                }`
              }
            >
              {s.label}
              <SectionBadge path={s.path} />
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LeadSearch me={me} />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ lead search */

/** Find a lead by name or phone from any LMS page; `/` focuses it. */
function LeadSearch({ me }: { me: LmsMe }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      e.preventDefault();
      setPhoneOpen(true);
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searching = term.length >= 2;
  const results = useQuery({
    queryKey: ['lms', 'leads', 'search', term],
    queryFn: () => lmsApi.listLeads({ q: term, perPage: '30' }, 1),
    enabled: searching,
    staleTime: 15_000,
  });
  const leads = (results.data?.leads ?? []).slice(0, 8);
  const showList = focused && searching;

  useEffect(() => setActive(0), [term]);

  const close = () => {
    setQ('');
    setTerm('');
    setPhoneOpen(false);
    inputRef.current?.blur();
  };

  const openLead = (id: string) => {
    // Keep the Leads page's filters when already there.
    const params = new URLSearchParams(location.pathname === LMS_HOME ? location.search : '');
    params.set('lead', id);
    navigate({ pathname: LMS_HOME, search: `?${params}` });
    close();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' && leads.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % leads.length);
    } else if (e.key === 'ArrowUp' && leads.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + leads.length) % leads.length);
    } else if (e.key === 'Enter' && leads[active]) {
      e.preventDefault();
      openLead(leads[active].id);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPhoneOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-lms-muted hover:text-lms-ink md:hidden"
        aria-label="Search leads"
      >
        <Search size={20} />
      </button>

      {/* One search box: inline from md up; on a phone it covers the top bar while open. */}
      <div
        className={`${
          phoneOpen ? 'absolute inset-0 z-10 flex items-center gap-2 bg-lms-surface px-3' : 'hidden'
        } md:static md:z-auto md:flex md:h-auto md:w-60 md:border-0 md:bg-transparent md:p-0 lg:w-72`}
      >
        <div className="relative flex-1">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lms-muted" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (!q) setPhoneOpen(false);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search by name or phone"
            aria-label="Search leads by name or phone"
            role="combobox"
            aria-expanded={showList}
            aria-controls="lms-search-results"
            aria-activedescendant={showList && leads[active] ? `lms-search-${leads[active].id}` : undefined}
            className="h-9 w-full rounded-md border border-lms-line bg-lms-page pl-9 pr-9 text-sm placeholder:text-lms-muted focus:bg-lms-surface"
          />
          {!q && (
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-lms-line bg-lms-surface px-1.5 text-[11px] leading-5 text-lms-muted md:block"
            >
              /
            </kbd>
          )}

          {showList && (
            <div
              id="lms-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-[10px] border border-lms-line bg-lms-surface shadow-lg md:w-[22rem]"
            >
              {results.isPending ? (
                <p className="px-3 py-3 text-sm text-lms-muted">Searching…</p>
              ) : results.isError ? (
                <p className="px-3 py-3 text-sm">{apiErrorMessage(results.error, "Search didn't work. Try again.")}</p>
              ) : leads.length === 0 ? (
                <p className="px-3 py-3 text-sm text-lms-muted">No lead matches “{term}”.</p>
              ) : (
                leads.map((lead, i) => (
                  <button
                    key={lead.id}
                    id={`lms-search-${lead.id}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    // Keep focus in the input so the click lands before blur closes the list.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => openLead(lead.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${i === active ? 'bg-lms-page' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{lead.name}</span>
                      <span className="block tabular-nums text-lms-muted">{formatPhone(lead.phone)}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-lms-muted">
                      <StageMark stage={lead.stage} label={me.stageLabels[lead.stage]} />
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {phoneOpen && (
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-lms-muted hover:text-lms-ink md:hidden"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </>
  );
}

/**
 * The section counts, from the one notifications poll (Step 8): Leads =
 * new leads waiting for your first call (ink: yours to do), Tasks = your
 * overdue tasks (red: late).
 */
function SectionBadge({ path }: { path: string }) {
  const summary = useLmsSummary();
  const badges = summary.data?.badges;
  if (!badges) return null;
  if (path === '/vendor/lms/leads') return <NavBadge count={badges.leads} tone="ink" label={`${badges.leads} new for you`} />;
  if (path === '/vendor/lms/tasks') return <NavBadge count={badges.tasks} tone="alert" label={`${badges.tasks} overdue`} />;
  return null;
}

/* ------------------------------------------------------- gate screens */

function PlanLocked() {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">LMS is part of the Advance plan</h1>
      <p className="mt-2 text-sm leading-6 text-lms-muted">
        LMS puts new orders, abandoned checkouts and form requests in one list, so your team calls each person on time
        and every call is on record.
      </p>
      <DashboardLink
        to="/vendor/billing"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-lms-ink px-4 text-sm font-medium text-white hover:opacity-90"
      >
        See plans
      </DashboardLink>
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
      <h1 className="text-xl font-semibold">Turn on LMS</h1>
      <p className="mt-2 text-sm leading-6 text-lms-muted">
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
        <p className="mt-1 text-sm text-lms-muted">Your team records what happened on each call. The stage changes by itself.</p>
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
