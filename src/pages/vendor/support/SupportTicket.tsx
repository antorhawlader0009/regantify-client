import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { supportApi, type SupportTicket as Ticket } from '../../../lib/supportApi';
import { CATEGORY_LABEL } from '../../../lib/supportContent';
import { ReplyBox, StatusPill, TicketThread } from '../../../components/support/TicketThread';
import { formatDateTime } from '../../../components/lms/format';
import { toast } from '../../../lib/toast';

/** Vendor > Support > one ticket: the conversation and the reply box. */
export default function SupportTicket() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => supportApi.get(id),
    refetchInterval: 20_000,
  });

  const store = (t: Ticket) => {
    queryClient.setQueryData(['support-ticket', id], t);
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['support-unread'] });
  };

  // Opening the ticket marks the reply as read on the server.
  useEffect(() => {
    if (ticket) queryClient.invalidateQueries({ queryKey: ['support-unread'] });
  }, [ticket?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const messageCount = ticket?.messages.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount]);

  const reply = useMutation({
    mutationFn: (body: string) => supportApi.reply(id, body),
    onSuccess: store,
    onError: () => toast.error('Your reply was not sent. Try again.'),
  });
  const close = useMutation({
    mutationFn: () => supportApi.close(id),
    onSuccess: (t) => {
      store(t);
      toast.success('Ticket closed.');
    },
    onError: () => toast.error('The ticket could not be closed. Try again.'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
      </div>
    );
  }
  if (isError || !ticket) {
    return (
      <div className="max-w-3xl py-10">
        <p className="text-sm text-regantify-text">This ticket could not be found.</p>
        <Link to="/vendor/support" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
          Back to Support
        </Link>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED';

  return (
    <div className="max-w-3xl">
      <Link
        to="/vendor/support"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-regantify-text-muted hover:text-regantify-text"
      >
        <ArrowLeft size={16} />
        Support
      </Link>

      <header className="mb-6 border-b border-black/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 text-xl font-semibold text-regantify-text break-words">{ticket.subject}</h1>
          <StatusPill status={ticket.status} viewer="VENDOR" />
        </div>
        <p className="mt-2 text-sm text-regantify-text-muted">
          Ticket #{ticket.number}, {CATEGORY_LABEL[ticket.category]}
          {ticket.priority === 'URGENT' && ', marked urgent'}. Opened {formatDateTime(ticket.createdAt)}.
        </p>
      </header>

      <TicketThread messages={ticket.messages} viewer="VENDOR" />

      {closed && (
        <p className="mt-6 flex items-center gap-2 text-sm text-regantify-text-muted">
          <CheckCircle2 size={16} className="text-emerald-600" />
          Closed {ticket.closedAt ? formatDateTime(ticket.closedAt) : ''}
        </p>
      )}

      <div ref={bottomRef} className="mt-8 pb-4">
        <ReplyBox
          sending={reply.isPending}
          onSend={(body) => reply.mutateAsync(body)}
          placeholder={closed ? 'Still need help? Write here to reopen this ticket.' : 'Write a reply…'}
          note={closed ? 'This ticket is closed. Sending a reply reopens it.' : undefined}
          actions={
            !closed && (
              <button
                type="button"
                onClick={() => close.mutate()}
                disabled={close.isPending}
                className="rounded-xl px-3 py-2 text-sm font-medium text-regantify-text hover:bg-black/5 disabled:opacity-50"
              >
                Mark as solved
              </button>
            )
          }
        />
      </div>
    </div>
  );
}
