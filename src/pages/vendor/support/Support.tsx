import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Clock, Loader2, Mail, MessageCircle, Phone, Plus, LifeBuoy } from 'lucide-react';
import { supportApi, type SupportCategory, type SupportPriority, type SupportTicketSummary } from '../../../lib/supportApi';
import { CATEGORY_LABEL, HELP_TOPICS, SUPPORT_CONTACT } from '../../../lib/supportContent';
import { StatusPill } from '../../../components/support/TicketThread';
import { Dialog } from '../../../components/ui/Dialog';
import { agoPhrase } from '../../../components/lms/format';
import { toast } from '../../../lib/toast';

type Tab = 'active' | 'closed';

/**
 * Vendor dashboard > Support: the store's tickets with Regantify support,
 * how to reach the team directly, and answers to common questions.
 * An AI assistant will sit at the top of the main column later; the layout
 * leaves that slot as the first thing in <main>.
 */
export default function Support() {
  const [tab, setTab] = useState<Tab>('active');
  const [composing, setComposing] = useState(false);

  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: supportApi.list,
    refetchInterval: 30_000,
  });

  const active = useMemo(() => tickets.filter((t) => t.status !== 'CLOSED'), [tickets]);
  const closed = useMemo(() => tickets.filter((t) => t.status === 'CLOSED'), [tickets]);
  const shown = tab === 'active' ? active : closed;

  return (
    <div className="max-w-6xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Support</h1>
          <p className="mt-1 max-w-xl text-sm text-regantify-text-muted">
            Ask the Regantify team about anything in your store. {SUPPORT_CONTACT.replyTime}
          </p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-regantify-black px-4 py-2.5 text-sm font-medium text-white
            transition-colors hover:bg-regantify-cta-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-black focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          New ticket
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          {/* AI assistant goes here (planned). */}

          <div className="mb-3 flex items-center gap-1 border-b border-black/10" role="tablist" aria-label="Tickets">
            {(
              [
                ['active', 'Active', active.length],
                ['closed', 'Closed', closed.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors focus:outline-none focus-visible:text-regantify-text ${
                  tab === value
                    ? 'border-regantify-black text-regantify-text'
                    : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
                }`}
              >
                {label}
                <span className="ml-1.5 text-xs text-regantify-text-muted">{count}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
            </div>
          ) : isError ? (
            <p className="py-10 text-sm text-red-600">Tickets could not be loaded. Refresh the page to try again.</p>
          ) : shown.length === 0 ? (
            <EmptyTickets closed={tab === 'closed'} onNew={() => setComposing(true)} />
          ) : (
            <ul className="divide-y divide-black/5">
              {shown.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </ul>
          )}
        </main>

        <aside className="space-y-8">
          <ContactCard />
          <HelpTopics />
        </aside>
      </div>

      <NewTicketDialog open={composing} onOpenChange={setComposing} />
    </div>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicketSummary }) {
  const unread = ticket.vendorUnread;
  return (
    <li>
      <Link
        to={`/vendor/support/${ticket.id}`}
        className="group flex items-start gap-4 rounded-xl px-3 py-4 -mx-3 transition-colors hover:bg-regantify-content/60
          focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-black"
      >
        <span className="mt-2 w-2 shrink-0">
          {unread && <span className="block h-2 w-2 rounded-full bg-regantify-cta" aria-label="New reply" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`truncate text-[15px] text-regantify-text ${unread ? 'font-semibold' : 'font-medium'}`}>
              {ticket.subject}
            </span>
            {ticket.priority === 'URGENT' && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Urgent</span>
            )}
          </span>
          <span className="mt-1 block text-xs text-regantify-text-muted">
            #{ticket.number} in {CATEGORY_LABEL[ticket.category]}, last message {agoPhrase(ticket.lastMessageAt)}
          </span>
        </span>
        <StatusPill status={ticket.status} viewer="VENDOR" />
      </Link>
    </li>
  );
}

function EmptyTickets({ closed, onNew }: { closed: boolean; onNew: () => void }) {
  if (closed) {
    return <p className="py-12 text-center text-sm text-regantify-text-muted">Closed tickets will be listed here.</p>;
  }
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <LifeBuoy size={28} strokeWidth={1.5} className="text-regantify-text-muted" />
      <p className="mt-3 text-sm font-medium text-regantify-text">No open tickets</p>
      <p className="mt-1 max-w-sm text-sm text-regantify-text-muted">
        Open a ticket and the team will reply right here. You'll also see it in your notifications.
      </p>
      <button onClick={onNew} className="mt-4 text-sm font-medium text-regantify-text underline underline-offset-4 hover:no-underline">
        Open a ticket
      </button>
    </div>
  );
}

function ContactCard() {
  const rows = [
    SUPPORT_CONTACT.whatsapp && {
      icon: <MessageCircle size={16} />,
      label: 'WhatsApp',
      value: SUPPORT_CONTACT.whatsapp,
      href: `https://wa.me/88${SUPPORT_CONTACT.whatsapp.replace(/\D/g, '')}`,
    },
    SUPPORT_CONTACT.phone && { icon: <Phone size={16} />, label: 'Call', value: SUPPORT_CONTACT.phone, href: `tel:${SUPPORT_CONTACT.phone}` },
    SUPPORT_CONTACT.email && { icon: <Mail size={16} />, label: 'Email', value: SUPPORT_CONTACT.email, href: `mailto:${SUPPORT_CONTACT.email}` },
  ].filter(Boolean) as { icon: JSX.Element; label: string; value: string; href: string }[];

  return (
    <section className="rounded-2xl bg-regantify-topbar p-5 text-white">
      <h2 className="text-base font-semibold">Talk to the team</h2>
      <p className="mt-1 text-sm text-white/60">For something urgent, reach us directly.</p>
      <ul className="mt-4 space-y-1">
        {rows.map((r) => (
          <li key={r.label}>
            <a
              href={r.href}
              target={r.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <span className="text-white/60">{r.icon}</span>
              <span className="text-sm text-white/60 w-20">{r.label}</span>
              <span className="text-sm font-medium">{r.value}</span>
            </a>
          </li>
        ))}
      </ul>
      {SUPPORT_CONTACT.hours && (
        <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/60">
          <Clock size={14} />
          {SUPPORT_CONTACT.hours}
        </p>
      )}
    </section>
  );
}

function HelpTopics() {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-regantify-text">Common questions</h2>
      <div className="divide-y divide-black/5 border-y border-black/5">
        {HELP_TOPICS.map((t) => (
          <details key={t.question} className="group">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-regantify-text
                focus:outline-none focus-visible:underline [&::-webkit-details-marker]:hidden"
            >
              {t.question}
              <ChevronDown size={16} className="shrink-0 text-regantify-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="pb-4 text-sm leading-relaxed text-regantify-text-muted">
              <p>{t.answer}</p>
              {t.link && (
                <Link to={t.link.to} className="mt-2 inline-block font-medium text-regantify-text underline underline-offset-4 hover:no-underline">
                  {t.link.label}
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

const fieldClass = `w-full rounded-xl bg-regantify-search px-4 py-2.5 text-sm text-regantify-text
  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black`;

function NewTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportCategory>('ORDERS');
  const [priority, setPriority] = useState<SupportPriority>('NORMAL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: supportApi.create,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(`Ticket #${ticket.number} opened.`);
      onOpenChange(false);
      setSubject('');
      setMessage('');
      setPriority('NORMAL');
      navigate(`/vendor/support/${ticket.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'The ticket could not be opened. Try again.');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (subject.trim().length < 4) return setError('Add a short subject (at least 4 characters).');
    if (message.trim().length < 10) return setError('Describe the problem in a bit more detail (at least 10 characters).');
    create.mutate({ subject: subject.trim(), category, priority, message: message.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New ticket" maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-medium text-regantify-text">
            Subject
          </label>
          <input
            id="ticket-subject"
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Pathao booking fails for order #1042"
            className={fieldClass}
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ticket-category" className="mb-1.5 block text-sm font-medium text-regantify-text">
              Topic
            </label>
            <select id="ticket-category" value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)} className={fieldClass}>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-regantify-text">How urgent?</legend>
            <div className="flex rounded-xl bg-regantify-search p-1">
              {(
                [
                  ['NORMAL', 'Normal'],
                  ['URGENT', 'Store is affected'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-regantify-black ${
                    priority === value ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'
                  }`}
                >
                  <input type="radio" name="priority" value={value} checked={priority === value} onChange={() => setPriority(value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <label htmlFor="ticket-message" className="mb-1.5 block text-sm font-medium text-regantify-text">
            What's happening?
          </label>
          <textarea
            id="ticket-message"
            rows={6}
            value={message}
            maxLength={5000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What you tried, what you expected, and any order or invoice numbers."
            className={`${fieldClass} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-regantify-text hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-regantify-black px-4 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {create.isPending && <Loader2 size={15} className="animate-spin" />}
            Open ticket
          </button>
        </div>
      </form>
    </Dialog>
  );
}
