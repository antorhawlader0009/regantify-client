import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import { apiErrorMessage, isPlanLocked } from '../../lib/api';
import { toast } from '../../lib/toast';
import { posApi, type PosMe } from '../../lib/posApi';
import { Panel, PosButton } from './ui';

export const POS_ME_KEY = ['pos', 'me'] as const;

/*
 * The POS section of the dashboard (POS-system-plan.md). Like the LMS it
 * renders inside VendorLayout, so the sidebar and top bar stay, and adds
 * its own bar of section tabs. It runs the one gate every POS page shares
 * (plan, then "turned on") and hands `me` to the page through the outlet
 * context (PosPage reads it). The full-screen sell screen (Step 4) is
 * mounted outside VendorLayout and has its own gate.
 */

// More sections (Sales, Reports) arrive with their steps.
const SECTIONS: { label: string; path: string }[] = [
  { label: 'Registers', path: '/vendor/pos/registers' },
  { label: 'Staff', path: '/vendor/pos/staff' },
  { label: 'Settings', path: '/vendor/pos/settings' },
];

export function PosLayout() {
  const meQuery = useQuery({ queryKey: POS_ME_KEY, queryFn: posApi.me, retry: false });
  const me = meQuery.isSuccess && meQuery.data.enabled ? meQuery.data : null;

  // Pages set the tab title; put the dashboard's back when leaving the POS.
  useEffect(() => {
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, []);

  let body: ReactNode;
  if (meQuery.isPending) {
    body = <p className="text-sm text-pos-muted">Loading…</p>;
  } else if (meQuery.isError) {
    body = isPlanLocked(meQuery.error) ? (
      <PlanLocked />
    ) : (
      <Panel>
        <p className="text-sm">{apiErrorMessage(meQuery.error, "POS couldn't load. Refresh the page to try again.")}</p>
      </Panel>
    );
  } else if (!me) {
    body = <TurnOnPos me={meQuery.data} />;
  } else {
    body = <Outlet context={me} />;
  }

  return (
    <div className="pos-root min-h-full bg-pos-page">
      {me && <PosBar />}
      <div className="mx-auto w-full max-w-[1200px] p-3 sm:p-6">{body}</div>
    </div>
  );
}

/** One POS page inside the shell: the title row and the content. The shell has already checked plan and "on". */
export function PosPage({ title, children }: { title: string; children: (me: PosMe) => ReactNode }) {
  const me = useOutletContext<PosMe>();

  useEffect(() => {
    document.title = me.storeName ? `${title} | POS | ${me.storeName}` : `${title} | POS`;
  }, [title, me.storeName]);

  return (
    <>
      <h1 className="mb-5 text-xl font-semibold">{title}</h1>
      {children(me)}
    </>
  );
}

function PosBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-pos-line bg-pos-surface">
      <div className="flex h-12 items-center gap-6 px-3 sm:px-6">
        <span className="shrink-0 text-sm font-semibold">POS</span>
        <nav aria-label="POS sections" className="-mb-px flex h-full min-w-0 items-stretch gap-6 overflow-x-auto">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              className={({ isActive }) =>
                `flex items-center border-b-2 text-sm whitespace-nowrap ${
                  isActive ? 'border-pos-ink font-medium text-pos-ink' : 'border-transparent text-pos-muted hover:text-pos-ink'
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
        {/* The full-screen counter (Step 4), outside the dashboard shell. */}
        <Link
          to="/vendor/pos/sell"
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-pos-go px-3 text-sm font-medium text-white hover:opacity-90"
        >
          <MonitorSmartphone size={15} aria-hidden />
          Counter screen
        </Link>
      </div>
    </header>
  );
}

function PlanLocked() {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">POS is part of the Advance plan</h1>
      <p className="mt-2 text-sm leading-6 text-pos-muted">
        Sell over the counter from the same products and stock as your online store: scan, take cash, bKash or card, print
        a receipt, and close the day with a cash report.
      </p>
      <Link
        to="/vendor/billing"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-pos-ink px-4 text-sm font-medium text-white hover:opacity-90"
      >
        See plans
      </Link>
    </div>
  );
}

const WHAT_YOU_GET = [
  { name: 'One stock for both shops', what: 'a sale at the counter lowers the same stock your online store sells from' },
  { name: 'Sales in your reports', what: 'counter sales show in Orders and Analytics next to online orders' },
  { name: 'Cash you can trust', what: 'open and close the counter with a float and a cash count' },
];

function TurnOnPos({ me }: { me: PosMe }) {
  const queryClient = useQueryClient();
  const turnOn = useMutation({
    mutationFn: () => posApi.updateSettings({ enabled: true }),
    onSuccess: () => {
      toast.success('POS turned on');
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "POS couldn't be turned on. Try again.")),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Turn on POS</h1>
      <p className="mt-2 text-sm leading-6 text-pos-muted">
        POS lets you sell in your physical shop from this dashboard. Turning it on changes nothing for your online store.
      </p>

      <Panel className="mt-6">
        <ul className="divide-y divide-pos-line">
          {WHAT_YOU_GET.map((item) => (
            <li key={item.name} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
              <span className="font-medium">{item.name}</span>
              <span className="text-pos-muted sm:text-right">{item.what}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-6">
        {me.isOwner ? (
          <PosButton variant="primary" onClick={() => turnOn.mutate()} disabled={turnOn.isPending}>
            {turnOn.isPending ? 'Turning on…' : 'Turn on POS'}
          </PosButton>
        ) : (
          <p className="text-sm text-pos-muted">Only the store owner can turn on POS.</p>
        )}
      </div>
    </div>
  );
}
