import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  CornerDownLeft,
  Clock,
  CreditCard,
  FileText,
  Layers,
  LayoutGrid,
  Loader2,
  type LucideIcon,
  Megaphone,
  Package,
  Plus,
  ReceiptText,
  Search,
  Star,
  Tag,
  User,
  X,
} from 'lucide-react';
import { searchApi } from '../../lib/searchApi';
import { clearRecents, loadRecents, queryTokens, quickActions, saveRecent, searchStatic, type RecentEntry } from '../../lib/searchIndex';
import { useAuthStore } from '../../store/authStore';
import { useViewer } from '../../lib/useStaffAccess';
import { canOpenPath } from '../../lib/staffPermissions';
import { useSearchUi } from '../../store/searchStore';

/*
 * Top-bar search for the vendor dashboard, a "command palette": one box
 * that finds dashboard pages and "Add ..." actions instantly (no server),
 * and the store's own products, orders, customers, coupons and more through
 * GET /v1/search. Opens from the top bar, Ctrl/Cmd+K or "/", and works
 * entirely from the keyboard. Recently opened results show when it is empty.
 */

interface Row {
  key: string;
  group: string;
  icon: string;
  title: string;
  subtitle?: string;
  path: string;
  image?: string;
}

const ICONS: Record<string, LucideIcon> = {
  recent: Clock,
  page: LayoutGrid,
  action: Plus,
  products: Package,
  orders: ReceiptText,
  customers: User,
  categories: Layers,
  brands: Tag,
  collections: Layers,
  coupons: CreditCard,
  campaigns: Megaphone,
  pages: FileText,
  reviews: Star,
};

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

/** Bolds the words typed inside a result title. */
function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'ig'));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-amber-100 text-inherit">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** The field in the top bar. Looks like a search box, opens the palette. */
export function SearchTrigger() {
  const setOpen = useSearchUi((s) => s.setOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="mx-auto hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg border border-line px-3 text-left text-sm text-neutral-500 transition hover:border-neutral-300 md:flex"
      >
        <Search size={16} className="shrink-0 text-neutral-600" />
        <span className="flex-1 truncate">Search</span>
        <kbd className="hidden shrink-0 rounded border border-line bg-neutral-50 px-1.5 py-0.5 font-sans text-[11px] text-neutral-500 lg:block">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-700 md:hidden"
      >
        <Search size={17} />
      </button>
    </>
  );
}

