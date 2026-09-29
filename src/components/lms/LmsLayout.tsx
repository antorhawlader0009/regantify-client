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
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ExternalLink, ListChecks, LogOut, PhoneCall, Rows3, Search, Settings2, X, type LucideIcon } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { authApi } from '../../lib/authApi';
import { toast } from '../../lib/toast';
import { isPlanLocked, lmsApi, LMS_STAGES, type LmsMe } from '../../lib/lmsApi';
import { LMS_HOME } from '../../lib/lmsWindow';
import { useAuthStore } from '../../store/authStore';
import { formatPhone } from './format';
import { STAGE_RULE } from './stageStyles';
import { Panel } from './LmsPage';
import { StageMark } from './ui';
import { BrowserAlerts, NavBadge, NotificationBell, useLmsSummary } from './Notifications';
import '../../pages/vendor/lms/lms-theme.css';

export const LMS_ME_KEY = ['lms', 'me'] as const;

/*
 * The LMS app shell (LMS-plan.md Step 4, "The app shell"). The LMS opens in
 * its own tab and is deliberately NOT the dashboard: no dark sidebar, a
 * white top bar with the five sections, and a bottom tab bar on phones.
 * It runs the one gate every LMS page shares (plan / turned on), then hands
 * `me` to the page through the outlet context (LmsPage reads it).
 */

const SECTIONS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'Leads', path: '/vendor/lms/leads', icon: Rows3 },
  { label: 'Call Desk', path: '/vendor/lms/desk', icon: PhoneCall },
  { label: 'Tasks', path: '/vendor/lms/tasks', icon: ListChecks },
  { label: 'Reports', path: '/vendor/lms/reports', icon: BarChart3 },
  { label: 'Settings', path: '/vendor/lms/settings', icon: Settings2 },
];

export function LmsLayout() {
  const user = useAuthStore((s) => s.user);
  const meQuery = useQuery({ queryKey: LMS_ME_KEY, queryFn: lmsApi.me, retry: false });
  const me = meQuery.isSuccess && meQuery.data.enabled ? meQuery.data : null;
  const storeName = meQuery.data?.storeName || user?.vendor?.storeName || '';

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
    <div className="lms-root min-h-screen bg-lms-page">
      <TopBar me={me} storeName={storeName} role={meQuery.data ? roleLabel(meQuery.data) : null} />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-12">{body}</main>
      {me && <BottomTabs />}
      {me && <BrowserAlerts />}
    </div>
  );
}

function roleLabel(me: LmsMe): string {
  if (me.isOwner) return 'Store owner';
  return me.isManager ? 'Lead manager' : 'Agent';
}

/**
 * A link to a dashboard page from inside the LMS. It opens a new tab so the
 * LMS stays open, except in an impersonated session, where only in-app
 * navigation keeps the login (see authStore.impersonated).
 */
export const DashboardLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(
  function DashboardLink({ to, ...props }, ref) {
    const impersonated = useAuthStore((s) => s.impersonated);
    return impersonated ? (
      <Link ref={ref} to={to} {...props} />
    ) : (
      <a ref={ref} href={to} target="_blank" rel="noopener" {...props} />
    );
  },
);

/* ---------------------------------------------------------------- top bar */

function TopBar({ me, storeName, role }: { me: LmsMe | null; storeName: string; role: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-lms-line bg-lms-surface">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <Link to={LMS_HOME} className="flex min-w-0 shrink items-center gap-2.5 rounded-md">
          {/* The dot is the caller's shift: green on shift, grey away. */}
          <span
            aria-hidden
            title={me ? (me.available ? 'You are on shift' : 'You are away') : undefined}
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${me && !me.available ? 'bg-lms-line' : 'bg-lms-call'}`}
          />
          <span className="text-[15px] font-semibold">LMS</span>
          {storeName && <span className="truncate text-sm text-lms-muted max-w-[9rem] sm:max-w-[14rem]">{storeName}</span>}
        </Link>

        {me && (
          <nav aria-label="LMS sections" className="hidden h-full items-stretch gap-6 md:flex">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.path}
                to={s.path}
                className={({ isActive }) =>
                  `-mb-px flex items-center border-b-2 text-sm whitespace-nowrap ${
                    isActive ? 'border-lms-ink font-medium text-lms-ink' : 'border-transparent text-lms-muted hover:text-lms-ink'
                  }`
                }
              >
                {s.label}
                <SectionBadge path={s.path} />
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {me && <LeadSearch me={me} />}
          {me && <NotificationBell />}
          <AccountMenu name={me?.name ?? ''} role={role} />
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
          phoneOpen ? 'fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-lms-line bg-lms-surface px-4' : 'hidden'
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

/* ----------------------------------------------------------- account menu */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function AccountMenu({ name, role }: { name: string; role: string | null }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const displayName = name || user?.fullName || user?.phone || '';

  const logOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear the session here anyway.
    } finally {
      clearAuth();
      navigate('/vendor/login', { replace: true });
    }
  };

  const item =
    'flex w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-lms-ink outline-none data-[highlighted]:bg-lms-page';

  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lms-ink text-xs font-semibold text-white">
              {initials(displayName)}
            </span>
          )}
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="lms-root z-50 w-60 rounded-[10px] border border-lms-line bg-lms-surface p-1.5 shadow-lg"
        >
          {displayName && (
            <div className="px-2.5 pb-2 pt-1.5">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {role && <p className="text-[13px] text-lms-muted">{role}</p>}
            </div>
          )}
          <RadixDropdown.Separator className="my-1 h-px bg-lms-line" />
          <RadixDropdown.Item asChild className={item}>
            <DashboardLink to="/vendor/dashboard">
              <ExternalLink size={16} className="text-lms-muted" />
              Open dashboard
            </DashboardLink>
          </RadixDropdown.Item>
          <RadixDropdown.Item className={item} onSelect={logOut}>
            <LogOut size={16} className="text-lms-muted" />
            Log out
          </RadixDropdown.Item>
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

/**
 * The section counts, from the one notifications poll (Step 8): Leads =
 * new leads waiting for your first call (ink: yours to do), Tasks = your
 * overdue tasks (red: late).
 */
function SectionBadge({ path, dot = false }: { path: string; dot?: boolean }) {
  const summary = useLmsSummary();
  const badges = summary.data?.badges;
  if (!badges) return null;
  if (path === '/vendor/lms/leads') return <NavBadge count={badges.leads} tone="ink" dot={dot} label={`${badges.leads} new for you`} />;
  if (path === '/vendor/lms/tasks') return <NavBadge count={badges.tasks} tone="alert" dot={dot} label={`${badges.tasks} overdue`} />;
  return null;
}

/* ---------------------------------------------------- phone bottom tabs */

function BottomTabs() {
  return (
    <nav
      aria-label="LMS sections"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-lms-line bg-lms-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {SECTIONS.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${
              isActive ? 'font-medium text-lms-ink' : 'text-lms-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-lms-ink" />}
              <span className="relative">
                <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                <SectionBadge path={path} dot />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
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
