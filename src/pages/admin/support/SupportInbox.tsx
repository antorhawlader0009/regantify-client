import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, Search, Star, X } from 'lucide-react';
import { adminSupportApi, type AdminSupportTicket, type SupportStatus } from '../../../lib/supportApi';
import { CATEGORY_LABEL } from '../../../lib/supportContent';
import { ReplyBox, StatusPill, TicketThread } from '../../../components/support/TicketThread';
import { agoPhrase, formatDateTime } from '../../../components/lms/format';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { SavedRepliesDialog } from './SavedRepliesDialog';
import { adminHelpApi } from '../../../lib/helpApi';
import { BackLink } from '../../../components/ui/BackLink';

type Tab = SupportStatus | 'ALL' | 'WAITING';
const TABS: { value: Tab; label: string }[] = [
  { value: 'OPEN', label: 'Needs reply' },
  { value: 'WAITING', label: 'Waiting over 24h' },
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
  const [tab, setTab] = useState<Tab>('OPEN');
  const [assignee, setAssignee] = useState('');
  const [tag, setTag] = useState('');
  const [managing, setManaging] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support', tab, query, assignee, tag],
    queryFn: () =>
      adminSupportApi.list({
        status: tab === 'ALL' || tab === 'WAITING' ? undefined : tab,
        waiting: tab === 'WAITING' || undefined,
        search: query || undefined,
        assignee: assignee || undefined,
        tag: tag || undefined,
      }),
    refetchInterval: 30_000,
  });
  const tickets = data?.tickets ?? [];

  return (
    <div className="flex h-[calc(100vh-72px-36px-3rem)] min-h-[520px] flex-col">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Support</h1>
          <p className="mt-1 text-sm text-regantify-text-muted">Reply to stores' tickets. Unread tickets stay on top.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-regantify-text-muted">
          {data?.ratings.average != null && (
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-amber-400 text-amber-400" /> {data.ratings.average} from {data.ratings.count} {data.ratings.count === 1 ? 'rating' : 'ratings'}
            </span>
          )}
          <button type="button" onClick={() => setManaging(true)} className="rounded-lg border border-black/10 px-3 py-1.5 font-medium text-regantify-text hover:bg-black/5">
            Saved replies
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[var(--console-card-shadow)] lg:grid-cols-[360px_minmax(0,1fr)]">
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
                const count = t.value === 'ALL' ? undefined : t.value === 'WAITING' ? data?.waitingCount : data?.counts[t.value];
                return (
                  <button
                    key={t.value}
                    role="tab"
                    aria-selected={tab === t.value}
                    onClick={() => setTab(t.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-black ${
                      tab === t.value ? 'bg-regantify-black text-white' : t.value === 'WAITING' && (data?.waitingCount ?? 0) > 0 ? 'text-red-600 hover:bg-red-50' : 'text-regantify-text-muted hover:bg-black/5 hover:text-regantify-text'
                    }`}
                  >
                    {t.label}
                    {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assigned to" className="min-w-0 flex-1 rounded-lg bg-regantify-content px-2 py-1.5 text-xs focus:outline-none">
                <option value="">Anyone</option>
                <option value="me">Mine ({data?.mine ?? 0})</option>
                <option value="none">Not assigned</option>
              </select>
              <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag" className="min-w-0 flex-1 rounded-lg bg-regantify-content px-2 py-1.5 text-xs focus:outline-none">
                <option value="">Any tag</option>
                {(data?.tags ?? []).map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
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
                          {t.waitingOver24h && <span className="rounded-full bg-red-600 px-1.5 py-px font-medium text-white">Waiting over 24h</span>}
                          {t.assignedToName && <span className="truncate">· {t.assignedToName}</span>}
                          {t.rating != null && <span className="inline-flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" />{t.rating}</span>}
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
      <SavedRepliesDialog open={managing} onClose={() => setManaging(false)} />
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

  const admins = useQuery({ queryKey: ['admin-support-admins'], queryFn: adminSupportApi.admins, staleTime: 5 * 60_000 });
  const saved = useQuery({ queryKey: ['admin-support-saved'], queryFn: adminSupportApi.savedReplies, staleTime: 60_000 });
  const helpArticles = useQuery({ queryKey: ['admin-help-picker'], queryFn: adminHelpApi.picker, staleTime: 5 * 60_000 });
  const assign = useMutation({ mutationFn: (adminId: string | null) => adminSupportApi.assign(id, adminId), onSuccess: store, onError: (err) => toast.error(apiErrorMessage(err, 'Could not assign it.')) });
  const tagsM = useMutation({ mutationFn: (tags: string[]) => adminSupportApi.setTags(id, tags), onSuccess: store, onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the tags.')) });
  const noteM = useMutation({
    mutationFn: (body: string) => adminSupportApi.addNote(id, body),
    onSuccess: (t) => {
      store(t);
      setNote('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the note.')),
  });
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
      </div>
    );
  }
  if (isError || !ticket) {
    return (
      <div className="p-6">
        <BackLink to="/admin/support" label="All tickets" className="mb-3 lg:hidden" />
        <p className="text-sm text-regantify-text">This ticket could not be found.</p>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED';
  const owner = ticket.vendor.user;

  return (
    <>
      <header className="border-b border-black/10 px-6 py-4">
        <BackLink to="/admin/support" label="All tickets" className="mb-2 lg:hidden" />
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
              <Link to={`/admin/vendors/${ticket.vendor.id}`} className="hover:underline">
                {ticket.vendor.storeName}
              </Link>
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
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-regantify-text-muted">
            Assigned to
            <select value={ticket.assignedToId ?? ''} onChange={(e) => assign.mutate(e.target.value || null)} disabled={assign.isPending} className="rounded-lg bg-regantify-content px-2 py-1 text-xs text-regantify-text focus:outline-none">
              <option value="">Nobody</option>
              {(admins.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <span className="flex flex-wrap items-center gap-1.5">
            {ticket.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => tagsM.mutate(ticket.tags.filter((x) => x !== t))}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  tagsM.mutate([...ticket.tags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              placeholder="Add a tag"
              maxLength={24}
              className="w-24 rounded-lg bg-regantify-content px-2 py-1 focus:outline-none"
            />
          </span>
          {ticket.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-900">
              <Star size={12} className="fill-amber-400 text-amber-400" /> Store rated {ticket.rating}/5
              {ticket.ratingNote ? `: ${ticket.ratingNote}` : ''}
            </span>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <TicketThread messages={ticket.messages} viewer="ADMIN" />
        <section className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
          <h3 className="text-xs font-semibold text-amber-900">Private notes (only the Regantify team sees these)</h3>
          {ticket.notes.map((n) => (
            <div key={n.id} className="mt-2 border-t border-amber-200 pt-2">
              <p className="whitespace-pre-wrap text-sm text-regantify-text">{n.body}</p>
              <p className="text-[11px] text-regantify-text-muted">
                {n.authorName} · {formatDateTime(n.createdAt)}
              </p>
            </div>
          ))}
          <div className="mt-3 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Write a private note" className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none" />
            <button type="button" disabled={!note.trim() || noteM.isPending} onClick={() => noteM.mutate(note.trim())} className="rounded-lg bg-regantify-black px-3 py-2 text-xs font-medium text-white disabled:opacity-40">
              Save note
            </button>
          </div>
        </section>
      </div>

      <div className="border-t border-black/10 p-4">
        <ReplyBox
          sending={reply.isPending}
          onSend={(body) => reply.mutateAsync(body)}
          placeholder={`Reply to ${ticket.vendor.storeName}…`}
          savedReplies={(saved.data ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body.replace(/\{store\}/gi, ticket.vendor.storeName).replace(/\{name\}/gi, owner.fullName?.split(' ')[0] ?? 'there'),
          }))}
          helpArticles={helpArticles.data}
          note={closed ? 'This ticket is closed. Replying reopens it for the store.' : undefined}
        />
      </div>
    </>
  );
}
