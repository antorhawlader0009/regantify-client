import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  CornerDownLeft,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Headphones,
  Layers,
  LayoutGrid,
  UsersRound,
  Zap,
  Loader2,
  type LucideIcon,
  Megaphone,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings2,
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
import { fullViewPageOf, useSimpleViewKeeps } from '../../lib/simpleView';
import { useDashboardView } from '../../lib/useDashboardView';

/*
 * Top-bar search for the vendor dashboard, a "command palette": one box
 * that finds dashboard pages, settings (searchCatalog.ts) and "Add ..." actions instantly (no server),
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
  setting: Settings2,
  action: Plus,
  discounts: Tag,
  flashSales: Zap,
  giftCards: Gift,
  sizeGuides: Layers,
  tickets: Headphones,
  staff: UsersRound,
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

/**
 * A result like `/vendor/lms/settings#team` opens the page, then scrolls to the section with that id. The page may
 * still be loading its data, so it looks for the section for up to 3 seconds.
 */
function scrollToHash(path: string) {
  const id = path.split('#')[1];
  if (!id) return;
  let tries = 0;
  const timer = window.setInterval(() => {
    const el = document.getElementById(id);
    if (el) {
      window.clearInterval(timer);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (++tries >= 30) {
      window.clearInterval(timer);
    }
  }, 100);
}


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

/**
 * The open palette. Loaded on demand by SearchShell.tsx (the top-bar button and the keyboard shortcut live there), so this
 * file and the settings catalog it searches stay out of the site's first download.
 */
export default function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const viewer = useViewer();
  const { isSimple } = useDashboardView();
  const viewKeeps = useSimpleViewKeeps();
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
    const matches = searchStatic(q, 120)
      .filter((m) => canGo(m.path))
      .slice(0, 40);
    // Pages, settings and actions, the group holding the best match first.
    const kinds = [
      { kind: 'page' as const, group: 'Go to', icon: 'page', max: 6 },
      { kind: 'setting' as const, group: 'Settings', icon: 'setting', max: 10 },
      { kind: 'action' as const, group: 'Actions', icon: 'action', max: 4 },
    ].sort((a, b) => {
      const ia = matches.findIndex((m) => m.kind === a.kind);
      const ib = matches.findIndex((m) => m.kind === b.kind);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const k of kinds) {
      matches
        .filter((m) => m.kind === k.kind)
        .slice(0, k.max)
        .forEach((m) => out.push({ key: `${k.kind}-${m.path}-${m.title}`, group: k.group, icon: k.icon, title: m.title, subtitle: m.subtitle, path: m.path }));
    }
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
    scrollToHash(row.path);
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
  // Simple mode: search still finds every page; a Full mode one is tagged (SIMPLE-VIEW-plan.md Step 3).
  const isHiddenPage = (path: string) => {
    const page = fullViewPageOf(path.split(/[?#]/)[0]);
    return page !== null && !viewKeeps.includes(page);
  };
  const waiting = searching && (remote.isFetching || term !== query.trim());
  const empty = query.trim().length > 0 && rows.length === 0 && !waiting;

  let body: ReactNode;
  if (empty) {
    body = (
      <div className="px-6 py-12 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-800">No results for &ldquo;{query.trim()}&rdquo;</p>
        <p className="mt-1">Try a product name, an order number, a phone number, a page, or what a setting does (for example &ldquo;low stock&rdquo;, &ldquo;block fake orders&rdquo; or &ldquo;delivery charge&rdquo;).</p>
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
            {isSimple && isHiddenPage(row.path) && (
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-neutral-500" title="Opens fine; this page is part of Full mode">
                Full mode
              </span>
            )}
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
            placeholder="Search products, orders, customers, settings, pages..."
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
          <span className="ml-auto">Tip: search a setting by what it does</span>
        </div>
      </div>
    </div>
  );
}
