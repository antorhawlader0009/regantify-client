import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { idlePoll } from '../../lib/idlePolling';
import { ChevronDown, LogOut, X } from 'lucide-react';
import type { NavSection } from '../../lib/navConfig';
import { adminSupportApi } from '../../lib/supportApi';
import { ADMIN_ROLE_LABEL, adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { useAuthStore } from '../../store/authStore';
import { useLogout } from '../../lib/useLogout';

const KEY = 'regantify.console.railCollapsed';

function readCollapsed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** "All stores" also covers one store's own page (/admin/vendors/<id>); the other store lists keep their own link. */
function isActive(path: string, pathname: string): boolean {
  if (path === '/admin/vendors/all') return pathname === path || (pathname.startsWith('/admin/vendors/') && !/^\/admin\/vendors\/(pending|suspended)/.test(pathname));
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SupportDot({ onAccent }: { onAccent: boolean }) {
  const viewer = useAdminViewer();
  const { data: count = 0 } = useQuery({ queryKey: ['support-unread', 'admin'], queryFn: adminSupportApi.unreadCount, refetchInterval: idlePoll(60_000, 5), retry: false, enabled: adminCan(viewer, 'support.manage') });
  if (!count) return null;
  // On the orange pill the count turns white so it still stands out.
  return <span className={`ml-auto min-w-[20px] rounded-full px-1.5 text-center text-[10.5px] font-semibold leading-[20px] ${onAccent ? 'bg-white text-regantify-cta' : 'bg-[var(--console-brass)] text-[#0F2027]'}`}>{count > 99 ? '99+' : count}</span>;
}

/**
 * The Super Admin rail (design pass 2026-10-13): bottle green, links grouped by job, each group collapsible and remembered. A group that holds the open page
 * is always open. Below lg it is a drawer, like the vendor sidebar.
 */
export function AdminSidebar({ sections, mobileOpen, onMobileClose }: { sections: NavSection[]; mobileOpen: boolean; onMobileClose: () => void }) {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const viewer = useAdminViewer();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  const groups = useMemo(() => {
    const out: Array<{ name: string; items: NavSection[] }> = [];
    for (const s of sections) {
      if (!s.path) continue;
      const name = s.group ?? 'Other';
      (out.find((g) => g.name === name) ?? out[out.push({ name, items: [] }) - 1]).items.push(s);
    }
    return out;
  }, [sections]);

  useEffect(() => onMobileClose(), [pathname]); // close the drawer after a tap
  const toggle = (name: string) =>
    setCollapsed((c) => {
      const next = c.includes(name) ? c.filter((x) => x !== name) : [...c, name];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the rail just starts open next time
      }
      return next;
    });

  const initials = (user?.fullName ?? 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Dark rail with an orange-to-coral pill for the open page (admin-panel-new-theme.md Step 2).
  const rail = (
    <aside className="flex h-full w-[256px] shrink-0 flex-col bg-regantify-sidebar text-[var(--console-rail-text)]" aria-label="Admin navigation">
      <div className="flex h-[72px] shrink-0 items-center gap-2.5 px-6">
        <Link to="/admin/dashboard" className="flex items-baseline gap-1.5" aria-label="Regantify console, home">
          <span className="bg-[image:var(--console-accent-gradient)] bg-clip-text text-[24px] font-bold leading-none tracking-tight text-transparent">regantify</span>
          <span className="text-[11px] font-medium text-[var(--console-rail-muted)]">console</span>
        </Link>
        <button type="button" onClick={onMobileClose} aria-label="Close menu" className="ml-auto rounded-lg p-1.5 text-[var(--console-rail-text)] hover:bg-[var(--console-rail-hover)] lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="console-rail min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
        {groups.map((g) => {
          const holdsActive = g.items.some((i) => isActive(i.path!, pathname));
          const open = holdsActive || !collapsed.includes(g.name);
          return (
            <div key={g.name} className="mb-3">
              <button type="button" onClick={() => toggle(g.name)} aria-expanded={open} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--console-rail-muted)] hover:text-white">
                {g.name}
                <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
              {open && (
                <ul className="mt-1 space-y-1">
                  {g.items.map((it) => {
                    const active = isActive(it.path!, pathname);
                    return (
                      <li key={it.path}>
                        <NavLink
                          to={it.path!}
                          aria-current={active ? 'page' : undefined}
                          className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors ${
                            active
                              ? 'bg-[image:var(--console-accent-gradient)] font-medium text-white shadow-[0_6px_16px_rgba(245,87,108,0.28)]'
                              : 'hover:bg-[var(--console-rail-hover)] hover:text-white'
                          }`}
                        >
                          <it.icon size={17} strokeWidth={1.8} className={active ? 'text-white' : 'text-[var(--console-rail-muted)]'} />
                          <span className="truncate">{it.label}</span>
                          {it.path === '/admin/support' && <SupportDot onAccent={active} />}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3 border-t border-[var(--console-rail-line)] px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--console-rail-hover)] text-[12px] font-semibold text-white ring-1 ring-[var(--console-rail-line)]">{initials}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium text-white">{user?.fullName ?? 'Admin'}</span>
          <span className="block truncate text-[11.5px] text-[var(--console-rail-muted)]">{ADMIN_ROLE_LABEL[viewer.role ?? 'OWNER']}</span>
        </span>
        <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="rounded-lg p-2 text-[var(--console-rail-muted)] hover:bg-[var(--console-rail-hover)] hover:text-white">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full lg:block">{rail}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={onMobileClose} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 shadow-xl">{rail}</div>
        </div>
      )}
    </>
  );
}
