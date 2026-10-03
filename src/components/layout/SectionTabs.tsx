import { NavLink, useLocation } from 'react-router-dom';
import { isNavGroup, type NavSection } from '../../lib/navConfig';

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * Tab bar for the sidebar sub-group (e.g. Store > Design) the current page
 * belongs to, so its sibling pages are one click away without the sidebar.
 * Renders nothing on pages that aren't inside a sub-group.
 */
export function SectionTabs({ sections }: { sections: NavSection[] }) {
  const { pathname } = useLocation();
  const group = sections
    .flatMap((s) => s.children ?? [])
    .filter(isNavGroup)
    .find((g) => g.children.some((c) => matches(pathname, c.path)));
  if (!group) return null;

  return (
    <nav aria-label={group.label} className="mb-5 -mt-1 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {group.children.map((c) => {
          const active = matches(pathname, c.path);
          return (
            <li key={c.path}>
              <NavLink
                to={c.path}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] transition-colors ${
                  active
                    ? 'border-brand font-medium text-brand'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
                }`}
              >
                {c.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
