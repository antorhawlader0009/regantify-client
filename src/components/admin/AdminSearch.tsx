import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CornerDownLeft, Search } from 'lucide-react';
import { adminAlertsApi, type AdminSearchGroup } from '../../lib/adminAlertsApi';
import { adminNav, navLinks } from '../../lib/navConfig';
import { adminCan, useAdminNav, useAdminViewer, type AdminPermission } from '../../lib/adminPermissions';
import { Dialog } from '../ui/Dialog';

interface Entry {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

/** Settings tabs, so “withdraw fee” or “pause AI” lands on the right tab (super-admin-plan.md Step 18). `perm: null` = every team member. */
const SETTINGS: Array<{ tab: string; label: string; words: string; perm: AdminPermission | null }> = [
  { tab: 'security', label: 'Security', words: 'two factor 2fa authenticator recovery codes password sign out everywhere devices sign-in history', perm: null },
  { tab: 'alerts', label: 'Alerts', words: 'notifications telegram bell daily summary topics sms urgent', perm: null },
  { tab: 'company', label: 'Company details', words: 'receipt company name address tax bin tin footer', perm: 'settings.manage' },
  { tab: 'contact', label: 'Contact', words: 'support phone whatsapp alert phone', perm: 'settings.manage' },
  { tab: 'signup', label: 'Sign-up rules', words: 'signup approval closed reserved addresses subdomains blocked words store names', perm: 'settings.manage' },
  { tab: 'money', label: 'Money settings', words: 'withdraw fee minimum withdrawal grace days trial free trial sms low balance level', perm: 'settings.manage' },
  { tab: 'terms', label: 'Terms and privacy', words: 'terms privacy policy accept version legal', perm: 'settings.manage' },
  { tab: 'maintenance', label: 'Maintenance banner', words: 'maintenance downtime notice banner message', perm: 'settings.manage' },
  { tab: 'keys', label: 'Platform keys', words: 'api keys paystation bulksmsbd cloudflare tavily vapid telegram r2 env', perm: 'settings.manage' },
  { tab: 'switches', label: 'Switches', words: 'kill switch pause ai chat sms telegram push signups pos offline sync outage', perm: 'settings.manage' },
  { tab: 'data', label: 'Data requests', words: 'data export erase delete shopper gdpr privacy request', perm: 'settings.manage' },
  { tab: 'activity', label: 'Activity log', words: 'audit log admin actions history who did', perm: 'audit.view' },
];

/** Every typed word must appear somewhere in the entry's words (so “fee withdraw” and “withdraw fee” both work). */
const matches = (haystack: string, query: string) => query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => haystack.toLowerCase().includes(w));

/**
 * Ctrl/Cmd+K in the admin top bar (super-admin-plan.md Step 18). Pages and Settings tabs are matched here from what this person's role can open; IDs (order,
 * tracking, PayStation invoice, receipt, ticket, phone, store) are looked up on the server, which also checks the role.
 */
export function AdminSearch() {
  const navigate = useNavigate();
  const viewer = useAdminViewer();
  const nav = useAdminNav(adminNav);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) {
      setQ('');
      setDebounced('');
      setActive(0);
    }
  }, [open]);

  const { data: found = [], isFetching } = useQuery({ queryKey: ['admin-search', debounced], queryFn: () => adminAlertsApi.search(debounced), enabled: open && debounced.length >= 2, staleTime: 30_000 });

  const pages = useMemo<Entry[]>(() => {
    const seen = new Set<string>();
    const all: Entry[] = [];
    for (const s of nav) {
      if (s.path) all.push({ id: s.path, title: s.label, subtitle: s.group ?? 'Page', path: s.path });
    }
    for (const s of nav) for (const l of navLinks(s.children ?? [])) all.push({ id: l.path, title: l.label, subtitle: s.label, path: l.path });
    return all.filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)));
  }, [nav]);

  const groups = useMemo<AdminSearchGroup[]>(() => {
    const text = q.trim();
    const local: AdminSearchGroup[] = [];
    if (text.length >= 2) {
      const p = pages.filter((e) => matches(`${e.title} ${e.subtitle} ${e.path}`, text)).slice(0, 5);
      if (p.length) local.push({ group: 'Pages', hits: p });
      const st = SETTINGS.filter((s) => adminCan(viewer, s.perm) && matches(`${s.label} ${s.words}`, text)).slice(0, 5);
      if (st.length) local.push({ group: 'Settings', hits: st.map((s) => ({ id: s.tab, title: s.label, subtitle: 'Settings', path: `/admin/settings?tab=${s.tab}` })) });
    }
    // Typed IDs first (they are what was read out on a call), then pages and settings.
    return [...(debounced === q.trim() ? found : []), ...local];
  }, [q, debounced, found, pages, viewer]);

  const flat = groups.flatMap((g) => g.hits);
  useEffect(() => setActive(0), [groups.length, debounced]);
  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mx-auto hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg border border-line px-3 text-left text-sm text-neutral-500 transition hover:border-neutral-300 md:flex" aria-label="Search">
        <Search size={16} className="shrink-0 text-neutral-600" />
        <span className="flex-1 truncate">Search stores, orders, IDs…</span>
        <kbd className="rounded border border-line px-1.5 text-[11px] text-neutral-500">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-neutral-700 md:hidden">
        <Search size={17} />
      </button>
      <Dialog open={open} onOpenChange={setOpen} maxWidth="max-w-xl">
        <div className="p-3">
          <div className="flex items-center gap-2 rounded-xl bg-regantify-search px-3.5 py-2.5">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              ref={input}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(flat.length - 1, a + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === 'Enter' && flat[active]) {
                  e.preventDefault();
                  go(flat[active].path);
                }
              }}
              placeholder="Store, order number, tracking ID, phone, invoice, receipt, #ticket, a page…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </div>
          <div className="mt-2 max-h-[55vh] overflow-y-auto">
            {q.trim().length < 2 && <p className="px-3 py-6 text-center text-sm text-regantify-text-muted">Type at least 2 letters. Try a store name, <span className="font-medium">RCPT-000123</span>, <span className="font-medium">#12</span>, a phone or a tracking ID.</p>}
            {q.trim().length >= 2 && flat.length === 0 && <p className="px-3 py-6 text-center text-sm text-regantify-text-muted">{isFetching ? 'Searching…' : 'Nothing found.'}</p>}
            {(() => {
              let i = -1;
              return groups.map((g) => (
                <div key={g.group} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{g.group}</p>
                  {g.hits.map((h) => {
                    i += 1;
                    const idx = i;
                    return (
                      <button key={`${g.group}-${h.id}-${h.path}`} type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(h.path)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${active === idx ? 'bg-regantify-content' : ''}`}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-regantify-text">{h.title}</span>
                          <span className="block truncate text-xs text-regantify-text-muted">{h.subtitle}</span>
                        </span>
                        {active === idx && <CornerDownLeft size={14} className="shrink-0 text-neutral-400" />}
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      </Dialog>
    </>
  );
}
