import { useEffect, useState } from 'react';
import { adminCan, useAdminViewer } from '../lib/adminPermissions';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight, Headphones, LogOut, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { idlePoll } from '../lib/idlePolling';
import { isNavGroup, navLinks, type AdvancedNavGroup, type NavGroup, type NavLinkItem, type NavSection } from '../lib/navConfig';
import { adminSupportApi, supportApi } from '../lib/supportApi';
import { getVendorPlanUsage } from '../lib/plansApi';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../lib/useLogout';
import { ConfirmDialog } from './ui/ConfirmDialog';

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
function SupportUnreadBadge({ admin, collapsed, dotClass = 'right-3 top-2' }: { admin: boolean; collapsed: boolean; dotClass?: string }) {
  const viewer = useAdminViewer();
  const { data: count = 0 } = useQuery({
    queryKey: ['support-unread', admin ? 'admin' : 'vendor'],
    queryFn: admin ? adminSupportApi.unreadCount : supportApi.unreadCount,
    refetchInterval: idlePoll(60_000, 5),
    retry: false,
    enabled: !admin || adminCan(viewer, 'support.manage'),
  });
  if (!count) return null;
  if (collapsed) {
    return <span className={`absolute ${dotClass} h-2 w-2 rounded-full bg-orange-500`}aria-label={`${count} unread`} />;
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
    <span className="animate-pop-in inline-flex translate-y-[3px] items-center rounded-full border border-brand-lime bg-brand-lime px-1.5 py-px text-[8.5px] font-semibold uppercase leading-tight tracking-wider text-brand-dark">
      {children}
    </span>
  );
}

const isSettingsRow = (s: NavSection) => Boolean(s.path?.endsWith('/settings'));
const isSupportRow = (s: NavSection) => Boolean(s.path?.endsWith('/support'));

// Same look as the main menu rows: plain on white, grey on hover, the shared nav-active highlight for the open page.
const tileClass = (active: boolean) =>
  `relative flex min-w-0 flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[11px] leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
    active ? 'nav-active' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
  }`;

/**
 * The sidebar's foot: the bottom pages (Add-ons, Support, Settings) and Log out as one row of small tiles, then who is
 * signed in with the store's plan and an Upgrade button. No card of its own, so it reads as part of the menu above.
 */
