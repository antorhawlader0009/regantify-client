import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

function SupportDot() {
  const viewer = useAdminViewer();
  const { data: count = 0 } = useQuery({ queryKey: ['support-unread', 'admin'], queryFn: adminSupportApi.unreadCount, refetchInterval: 60_000, retry: false, enabled: adminCan(viewer, 'support.manage') });
  if (!count) return null;
  return <span className="ml-auto min-w-[18px] rounded-full bg-[var(--console-brass)] px-1.5 text-center text-[10.5px] font-semibold leading-[18px] text-[#0c2b25]">{count > 99 ? '99+' : count}</span>;
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

  const rail = (
    <aside className="flex h-full w-[236px] shrink-0 flex-col bg-regantify-sidebar text-[var(--console-rail-text)]" aria-label="Admin navigation">
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-4">
        <Link to="/admin/dashboard" className="flex items-center gap-2.5" aria-label="Regantify console, home">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--console-brass)] text-[15px] font-bold text-[#0c2b25]">R</span>
          <span className="text-[15px] font-semibold leading-none text-white">Regantify <span className="font-normal text-[var(--console-rail-text)]">Console</span></span>
        </Link>
        <button type="button" onClick={onMobileClose} aria-label="Close menu" className="ml-auto rounded p-1 text-[var(--console-rail-text)] hover:bg-[var(--console-rail-hover)] lg:hidden">
          <X size={16} />
        </button>
      </div>

      <nav className="console-rail min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-1">
        {groups.map((g) => {
          const holdsActive = g.items.some((i) => isActive(i.path!, pathname));
          const open = holdsActive || !collapsed.includes(g.name);
          return (
            <div key={g.name} className="mb-1">
              <button type="button" onClick={() => toggle(g.name)} aria-expanded={open} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[11.5px] font-medium text-[#7fa396] hover:text-white">
                {g.name}
                <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
              {open && (
                <ul className="mt-0.5 space-y-px">
                  {g.items.map((it) => {
                    const active = isActive(it.path!, pathname);
                    return (
                      <li key={it.path}>
                        <NavLink
                          to={it.path!}
                          aria-current={active ? 'page' : undefined}
                          className={`relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${active ? 'bg-[var(--console-rail-hover)] font-medium text-white' : 'hover:bg-[var(--console-rail-hover)] hover:text-white'}`}
                        >
                          {active && <span className="absolute -left-2.5 top-1.5 h-5 w-[3px] rounded-r bg-[var(--console-brass)]" aria-hidden />}
                          <it.icon size={15} strokeWidth={1.75} className={active ? 'text-[var(--console-brass)]' : 'text-[#8fb0a4]'} />
                          <span className="truncate">{it.label}</span>
                          {it.path === '/admin/support' && <SupportDot />}
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

      <div className="flex shrink-0 items-center gap-2.5 border-t border-[var(--console-rail-line)] px-3.5 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--console-rail-hover)] text-[12px] font-semibold text-white ring-1 ring-[var(--console-rail-line)]">{initials}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium text-white">{user?.fullName ?? 'Admin'}</span>
          <span className="block truncate text-[11.5px] text-[#7fa396]">{ADMIN_ROLE_LABEL[viewer.role ?? 'OWNER']}</span>
        </span>
        <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="rounded-md p-1.5 text-[#8fb0a4] hover:bg-[var(--console-rail-hover)] hover:text-white">
          <LogOut size={15} />
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
