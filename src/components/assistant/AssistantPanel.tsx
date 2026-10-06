import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp, Check, ChevronDown, ExternalLink, Maximize2, Minimize2, PanelLeft, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { assistantApi, type AssistantFill, type AssistantMessage, type AssistantRoute } from '../../lib/assistantApi';
import { applyFills, assistantRoutes, collectPageFields } from '../../lib/assistantPage';
import { useAssistantUi } from '../../store/assistantStore';
import { useAuthStore } from '../../store/authStore';
import { viewerOf } from '../../lib/useStaffAccess';
import { canOpenPath } from '../../lib/staffPermissions';

/*
 * Dashboard "Ask AI" side panel: docked on the right of the vendor
 * dashboard (pushes the page, never floats over it; a full-screen sheet on
 * phones). The server keeps no chats. The last 10 are kept in this browser's
 * localStorage, per logged-in user, and the recent messages are sent along
 * with each question.
 */

const MAX_CHATS = 10;
/** Earlier messages sent with a new question (the server accepts up to 14 in all). */
const SEND_MESSAGES = 12;

/** A saved message. Only role + content go to the server; the rest is for the buttons under an answer. */
interface ChatMessage extends AssistantMessage {
  links?: AssistantRoute[];
  fills?: AssistantFill[];
  /** The page the fills were made for (they only apply while it is open). */
  fillPath?: string;
  applied?: boolean;
}

interface Chat {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const storageKey = (userId: string) => `regantify-assistant-chats:${userId}`;

function loadChats(userId: string): Chat[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c): c is Chat => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHATS);
  } catch {
    return [];
  }
}

function saveChats(userId: string, chats: Chat[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(chats));
  } catch {
    // Storage full or blocked: the chat still works, it just isn't remembered.
  }
}

/** "3m", "2h", "5d" like the history list shows. */
function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();