/** Mounted once in the Topbar; renders nothing until opened. */
export function SearchPalette() {
  const open = useSearchUi((s) => s.open);
  const setOpen = useSearchUi((s) => s.setOpen);

  // Ctrl/Cmd+K toggles it anywhere; "/" opens it when not typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useSearchUi.getState().open);
        return;
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || useSearchUi.getState().open) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  if (!open) return null;
  return createPortal(<PaletteBody onClose={() => setOpen(false)} />, document.body);
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const viewer = useViewer();
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<RecentEntry[]>(() => loadRecents(userId));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setTerm(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Page scroll stays put behind the palette.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const searching = term.length >= 2;
  const remote = useQuery({
    queryKey: ['global-search', term],
    queryFn: () => searchApi.find(term),
    enabled: searching,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const q = query.trim();
    // Only pages this person's role can open (rule-plan.md Step 7).
    const canGo = (path: string) => canOpenPath(viewer, path);
    if (!q) {
      recents
        .filter((r) => canGo(r.path))
        .forEach((r, i) => out.push({ key: `recent-${i}`, group: 'Recent', icon: 'recent', title: r.title, subtitle: r.subtitle, path: r.path }));
      quickActions()
        .filter((a) => canGo(a.path))
        .slice(0, 6)
        .forEach((a) => out.push({ key: `qa-${a.path}`, group: 'Quick actions', icon: 'action', title: a.title, path: a.path }));
      return out;
    }
    const matches = searchStatic(q, 40)
      .filter((m) => canGo(m.path))
      .slice(0, 12);
    matches
      .filter((m) => m.kind === 'page')
      .slice(0, 4)
      .forEach((m) => out.push({ key: `page-${m.path}-${m.title}`, group: 'Go to', icon: 'page', title: m.title, subtitle: m.subtitle, path: m.path }));
    matches
      .filter((m) => m.kind === 'action')
      .slice(0, 3)
      .forEach((m) => out.push({ key: `act-${m.path}`, group: 'Actions', icon: 'action', title: m.title, path: m.path }));
    // Results for the previous word stay visible while the new ones load, but only if they still fit what is typed.
    for (const g of remote.data?.groups ?? []) {
      for (const it of g.items) {
        out.push({ key: `${g.key}-${it.id}`, group: g.label, icon: g.key, title: it.title, subtitle: it.subtitle, path: it.path, image: it.image });
      }
    }
    return out;
  }, [query, recents, remote.data, viewer]);

  useEffect(() => setActive(0), [query, remote.data]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, rows]);

  const choose = (row: Row) => {
    if (userId) setRecents(saveRecent(userId, { title: row.title, subtitle: row.subtitle, path: row.path }));
    onClose();
    navigate(row.path);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === 'ArrowUp' && rows.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === 'Enter' && rows[active]) {
      e.preventDefault();
      choose(rows[active]);
    }
  };

  const tokens = queryTokens(query);
  const waiting = searching && (remote.isFetching || term !== query.trim());
  const empty = query.trim().length > 0 && rows.length === 0 && !waiting;

  let body: ReactNode;
  if (empty) {
    body = (
      <div className="px-6 py-12 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-800">No results for &ldquo;{query.trim()}&rdquo;</p>
        <p className="mt-1">Try a product name, an order number (or its last few characters), a phone number, or a page name.</p>
      </div>
    );
  } else {
    let lastGroup = '';
    body = rows.map((row, i) => {
      const Icon = ICONS[row.icon] ?? Search;
      const showHeader = row.group !== lastGroup;
      lastGroup = row.group;
      return (
        <Fragment key={row.key}>
          {showHeader && (
            <div className="flex items-center justify-between px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {row.group}
              {row.group === 'Recent' && (
                <button
                  type="button"
                  onClick={() => {
                    clearRecents(userId);
                    setRecents([]);
                  }}
                  className="font-normal normal-case tracking-normal text-neutral-500 hover:text-neutral-800"
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            data-active={i === active}
            onMouseMove={() => i !== active && setActive(i)}
            onClick={() => choose(row)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === active ? 'bg-neutral-100' : ''}`}
          >
            {row.image ? (
              <img src={row.image} alt="" className="h-8 w-8 shrink-0 rounded-md border border-line object-cover" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-white text-neutral-600">
                <Icon size={15} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-neutral-900">
                <Highlight text={row.title} tokens={tokens} />
              </span>
              {row.subtitle && (
                <span className="block truncate text-xs text-neutral-500">
                  <Highlight text={row.subtitle} tokens={tokens} />
                </span>
              )}
            </span>
            {i === active && <CornerDownLeft size={14} className="shrink-0 text-neutral-400" aria-hidden />}
          </button>
        </Fragment>
      );
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-neutral-900/40 sm:px-4 sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-label="Search"
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[70vh] sm:max-w-[640px] sm:rounded-2xl sm:border sm:border-line"
      >
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-neutral-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={80}
            placeholder="Search products, orders, customers, pages..."
            aria-label="Search"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
          {waiting && <Loader2 size={16} className="shrink-0 animate-spin text-neutral-400" aria-label="Searching" />}
          <button type="button" onClick={onClose} aria-label="Close search" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 sm:hidden">
            <X size={18} />
          </button>
          <kbd className="hidden shrink-0 rounded border border-line bg-neutral-50 px-1.5 py-0.5 font-sans text-[11px] text-neutral-500 sm:block">Esc</kbd>
        </div>

        <div ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {body}
          {remote.isError && searching && <p className="px-3 py-3 text-xs text-neutral-500">Could not search your store right now. Pages and actions still work.</p>}
        </div>

        <div className="hidden shrink-0 items-center gap-4 border-t border-line bg-neutral-50 px-4 py-2 text-xs text-neutral-500 sm:flex">
          <span>&uarr;&darr; to move</span>
          <span>&crarr; to open</span>
          <span>Esc to close</span>
          <span className="ml-auto">Tip: type an order number or a phone number</span>
        </div>
      </div>
    </div>
  );
}