function AccountDock({ links, onLogout }: { links: NavSection[]; onLogout: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, retry: false });
  const name = user?.fullName?.trim() || user?.vendor?.storeName || 'My account';
  const sub = user?.email || user?.phone || '';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const plan = data?.plan;
  const topPlan = plan?.code === 'ADVANCE';
  // Billing is owner-only, so staff see the plan without the button.
  const canBuy = user?.isOwner !== false;
  // Add-ons, Support, Settings, then Log out.
  const ordered = [...links.filter((s) => !isSettingsRow(s)), ...links.filter(isSettingsRow)].filter((s) => s.path);

  return (
    <div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${ordered.length + 1}, minmax(0, 1fr))` }}>
        {ordered.map((s) => {
          const Icon = s.icon;
          return (
            <NavLink key={s.label} to={s.path!} title={s.label} className={({ isActive }) => tileClass(isActive)}>
              <Icon size={17} strokeWidth={1.6} />
              <span className="max-w-full truncate">{s.label}</span>
              {isSupportRow(s) && <SupportUnreadBadge admin={false} collapsed dotClass="right-2.5 top-1.5" />}
            </NavLink>
          );
        })}
        <button type="button" onClick={onLogout} title="Log out" className={`${tileClass(false)} hover:!bg-red-50 hover:!text-red-600`}>
          <LogOut size={17} strokeWidth={1.6} />
          <span>Log out</span>
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-dashed border-neutral-200 pt-3">
        {/* Photo and name open the person's own profile; the plan line opens Billing (owner only; staff see plain text). */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-1">
          <Link to="/vendor/profile" title="Your profile" className="shrink-0 rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-[12px] font-semibold text-brand" aria-hidden>
                {initials || 'R'}
              </span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to="/vendor/profile"
              title={sub ? `${name} · ${sub}` : name}
              className="block truncate text-[13px] font-semibold leading-tight text-regantify-text hover:text-brand focus-visible:outline-none focus-visible:underline"
            >
              {name}
            </Link>
            {plan &&
              (canBuy ? (
                <Link to="/vendor/billing?tab=plan" className="mt-0.5 block truncate text-[11.5px] leading-tight text-neutral-500 hover:text-brand hover:underline focus-visible:outline-none focus-visible:underline">
                  {plan.name} plan
                </Link>
              ) : (
                <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-neutral-500">{plan.name} plan</span>
              ))}
          </div>
        </div>
        {plan && canBuy && (
          <Link
            to="/vendor/billing?tab=plan"
            className={`inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95 ${
              topPlan ? 'border border-line bg-white text-neutral-700 hover:bg-neutral-100' : 'bg-brand text-white hover:bg-brand/90'
            }`}
          >
            {topPlan ? 'Manage' : 'Upgrade'}
          </Link>
        )}
      </div>
    </div>
  );
}

const rowClass = (active: boolean, collapsed: boolean) =>
  `relative flex w-full items-center rounded-md py-2.5 text-[14px] ${
    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
  } ${active ? 'nav-active' : 'text-neutral-800 hover:bg-neutral-100'}`;

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block flex-1 rounded-md px-3 py-2 text-[13px] ${
    isActive ? 'sub-active bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
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
  /** The vendor dashboard's "Advanced menu" switch (advanced pages are already filtered out of `sections`). */
  advancedMenu?: { on: boolean; count: number; groups: AdvancedNavGroup[]; onToggle: () => void };
  /** Phones/tablets: whether the drawer is open (the topbar's menu button opens it). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ sections, advancedMenu, mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);
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
                    isActive ? 'sub-active bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-500 hover:bg-neutral-50'
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
        {advancedMenu && (
          <button
            type="button"
            onClick={advancedMenu.onToggle}
            aria-pressed={advancedMenu.on}
            title={advancedMenu.on ? 'Hide the advanced pages' : `Show ${advancedMenu.count} more pages for experienced sellers`}
            className={`mb-3 flex w-full items-center rounded-md py-2 text-[13px] text-neutral-600 hover:bg-neutral-100 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            }`}
          >
            <SlidersHorizontal size={16} strokeWidth={1.6} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">{advancedMenu.on ? 'Hide advanced pages' : 'Advanced pages'}</span>
                <ChevronDown size={14} className={`ml-auto shrink-0 text-neutral-500 transition-transform ${advancedMenu.on ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        )}
        {advancedMenu?.on && !collapsed && (
          <div className="mb-3 space-y-2 border-t border-dashed border-neutral-200 pt-3">
            {advancedMenu.groups.map((g) => (
              <div key={g.label}>
                <p className="mb-1 px-3 text-[11px] uppercase tracking-wide text-neutral-400">{g.label}</p>
                {g.links.map((l) => (
                  <NavLink key={l.path} to={l.path} className={subLinkClass}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Always pinned to the bottom. Expanded: one compact card (profile, plan, Add-ons, Support, Settings, Log out). */}
      <div className="shrink-0 space-y-0.5 border-t border-dashed border-neutral-200 bg-white px-3 py-3">
        {collapsed ? (
          <>
            {sections.filter((s) => s.bottom).map((s) => renderSection(s))}
            <button onClick={() => setConfirmLogout(true)} title="Logout" className={rowClass(false, true)}>
              <LogOut size={17} strokeWidth={1.6} className="shrink-0" />
            </button>
          </>
        ) : (
          <AccountDock links={sections.filter((s) => s.bottom)} onLogout={() => setConfirmLogout(true)} />
        )}
      </div>
    </aside>
    <ConfirmDialog
      open={confirmLogout}
      onOpenChange={setConfirmLogout}
      title="Log out?"
      message="You will be signed out of Regantify on this device."
      confirmLabel="Yes, log out"
      onConfirm={() => {
        setConfirmLogout(false);
        logout();
      }}
    />
    </>
  );
}
