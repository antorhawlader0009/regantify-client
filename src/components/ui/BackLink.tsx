import { useEffect, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * The one "back" link of the dashboards (vendor and Super Admin): a small "‹ Orders" above a page's title that names the
 * page it goes back to, like Shopify admin's back action. Every page that is opened from inside another one (a detail,
 * an add/edit form, a tool reached from a button) shows it; pages in the sidebar don't need it.
 *
 * It is smart about history: when the page before this one in the tab IS that parent page, a click steps back in the
 * browser history instead of opening the parent again. The list then comes back at its own address (page, tab, filters
 * in the address) and scroll, and the browser's Back button does not bounce the person into the detail page again.
 * Opened from a link, a new tab or search, it simply goes to the parent. A middle click or Ctrl click opens the parent
 * in a new tab as usual (it is a real link).
 */

type TrailEntry = { key: string; path: string };

// The pages visited in this tab, oldest first (only their keys and paths). Kept by <NavTrail />.
const trail: TrailEntry[] = [];

/** Keeps the in-tab history BackLink reads. Mount once, inside the router. */
export function NavTrail() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    const entry = { key: location.key, path: location.pathname };
    if (trail[trail.length - 1]?.key === entry.key) return;
    const at = trail.findIndex((e) => e.key === entry.key);
    if (type === 'POP' && at >= 0) trail.length = at + 1;
    else if (type === 'REPLACE' && trail.length > 0) trail[trail.length - 1] = entry;
    else trail.push(entry);
    if (trail.length > 60) trail.splice(0, trail.length - 60);
  }, [location.key, location.pathname, type]);
  return null;
}

export interface BackTarget {
  /** The parent page. A query or hash in it is kept when the link opens it fresh. */
  to: string;
  /** The parent's name, shown after the arrow: "Orders", "All products", "Integrations". */
  label: string;
}

export function BackLink({ to, label, className = 'mb-2' }: BackTarget & { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const targetPath = to.split(/[?#]/)[0];

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const here = trail.findIndex((t) => t.key === location.key);
    const previous = here > 0 ? trail[here - 1] : null;
    if (previous && previous.path === targetPath) {
      e.preventDefault();
      navigate(-1);
    }
  };

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={`Back to ${label}`}
      className={`group inline-flex items-center gap-0.5 rounded-md py-0.5 pr-1.5 text-sm text-regantify-text-muted transition-colors hover:text-regantify-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-regantify-cta/40 print:hidden ${className}`}
    >
      <ChevronLeft size={16} aria-hidden className="-ml-0.5 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
