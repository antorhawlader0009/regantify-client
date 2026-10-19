import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronRight, Menu, Moon, Rows3, Sun } from 'lucide-react';
import { useAdminTheme } from './useAdminTheme';
import { useAuthStore } from '../../store/authStore';
import type { NavSection } from '../../lib/navConfig';
import { DENSITY_LABEL, type ConsoleDensity } from '../../lib/useConsoleDensity';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { AdminBell } from './AdminBell';
import { AdminSearch } from './AdminSearch';

/** "Group / Page" for the open page: the longest nav path that matches, else a plain name for pages reached from a list (a store, a shopper, an order). */
function crumbs(sections: NavSection[], pathname: string): string[] {
  let best: NavSection | null = null;
  for (const s of sections) {
    if (s.path && (pathname === s.path || pathname.startsWith(`${s.path}/`)) && (!best || s.path.length > best.path!.length)) best = s;
  }
  if (best) return [best.group ?? '', best.label].filter(Boolean);
  const detail: Array<[string, string[]]> = [
    ['/admin/vendors/', ['Stores', 'Store']],
    ['/admin/customers/', ['Commerce', 'Shopper']],
    ['/admin/orders/', ['Commerce', 'Order']],
    ['/admin/support/', ['Reach', 'Support ticket']],
    ['/admin/receipt-details', ['Platform', 'Receipt details']],
  ];
  return detail.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? [];
}

/** The slim bar over every Super Admin page: where you are, Ctrl K search, row density, alerts. */
/** Round light icon button used in the top bar (admin-panel-new-theme.md Step 2). */
const ICON_BUTTON = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-regantify-search text-regantify-text transition hover:bg-[var(--console-hover)]';

export function AdminTopbar({ onMenuClick, density, onDensity }: { sections: NavSection[]; onMenuClick: () => void; density: ConsoleDensity; onDensity: (d: ConsoleDensity) => void }) {
  const user = useAuthStore((s) => s.user);
  const [theme, setTheme] = useAdminTheme();
  const initials = (user?.fullName ?? 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-2 bg-white px-3 sm:gap-3 sm:px-6">
      <button type="button" onClick={onMenuClick} aria-label="Open menu" className={`${ICON_BUTTON} lg:hidden`}>
        <Menu size={18} />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-end md:justify-start">
        <AdminSearch />
      </div>
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={theme === 'dark'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className={ICON_BUTTON}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <DropdownMenu
        widthClass="w-48"
        trigger={
          <button type="button" aria-label="Row density" title="Row density" className={ICON_BUTTON}>
            <Rows3 size={17} />
          </button>
        }
      >
        <p className="px-4 pb-1 pt-1.5 text-xs text-regantify-text-muted">Table rows</p>
        {(Object.keys(DENSITY_LABEL) as ConsoleDensity[]).map((d) => (
          <DropdownMenuItem key={d} onSelect={() => onDensity(d)} icon={density === d ? <Check size={14} /> : <span className="w-[14px]" />}>
            {DENSITY_LABEL[d]}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
      <AdminBell />
      <Link to="/admin/settings" aria-label="Your account settings" title={user?.fullName ?? 'Account'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--tint-orange-bg)] text-[12.5px] font-semibold text-[var(--tint-orange-fg)]">
        {initials}
      </Link>
    </header>
  );
}

/** "Overview > Dashboard" above the page, like the reference (it used to sit inside the top bar). */
export function AdminBreadcrumb({ sections }: { sections: NavSection[] }) {
  const { pathname } = useLocation();
  const trail = crumbs(sections, pathname);
  if (trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-[14px]">
      {trail.map((c, i) => (
        <span key={`${c}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={15} className="text-regantify-text-muted" aria-hidden />}
          <span className={i === trail.length - 1 ? 'font-medium text-regantify-text' : 'text-regantify-text-muted'}>{c}</span>
        </span>
      ))}
    </nav>
  );
}
