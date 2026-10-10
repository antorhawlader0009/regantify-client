import { useEffect, useState, type ReactNode } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notificationsApi, type NotificationType, type VendorNotification } from '../../lib/notificationsApi';
import { DayHeading, NotificationRow, TYPE_LABEL, groupByDay } from '../../components/notifications/notificationUi';
import { AlertSettingsDialog } from '../../components/notifications/AlertSettingsDialog';
import { Settings2 } from 'lucide-react';

const QUERY_KEY = ['notifications'];
const TYPES = Object.keys(TYPE_LABEL) as NotificationType[];

interface Filter {
  unreadOnly: boolean;
  type: NotificationType | null;
}

/** Full notification history: a filter list on the left, the feed grouped by day on the right. */
export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>({ unreadOnly: false, type: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The top-bar search opens Alert settings with ?settings=alerts (also while this page is already open).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('settings') !== 'alerts') return;
    setSettingsOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_KEY, 'all', page, filter.unreadOnly, filter.type],
    queryFn: () => notificationsApi.listAll({ page, unread: filter.unreadOnly || undefined, type: filter.type ?? undefined }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSettled: refresh });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSettled: refresh });

  const unreadCount = data?.unreadCount ?? 0;
  const unreadByType = data?.unreadByType ?? {};
  const groups = groupByDay(data?.items ?? []);

  const choose = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const open = (item: VendorNotification) => {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.link) navigate(item.link);
  };

  const filterButton = (active: boolean, onClick: () => void, label: string, count?: number): ReactNode => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center justify-between gap-3 rounded px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
        active ? 'bg-regantify-content font-medium text-regantify-text' : 'text-regantify-text-muted hover:bg-regantify-content/60 hover:text-regantify-text'
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      {count ? <span className="text-xs tabular-nums text-regantify-text">{count}</span> : null}
    </button>
  );

  const pagerButton = 'rounded border border-line bg-white px-3 py-1.5 text-sm font-medium text-regantify-text hover:bg-regantify-content/60 disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="max-w-5xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Notifications</h1>
          <p className="mt-1 text-sm text-regantify-text-muted">{unreadCount ? `${unreadCount} unread` : 'Nothing unread'}</p>
        </div>
        <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-regantify-text transition-colors
            hover:bg-regantify-content/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <Settings2 size={15} aria-hidden />
          Alert settings
        </button>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-regantify-text transition-colors
            hover:bg-regantify-content/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40"
        >
          Mark all as read
        </button>
        </div>
      </header>
      <AlertSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Filter notifications" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {filterButton(!filter.unreadOnly && !filter.type, () => choose({ unreadOnly: false, type: null }), 'All')}
          {filterButton(filter.unreadOnly && !filter.type, () => choose({ unreadOnly: true, type: null }), 'Unread', unreadCount)}
          <span aria-hidden className="mx-1 my-1 hidden border-t border-line lg:block" />
          {TYPES.map((t) => filterButton(filter.type === t, () => choose({ unreadOnly: false, type: filter.type === t ? null : t }), TYPE_LABEL[t], unreadByType[t]))}
        </nav>

        <div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {isLoading ? (
              <div className="divide-y divide-line" aria-busy>
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="flex animate-pulse gap-3 px-4 py-3">
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-regantify-content" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 rounded-sm bg-regantify-content" />
                      <div className="h-3 w-4/5 rounded-sm bg-regantify-content" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <p className="px-6 py-14 text-center text-sm text-regantify-text-muted">Couldn’t load your notifications. Check your connection and refresh the page.</p>
            ) : groups.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm text-regantify-text-muted">
                {filter.unreadOnly
                  ? 'No unread notifications.'
                  : filter.type
                    ? `No ${TYPE_LABEL[filter.type].toLowerCase()} notifications.`
                    : 'No notifications yet. Orders, payments, withdrawals and plan updates will show up here.'}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.heading}>
                  <DayHeading>{group.heading}</DayHeading>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} detailed onOpen={open} onMarkRead={(i) => markRead.mutate(i.id)} />
                  ))}
                </section>
              ))
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-regantify-text-muted">
              <span className="tabular-nums">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1} className={pagerButton}>
                  Previous
                </button>
                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={data.page >= data.totalPages} className={pagerButton}>
                  Next
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-regantify-text-muted">Read notifications are removed after 30 days, unread ones after 90 days.</p>
        </div>
      </div>
    </div>
  );
}
