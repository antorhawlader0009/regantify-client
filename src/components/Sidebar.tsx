import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight, ExternalLink, LogOut, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { isNavGroup, navLinks, type NavGroup, type NavLinkItem, type NavSection } from '../lib/navConfig';
import { LMS_WINDOW, openLms } from '../lib/lmsWindow';
import { adminSupportApi, supportApi } from '../lib/supportApi';
import { getVendorPlanUsage } from '../lib/plansApi';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../lib/useLogout';

const COLLAPSED_KEY = 'regantify.sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    // storage blocked: the sidebar just starts expanded next time
  }
}

/** Tickets with a reply the viewer hasn't opened: support replies for a store, new store messages for Super Admin. */
function SupportUnreadBadge({ admin, collapsed }: { admin: boolean; collapsed: boolean }) {
  const { data: count = 0 } = useQuery({
    queryKey: ['support-unread', admin ? 'admin' : 'vendor'],
    queryFn: admin ? adminSupportApi.unreadCount : supportApi.unreadCount,
    refetchInterval: 60_000,
    retry: false,
  });
  if (!count) return null;
  if (collapsed) {
    return <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-orange-500" aria-label={`${count} unread`} />;
  }
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** The vendor's plan name in a small filled pill next to the logo. */
function PlanBadge() {
  const { data } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, retry: false });
  if (!data) return null;
  return <Badge>{data.plan.name}</Badge>;
}

function Badge({ children }: { children: string }) {
  return (
    <span className="animate-pop-in inline-flex translate-y-[3px] items-center rounded-full border border-[#d9ed94] bg-[#d9ed94] px-1.5 py-px text-[8.5px] font-semibold uppercase leading-tight tracking-wider text-brand">
      {children}
    </span>
  );
}