/** Turns **bold** in a reply into <strong>; everything else stays plain text. */
function renderReply(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

export function AssistantPanel() {
  const { open, expanded, setOpen, toggleExpanded } = useAssistantUi();
  const userId = useAuthStore((s) => s.user?.id);

  // Remount per user so a different login never sees someone else's chats.
  if (!open || !userId) return null;
  return (
    <aside
      aria-label="Ask AI"
      className={`fixed inset-0 z-50 flex ${
        expanded ? 'bg-neutral-900/80 p-2 sm:p-3' : 'flex-col bg-[#fafafa] lg:static lg:z-auto lg:w-[400px] lg:shrink-0 lg:border-l lg:border-line'
      }`}
    >
      <PanelBody key={userId} userId={userId} expanded={expanded} onToggleExpanded={toggleExpanded} onClose={() => setOpen(false)} />
    </aside>
  );
}

function PanelBody({
  userId,
  expanded,
  onToggleExpanded,
  onClose,
}: {
  userId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>(() => loadChats(userId));
  // null = a new chat that has no messages yet.
  const [currentId, setCurrentId] = useState<string | null>(() => loadChats(userId)[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = chats.find((c) => c.id === currentId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [current?.messages.length, sending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentId]);

  // Esc leaves full screen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !menuOpen) onToggleExpanded();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, menuOpen, onToggleExpanded]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const update = (next: Chat[]) => {
    const kept = [...next].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
    setChats(kept);
    saveChats(userId, kept);
  };

  const newChat = () => {
    setCurrentId(null);
    setDraft('');
    setError(null);
    setMenuOpen(false);
  };

  const deleteChat = (id: string) => {
    update(chats.filter((c) => c.id !== id));
    if (id === currentId) {
      setCurrentId(null);
      setError(null);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setDraft('');

    const id = current?.id ?? crypto.randomUUID();
    const base: Chat = current ?? { id, title: text.replace(/\s+/g, ' ').slice(0, 40), updatedAt: Date.now(), messages: [] };
    const withQuestion: Chat = { ...base, updatedAt: Date.now(), messages: [...base.messages, { role: 'user', content: text }] };
    update([withQuestion, ...chats.filter((c) => c.id !== id)]);
    setCurrentId(id);
    setSending(true);
    try {
      const history = withQuestion.messages.slice(-SEND_MESSAGES).map(({ role, content }) => ({ role, content }));
      const page = { path: location.pathname, fields: collectPageFields() };
      // It may only point to pages this person's role can open (rule-plan.md Step 7).
      const routes = assistantRoutes().filter((r) => canOpenPath(viewerOf(useAuthStore.getState().user), r.path));
      const answer = await assistantApi.chat(history, routes, page);
      const reply: ChatMessage = {
        role: 'assistant',
        content: answer.reply,
        ...(answer.links.length ? { links: answer.links } : {}),
        ...(answer.fills.length ? { fills: answer.fills, fillPath: page.path } : {}),
      };
      const answered: Chat = { ...withQuestion, updatedAt: Date.now(), messages: [...withQuestion.messages, reply] };
      setChats((latest) => {
        const next = [answered, ...latest.filter((c) => c.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
        saveChats(userId, next);
        return next;
      });
    } catch (e) {
      setError(apiErrorMessage(e, "The assistant couldn't answer. Please try again."));
    } finally {
      setSending(false);
    }
  };

  /** Seller wants to see the page: leave full screen, and on phones close the panel. */
  const revealPage = () => {
    if (expanded) onToggleExpanded();
    else if (window.innerWidth < 1024) onClose();
  };

  const openLink = (path: string) => {
    navigate(path);
    revealPage();
  };

  const applyMessage = (index: number) => {
    if (!current) return;
    const m = current.messages[index];
    if (!m?.fills || m.applied) return;
    const { applied, missing } = applyFills(m.fills);
    if (applied === 0) {
      setError('Could not find those fields on this page any more. Ask again here.');
      return;
    }
    setError(missing ? `${missing} field(s) could not be filled. Check the page.` : null);
    const messages = current.messages.map((x, i) => (i === index ? { ...x, applied: true } : x));
    update([{ ...current, messages }, ...chats.filter((c) => c.id !== current.id)]);
    revealPage();
  };

  /** Page buttons and the fill suggestion shown under an answer. */
  const extras = (m: ChatMessage, index: number): ReactNode => {
    const onFillPage = m.fills && m.fillPath === location.pathname;
    return (
      <>
        {m.links && m.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.links.map((l) => (
              <button
                key={l.path}
                type="button"
                onClick={() => openLink(l.path)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
              >
                {l.label} <ExternalLink size={13} className="text-neutral-400" />
              </button>
            ))}
          </div>
        )}
        {m.fills && m.fills.length > 0 && (
          <div className="mt-3 rounded-xl border border-line bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-semibold text-neutral-500">Suggested for this page</p>
            <ul className="space-y-1.5 text-sm">
              {m.fills.map((f) => (
                <li key={f.id} className="flex gap-2">
                  <span className="w-2/5 shrink-0 truncate text-neutral-500">{f.label}</span>
                  <span className="min-w-0 flex-1 break-words text-neutral-900">{f.value.length > 120 ? `${f.value.slice(0, 120)}...` : f.value}</span>
                </li>
              ))}
            </ul>
            {m.applied ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700">
                <Check size={15} /> Filled in. Check it, then save the page.
              </p>
            ) : onFillPage ? (
              <button
                type="button"
                onClick={() => applyMessage(index)}
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Apply to page
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openLink(m.fillPath ?? '/vendor/dashboard')}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm text-neutral-800 hover:bg-neutral-100"
              >
                Open that page to apply
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => !q || c.title.toLowerCase().includes(q));
  }, [chats, query]);
  const today = shown.filter((c) => isToday(c.updatedAt));
  const older = shown.filter((c) => !isToday(c.updatedAt));

  const trashBtn = (c: Chat) => (
    <button
      type="button"
      onClick={() => deleteChat(c.id)}
      aria-label={`Delete chat: ${c.title}`}
      title="Delete chat"
      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
    >
      <Trash2 size={15} />
    </button>
  );

  const row = (c: Chat) => (
    <div key={c.id} className={`group flex items-center rounded-lg ${c.id === currentId ? 'bg-orange-50' : 'hover:bg-neutral-100'}`}>
      <button
        type="button"
        onClick={() => {
          setCurrentId(c.id);
          setError(null);
          setMenuOpen(false);
        }}
        className={`flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5 text-left text-sm ${
          c.id === currentId ? 'text-orange-700' : 'text-neutral-800'
        }`}
      >
        <span className="truncate">{c.title}</span>
        <span className="shrink-0 text-xs text-neutral-500">{ago(c.updatedAt)}</span>
      </button>
      {trashBtn(c)}
    </div>
  );

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100';

  if (expanded) {
    const sideRow = (c: Chat) => (
      <div key={c.id} className={`group flex items-center rounded-lg ${c.id === currentId ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`}>
        <button
          type="button"
          onClick={() => {
            setCurrentId(c.id);
            setError(null);
          }}
          className={`block min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${
            c.id === currentId ? 'font-medium text-neutral-900' : 'text-neutral-700'
          }`}
        >
          {c.title}
        </button>
        {trashBtn(c)}
      </div>
    );
    return (
      <div className="flex h-full w-full overflow-hidden rounded-2xl bg-[#fafafa] shadow-2xl">
        {/* Always mounted so the width can animate; the inner box keeps its size while it slides. */}
        <div
          className={`hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out md:block ${
            sidebarOpen ? 'w-[340px] border-r border-line' : 'w-0'
          }`}
          aria-hidden={!sidebarOpen}
        >
          <div className="flex h-full w-[340px] flex-col bg-[#fcfcfc]">
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-line px-5">
              <span className="flex items-center gap-2 text-[15px] font-medium text-neutral-900">
                <Sparkles size={18} className="text-orange-500" /> Chat
              </span>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Hide chat list" className={iconBtn}>
                <PanelLeft size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <button type="button" onClick={newChat} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-800 hover:bg-neutral-100">
                <Plus size={16} /> New chat
              </button>
              {searchOpen ? (
                <div className="relative px-1 py-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => {
                      if (!query) setSearchOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        // Closes the search only, not full screen.
                        e.stopPropagation();
                        setQuery('');
                        setSearchOpen(false);
                      }
                    }}
                    placeholder="Search chats"
                    className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setSearchOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-800 hover:bg-neutral-100">
                  <Search size={16} /> Search
                </button>
              )}
              {today.length > 0 && <p className="px-3 pb-1 pt-6 text-sm font-medium text-neutral-900">Today</p>}
              {today.map(sideRow)}
              {older.length > 0 && <p className="px-3 pb-1 pt-6 text-sm font-medium text-neutral-900">Older</p>}
              {older.map(sideRow)}
              {shown.length === 0 && <p className="px-3 py-4 text-sm text-neutral-500">{chats.length ? 'No match.' : 'No chats yet.'}</p>}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[60px] shrink-0 items-center gap-2 px-4">
            {!sidebarOpen && (
              <>
                <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Show chat list" className={iconBtn}>
                  <PanelLeft size={18} />
                </button>
                <button type="button" onClick={newChat} aria-label="New chat" title="New chat" className={iconBtn}>
                  <Plus size={18} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label="Exit full screen"
              title="Exit full screen (Esc)"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              <Minimize2 size={16} />
            </button>
          </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-[820px] space-y-6">
        {!current && (
          <div className="pt-10 text-center text-sm text-neutral-500">
            <p className="text-[15px] font-medium text-neutral-800">How can I help?</p>
            <p className="mt-1">Ask how to do something in your dashboard.</p>
            <p className="mt-1 text-xs">Your last {MAX_CHATS} chats are saved in this browser only.</p>
          </div>
        )}
        {current?.messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-neutral-200/70 px-4 py-3 text-[15px] text-neutral-900">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="py-1">
              <p className="mb-1 text-[15px] font-medium text-orange-600">Assistant</p>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-900">{renderReply(m.content)}</p>
              {extras(m, i)}
            </div>
          ),
        )}
        {sending && (
          <div className="py-1">
            <p className="mb-1 text-[15px] font-medium text-orange-600">Assistant</p>
            <p className="text-sm text-neutral-500">Thinking...</p>
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={bottomRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[820px] shrink-0 px-4 pb-6">
        <div className="rounded-2xl border border-line bg-white p-3 shadow-sm focus-within:border-neutral-400">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="Ask anything about your store dashboard"
            className="block max-h-40 w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:bg-blue-200"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex h-[60px] shrink-0 items-center justify-between border-b border-line px-4" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex min-w-0 items-center gap-1.5 rounded-lg py-1 pr-2 text-[15px] font-medium text-neutral-900"
        >
          <span className="truncate">{current?.title ?? 'New conversation'}</span>
          <ChevronDown size={16} className="shrink-0" />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={newChat} aria-label="New conversation" title="New conversation" className={iconBtn}>
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label="Full screen"
            title="Full screen"
            className={iconBtn}
          >
            <Maximize2 size={16} />
          </button>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className={iconBtn}>
            <X size={18} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute left-3 top-[52px] z-10 w-[min(360px,calc(100%-24px))] rounded-xl border border-line bg-white p-2 shadow-lg">
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-10 w-full rounded-lg border border-line bg-neutral-50 pl-3 pr-9 text-sm outline-none focus:border-neutral-400"
              />
              <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {today.length > 0 && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-neutral-500">Today</p>}
              {today.map(row)}
              {older.length > 0 && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-neutral-500">Older</p>}
              {older.map(row)}
              {shown.length === 0 && <p className="px-3 py-4 text-sm text-neutral-500">{chats.length ? 'No match.' : 'No conversations yet.'}</p>}
            </div>
            <button
              type="button"
              onClick={newChat}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              <Plus size={16} /> New conversation
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!current && (
          <div className="pt-10 text-center text-sm text-neutral-500">
            <p className="text-[15px] font-medium text-neutral-800">How can I help?</p>
            <p className="mt-1">Ask how to do something in your dashboard.</p>
            <p className="mt-1 text-xs">Your last {MAX_CHATS} chats are saved in this browser only.</p>
          </div>
        )}
        {current?.messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-neutral-200/70 px-4 py-3 text-[15px] text-neutral-900">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-1 text-[15px] font-medium text-orange-600">Assistant</p>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-900">{renderReply(m.content)}</p>
              {extras(m, i)}
            </div>
          ),
        )}
        {sending && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="mb-1 text-[15px] font-medium text-orange-600">Assistant</p>
            <p className="text-sm text-neutral-500">Thinking...</p>
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-4 pt-0">
        <div className="rounded-2xl border border-line bg-white p-3 shadow-sm focus-within:border-neutral-400">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="Ask anything about your store dashboard"
            className="block max-h-40 w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:bg-blue-200"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
