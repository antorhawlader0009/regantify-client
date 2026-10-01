import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, SendHorizontal } from 'lucide-react';
import type { SupportMessage, SupportStatus } from '../../lib/supportApi';
import { formatDateTime } from '../lms/format';

type Viewer = 'VENDOR' | 'ADMIN';

/** Whose turn it is, worded for whoever is looking. */
export function statusCopy(status: SupportStatus, viewer: Viewer): { label: string; className: string } {
  if (status === 'CLOSED') return { label: 'Closed', className: 'bg-black/5 text-regantify-text-muted' };
  if (status === 'OPEN') {
    return viewer === 'VENDOR'
      ? { label: 'Waiting on support', className: 'bg-amber-50 text-amber-700' }
      : { label: 'Needs reply', className: 'bg-regantify-cta/10 text-regantify-cta-dark' };
  }
  return viewer === 'VENDOR'
    ? { label: 'Support replied', className: 'bg-emerald-50 text-emerald-700' }
    : { label: 'Waiting on vendor', className: 'bg-sky-50 text-sky-700' };
}

export function StatusPill({ status, viewer }: { status: SupportStatus; viewer: Viewer }) {
  const { label, className } = statusCopy(status, viewer);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

/** The Regantify mark used as support's avatar, so a reply from the team is recognisable at a glance. */
function SupportMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-regantify-topbar font-brand text-lg leading-none text-white">
      R
    </span>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-regantify-search text-xs font-semibold text-regantify-text">
      {initials || '?'}
    </span>
  );
}

interface TicketThreadProps {
  messages: SupportMessage[];
  viewer: Viewer;
}

/**
 * The conversation. Support's messages sit on the left on a grey surface
 * with the Regantify mark; the store's sit on the right in white. Each side
 * sees its own messages on the right, like any chat.
 */
export function TicketThread({ messages, viewer }: TicketThreadProps) {
  return (
    <ol className="space-y-5">
      {messages.map((m) => {
        const mine = m.authorRole === viewer;
        const fromSupport = m.authorRole === 'ADMIN';
        return (
          <li key={m.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
            {fromSupport ? <SupportMark /> : <Initials name={m.authorName} />}
            <div className={`min-w-0 max-w-[80%] ${mine ? 'items-end text-right' : ''} flex flex-col`}>
              <div className={`mb-1 flex items-baseline gap-2 text-xs ${mine ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold text-regantify-text">
                  {fromSupport ? (viewer === 'VENDOR' ? 'Regantify Support' : `${m.authorName} (support)`) : m.authorName}
                </span>
                <time className="text-regantify-text-muted" dateTime={m.createdAt}>
                  {formatDateTime(m.createdAt)}
                </time>
              </div>
              <div
                className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-relaxed text-regantify-text ${
                  fromSupport
                    ? 'rounded-tl-md bg-regantify-content'
                    : `border border-black/10 bg-white ${mine ? 'rounded-tr-md' : 'rounded-tl-md'}`
                }`}
              >
                {m.body}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface ReplyBoxProps {
  onSend: (body: string) => Promise<unknown>;
  sending: boolean;
  placeholder?: string;
  /** Shown above the box, e.g. "Replying will reopen this ticket." */
  note?: ReactNode;
  /** Extra buttons next to Send (Close ticket etc.). */
  actions?: ReactNode;
}

/** Reply composer. Ctrl/Cmd+Enter sends. Clears only after the send succeeds. */
export function ReplyBox({ onSend, sending, placeholder = 'Write a reply…', note, actions }: ReplyBoxProps) {
  const [body, setBody] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to a limit.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }, [body]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    try {
      await onSend(text);
      setBody('');
    } catch {
      // the caller shows the error; keep the text so nothing is lost
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white focus-within:border-black/30 transition-colors">
      {note && <div className="border-b border-black/5 px-4 py-2 text-xs text-regantify-text-muted">{note}</div>}
      <label className="sr-only" htmlFor="support-reply">
        Reply
      </label>
      <textarea
        id="support-reply"
        ref={ref}
        rows={3}
        value={body}
        maxLength={5000}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
        <span className="hidden text-[11px] text-regantify-text-muted sm:inline">Ctrl + Enter to send</span>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => void send()}
            disabled={!body.trim() || sending}
            className="inline-flex items-center gap-2 rounded-xl bg-regantify-black px-4 py-2 text-sm font-medium text-white
              transition-colors hover:bg-regantify-cta-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-black focus-visible:ring-offset-2
              disabled:opacity-40"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
            Send reply
          </button>
        </div>
      </div>
    </div>
  );
}