const rowClass = (active: boolean, collapsed: boolean) =>
  `relative flex w-full items-center rounded-md py-2.5 text-[14px] ${
    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
  } ${active ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-800 hover:bg-neutral-100'}`;

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block flex-1 rounded-md px-3 py-2 text-[13px] ${
    isActive ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
  }`;

const DESKTOP_QUERY = '(min-width: 1024px)'; // Tailwind `lg`

/** True on lg+ screens, where the sidebar sits in the page; below that it's a slide-in drawer. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

interface SidebarProps {
  sections: NavSection[];
  /** Phones/tablets: whether the drawer is open (the topbar's menu button opens it). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ sections, mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isDesktop = useIsDesktop();
  const [collapsedPref, setCollapsedState] = useState(readCollapsed);
  // The icon-only rail is a desktop thing; the phone drawer always shows labels.
  const collapsed = collapsedPref && isDesktop;

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    writeCollapsed(value);
  };

  // Picking a page closes the drawer; so does Escape.
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onMobileClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const containsCurrent = (links: NavLinkItem[]) => links.some((c) => location.pathname.startsWith(c.path));

  // Expand whichever section (and sub-group) contains the current route on first render.
  // Sub-groups are keyed "Section/Group" so two sections can reuse a group label.
  const [openSections, setOpenSections] = useState<string[]>(() =>
    sections.flatMap((s) => {
      if (!containsCurrent(navLinks(s.children))) return [];
      const groups = (s.children ?? [])
        .filter(isNavGroup)
        .filter((g) => containsCurrent(g.children))
        .map((g) => `${s.label}/${g.label}`);
      return [s.label, ...groups];
    }),
  );

  const toggle = (label: string) => {
    setOpenSections((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  const renderGroup = (section: NavSection, group: NavGroup) => {
    const key = `${section.label}/${group.label}`;
    const open = openSections.includes(key);
    return (
      <div key={key}>
        <button
          onClick={() => toggle(key)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] ${
            containsCurrent(group.children) ? 'font-medium text-neutral-900' : 'text-neutral-600'
          } hover:bg-neutral-50`}
        >
          {group.label}
          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-3">
            {group.children.map((c) => (
              <NavLink
                key={c.path}
                to={c.path}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-1.5 text-[12px] ${
                    isActive ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-500 hover:bg-neutral-50'
                  }`
                }
              >
                {c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: NavSection) => {
    const Icon = section.icon;
    const icon = <Icon size={17} strokeWidth={1.6} className="shrink-0" />;
    const title = collapsed ? section.label : undefined;
    const label = !collapsed && <span className="truncate">{section.label}</span>;

    if (section.newWindow && section.path) {
      // A real link, so middle-click and "open in new tab" still work.
      return (
        <a
          key={section.label}
          href={section.path}
          target={LMS_WINDOW}
          title={collapsed ? `${section.label} (opens in a new tab)` : 'Opens in a new tab'}
          onClick={(e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            // In-app navigation in the same tab when the session can't move
            // to a new one (impersonation): a full page load would lose it.
            if (!openLms()) navigate(section.path!);
          }}
          className={rowClass(false, collapsed)}
        >
          {icon}
          {label}
          {!collapsed && <ExternalLink size={13} className="ml-auto shrink-0 text-neutral-400" aria-hidden />}
        </a>
      );
    }

    const links = navLinks(section.children);
    const active = containsCurrent(links);

    if (!links.length && section.path) {
      return (
        <NavLink key={section.label} to={section.path} title={title} className={({ isActive }) => rowClass(isActive, collapsed)}>
          {icon}
          {label}
          {section.path.endsWith('/support') && (
            <SupportUnreadBadge admin={section.path.startsWith('/admin')} collapsed={collapsed} />
          )}
        </NavLink>
      );
    }

    // Collapsed: icon-only, jumps to the section's first page.
    if (collapsed) {
      return (
        <Link key={section.label} to={links[0].path} title={title} className={rowClass(active, true)}>
          {icon}
        </Link>
      );
    }

    const open = openSections.includes(section.label);
    return (
      <div key={section.label}>
        <button onClick={() => toggle(section.label)} aria-expanded={open} className={rowClass(active, false)}>
          {icon}
          {label}
          <ChevronDown size={16} className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="ml-[21px] mt-1 space-y-0.5 border-l border-neutral-200 pl-3">
            {section.children!.map((child) =>
              isNavGroup(child) ? (
                child.hidden ? null : renderGroup(section, child)
              ) : (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={({ isActive }) =>
                    subLinkClass({ isActive: isActive || Boolean(child.alsoActive?.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) })
                  }
                >
                  {child.label}
                </NavLink>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  // Consecutive sections with the same `group` share one heading.
  const main = sections.filter((s) => !s.bottom);
  const groups: { title?: string; items: NavSection[] }[] = [];
  for (const s of main) {
    const last = groups[groups.length - 1];
    if (last && last.title === s.group) last.items.push(s);
    else groups.push({ title: s.group, items: [s] });
  }

  return (
    <>
      {/* Phones/tablets: dark backdrop behind the open drawer; a tap closes it. */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onMobileClose} aria-hidden />}
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[264px] shrink-0 flex-col bg-white shadow-xl transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0 lg:shadow-none lg:transition-[width] ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'lg:w-[72px]' : 'lg:w-[244px]'}`}
      aria-label="Main menu"
    >
      <div className={`flex h-[60px] shrink-0 items-center border-b border-line ${collapsed ? 'justify-center' : 'justify-between px-3.5'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 font-bold text-brand-lime">R</div>
          {!collapsed && (
            <div className="flex items-end gap-0.5">
              <span className="text-xl font-semibold leading-none text-regantify-text">Regantify</span>
              {isAdmin ? <Badge>Admin</Badge> : <PlanBadge />}
            </div>
          )}
        </div>
        {!collapsed &&
          (isDesktop ? (
            <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar">
              <ChevronsLeft size={16} className="text-neutral-600" />
            </button>
          ) : (
            <button
              onClick={onMobileClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
            >
              <X size={18} />
            </button>
          ))}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="absolute -right-3 top-[18px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white shadow"
        >
          <ChevronsRight size={14} className="text-neutral-600" />
        </button>
      )}

      {/* Only this part scrolls */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4">
        {groups.map((g, i) => (
          <div
            key={g.title ?? i}
            className="mb-3 space-y-0.5 border-b border-dashed border-neutral-200 pb-3 last:mb-0 last:border-b-0 last:pb-1"
          >
            {!collapsed && g.title && <p className="mb-2 px-3 text-[12px] text-neutral-500">{g.title}</p>}
            {g.items.map(renderSection)}
          </div>
        ))}
      </nav>

      {/* Always pinned to the bottom */}
      <div className="shrink-0 space-y-0.5 border-t border-dashed border-neutral-200 bg-white px-3 py-3">
        {sections.filter((s) => s.bottom).map(renderSection)}
        <button onClick={logout} title={collapsed ? 'Logout' : undefined} className={rowClass(false, collapsed)}>
          <LogOut size={17} strokeWidth={1.6} className="shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
