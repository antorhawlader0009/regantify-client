import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Inbox, Loader2, Search } from 'lucide-react';
import { adminSupportApi, type AdminSupportTicket, type SupportStatus } from '../../../lib/supportApi';
import { CATEGORY_LABEL } from '../../../lib/supportContent';
import { ReplyBox, StatusPill, TicketThread } from '../../../components/support/TicketThread';
import { agoPhrase, formatDateTime } from '../../../components/lms/format';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { toast } from '../../../lib/toast';

const TABS: { value: SupportStatus | 'ALL'; label: string }[] = [
  { value: 'OPEN', label: 'Needs reply' },
  { value: 'ANSWERED', label: 'Waiting on vendor' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ALL', label: 'All' },
];

/**
 * Super Admin > Support: every store's tickets. List on the left (unread
 * first), the selected conversation on the right with the store's details.
 * The selected ticket lives in the URL (/admin/support/:id) so it can be
 * linked and survives a refresh.
 */
export default function SupportInbox() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SupportStatus | 'ALL'>('OPEN');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support', tab, query],
    queryFn: () => adminSupportApi.list({ status: tab === 'ALL' ? undefined : tab, search: query || undefined }),
    refetchInterval: 30_000,
  });
  const tickets = data?.tickets ?? [];

  return (
    <div className="flex h-[calc(100vh-82px-4rem)] min-h-[520px] flex-col">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Support</h1>
          <p className="mt-1 text-sm text-regantify-text-muted">Reply to stores' tickets. Unread tickets stay on top.</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* List */}
        <section className={`flex min-h-0 flex-col border-black/10 lg:border-r ${id ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-3 border-b border-black/10 p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search store, subject or #number"
                aria-label="Search tickets"
                className="w-full rounded-xl bg-regantify-content py-2 pl-9 pr-3 text-sm text-regantify-text placeholder:text-regantify-text-muted/70
                  focus:outline-none focus:ring-2 focus:ring-regantify-black"
              />
            </div>
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Ticket status">
              {TABS.map((t) => {
                const count = t.value === 'ALL' ? undefined : data?.counts[t.value];
                return (
                  <button
                    key={t.value}
                    role="tab"
                    aria-selected={tab === t.value}
                    onClick={() => setTab(t.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-black ${
                      tab === t.value ? 'bg-regantify-black text-white' : 'text-regantify-text-muted hover:bg-black/5 hover:text-regantify-text'
                    }`}
                  >
                    {t.label}
                    {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <li className="flex justify-center py-10">
                <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
              </li>
            ) : tickets.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-regantify-text-muted">
                {query ? 'No tickets match that search.' : 'Nothing here right now.'}
              </li>
            ) : (
              tickets.map((t) => {
                const selected = t.id === id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate(`/admin/support/${t.id}`)}
                      aria-current={selected ? 'true' : undefined}
                      className={`flex w-full gap-3 border-b border-black/5 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:bg-regantify-content ${
                        selected ? 'bg-regantify-content' : 'hover:bg-regantify-content/60'
                      }`}
                    >
                      <span className="mt-1.5 w-2 shrink-0">
                        {t.adminUnread && <span className="block h-2 w-2 rounded-full bg-regantify-cta" aria-label="Unread" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-medium text-regantify-text-muted">{t.vendor.storeName}</span>
                          <span className="shrink-0 text-[11px] text-regantify-text-muted">{agoPhrase(t.lastMessageAt)}</span>
                        </span>
                        <span className={`mt-0.5 block truncate text-sm text-regantify-text ${t.adminUnread ? 'font-semibold' : 'font-medium'}`}>
                          {t.subject}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-regantify-text-muted">
                          #{t.number}
                          {t.priority === 'URGENT' && <span className="rounded-full bg-red-50 px-1.5 py-px font-medium text-red-600">Urgent</span>}
                          {tab === 'ALL' && <StatusPill status={t.status} viewer="ADMIN" />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Conversation */}
        <section className={`min-h-0 ${id ? 'flex' : 'hidden lg:flex'} flex-col`}>
          {id ? (
            <TicketPane id={id} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Inbox size={28} strokeWidth={1.5} className="text-regantify-text-muted" />
              <p className="mt-3 text-sm text-regantify-text-muted">Pick a ticket to read and reply.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TicketPane({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['admin-support-ticket', id],
    queryFn: () => adminSupportApi.get(id),
    refetchInterval: 20_000,
  });

  const store = (t: AdminSupportTicket) => {
    queryClient.setQueryData(['admin-support-ticket', id], t);
    queryClient.invalidateQueries({ queryKey: ['admin-support'] });
    queryClient.invalidateQueries({ queryKey: ['support-unread'] });
  };

  // Opening marks it read on the server; refresh the list dot and badge.
  useEffect(() => {
    if (ticket) {
      queryClient.invalidateQueries({ queryKey: ['admin-support'] });
      queryClient.invalidateQueries({ queryKey: ['support-unread'] });
    }
  }, [ticket?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const messageCount = ticket?.messages.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, id]);

  const reply = useMutation({
    mutationFn: (body: string) => adminSupportApi.reply(id, body),
    onSuccess: store,
    onError: () => toast.error('Your reply was not sent. Try again.'),
  });
  const setStatus = useMutation({
    mutationFn: (status: 'OPEN' | 'CLOSED') => adminSupportApi.setStatus(id, status),
    onSuccess: (t) => {
      store(t);
      toast.success(t.status === 'CLOSED' ? 'Ticket closed.' : 'Ticket reopened.');
    },
    onError: () => toast.error('The status could not be changed. Try again.'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
      </div>
    );
  }
  if (isError || !ticket) {
    return <p className="p-6 text-sm text-regantify-text">This ticket could not be found.</p>;
  }

  const closed = ticket.status === 'CLOSED';
  const owner = ticket.vendor.user;

  return (
    <>
      <header className="border-b border-black/10 px-6 py-4">
        <Link to="/admin/support" className="mb-2 inline-block text-xs text-regantify-text-muted hover:text-regantify-text lg:hidden">
          All tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold text-regantify-text">{ticket.subject}</h2>
            <p className="mt-1 text-xs text-regantify-text-muted">
              #{ticket.number}, {CATEGORY_LABEL[ticket.category]}
              {ticket.priority === 'URGENT' && ', urgent'}. Opened {formatDateTime(ticket.createdAt)}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={ticket.status} viewer="ADMIN" />
            <button
              onClick={() => setStatus.mutate(closed ? 'OPEN' : 'CLOSED')}
              disabled={setStatus.isPending}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-regantify-text hover:bg-black/5 disabled:opacity-50"
            >
              {closed ? 'Reopen' : 'Close ticket'}
            </button>
          </div>
        </div>
        {/* The store asking, so support has context without leaving the page. */}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-regantify-content px-4 py-2.5 text-xs">
          <div className="flex gap-1.5">
            <dt className="text-regantify-text-muted">Store</dt>
            <dd className="font-medium text-regantify-text">
              <a
                href={storefrontStoreUrl(ticket.vendor.subdomain)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                {ticket.vendor.storeName}
                <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-regantify-text-muted">Plan</dt>
            <dd className="font-medium text-regantify-text">{ticket.vendor.subscription?.plan.name ?? 'Free'}</dd>
          </div>
          {owner.fullName && (
            <div className="flex gap-1.5">
              <dt className="text-regantify-text-muted">Owner</dt>
              <dd className="font-medium text-regantify-text">{owner.fullName}</dd>
            </div>
          )}
          {owner.phone && (
            <div className="flex gap-1.5">
              <dt className="text-regantify-text-muted">Phone</dt>
              <dd className="font-medium text-regantify-text">
                <a href={`tel:${owner.phone}`} className="hover:underline">
                  {owner.phone}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <TicketThread messages={ticket.messages} viewer="ADMIN" />
      </div>

      <div className="border-t border-black/10 p-4">
        <ReplyBox
          sending={reply.isPending}
          onSend={(body) => reply.mutateAsync(body)}
          placeholder={`Reply to ${ticket.vendor.storeName}…`}
          note={closed ? 'This ticket is closed. Replying reopens it for the store.' : undefined}
        />
      </div>
    </>
  );
}
