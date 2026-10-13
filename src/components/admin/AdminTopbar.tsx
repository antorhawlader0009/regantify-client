import { useLocation } from 'react-router-dom';
import { Check, Menu, Rows3 } from 'lucide-react';
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
export function AdminTopbar({ sections, onMenuClick, density, onDensity }: { sections: NavSection[]; onMenuClick: () => void; density: ConsoleDensity; onDensity: (d: ConsoleDensity) => void }) {
  const { pathname } = useLocation();
  const trail = crumbs(sections, pathname);
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-5">
      <button type="button" onClick={onMenuClick} aria-label="Open menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-regantify-text lg:hidden">
        <Menu size={17} />
      </button>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink-0 items-center gap-1.5 text-[13px] md:flex">
        {trail.map((c, i) => (
          <span key={`${c}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300" aria-hidden>/</span>}
            <span className={i === trail.length - 1 ? 'font-medium text-regantify-text' : 'text-regantify-text-muted'}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:justify-center">
        <AdminSearch />
      </div>
      <DropdownMenu
        widthClass="w-48"
        trigger={
          <button type="button" aria-label="Row density" title="Row density" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-600 transition hover:border-neutral-300">
            <Rows3 size={16} />
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
    </header>
  );
}
