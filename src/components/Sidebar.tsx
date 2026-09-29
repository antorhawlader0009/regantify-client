import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { isNavGroup, navLinks, type NavLinkItem, type NavSection } from '../lib/navConfig';
import { LMS_WINDOW, openLms } from '../lib/lmsWindow';

interface SidebarProps {
  sections: NavSection[];
}

export function Sidebar({ sections }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const containsCurrent = (links: NavLinkItem[]) =>
    links.some((c) => location.pathname.startsWith(c.path));

  // Expand whichever section (and sub-group) contains the current route on first render.
  // Sub-groups are keyed "Section/Group" so two sections can reuse a group label.
  const initiallyOpen = sections.flatMap((s) => {
    if (!containsCurrent(navLinks(s.children))) return [];
    const groups = (s.children ?? [])
      .filter(isNavGroup)
      .filter((g) => containsCurrent(g.children))
      .map((g) => `${s.label}/${g.label}`);
    return [s.label, ...groups];
  });

  const [openSections, setOpenSections] = useState<string[]>(initiallyOpen);

  const toggle = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const renderLink = (child: NavLinkItem) => (
    <NavLink
      key={child.path}
      to={child.path}
      className={({ isActive }) =>
        `block px-2 py-1.5 rounded-md text-[14px] ${
          isActive
            ? 'text-regantify-text font-medium'
            : 'text-regantify-text-muted hover:text-regantify-text'
        }`
      }
    >
      {child.label}
    </NavLink>
  );

  return (
    <aside className="w-[280px] shrink-0 bg-[#f8f8f8] border-r border-black/5 h-full overflow-y-auto py-6 px-4">
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const hasChildren = !!section.children?.length;
          const isOpen = openSections.includes(section.label);

          if (section.newWindow && section.path) {
            // A real link, so middle-click and "open in new tab" still work.
            return (
              <a
                key={section.label}
                href={section.path}
                target={LMS_WINDOW}
                title="Opens in a new tab"
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  // In-app navigation in the same tab when the session can't move
                  // to a new one (impersonation): a full page load would lose it.
                  if (!openLms()) navigate(section.path!);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-[15px] text-regantify-text hover:bg-black/5"
              >
                <Icon size={20} strokeWidth={1.8} />
                {section.label}
                <ExternalLink size={14} strokeWidth={1.8} className="ml-auto text-regantify-text-muted" aria-hidden />
              </a>
            );
          }

          if (!hasChildren && section.path) {
            return (
              <NavLink
                key={section.label}
                to={section.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-[15px] ${
                    isActive
                      ? 'text-regantify-text bg-black/5'
                      : 'text-regantify-text hover:bg-black/5'
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                {section.label}
              </NavLink>
            );
          }

          return (
            <div key={section.label}>
              <button
                onClick={() => toggle(section.label)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-[15px]
                  text-regantify-text hover:bg-black/5"
              >
                <Icon size={20} strokeWidth={1.8} />
                {section.label}
              </button>

              {isOpen && (
                <div className="ml-9 mt-0.5 space-y-0.5 border-l border-black/10 pl-3">
                  {section.children!.map((child) => {
                    if (!isNavGroup(child)) return renderLink(child);

                    const groupKey = `${section.label}/${child.label}`;
                    const groupOpen = openSections.includes(groupKey);
                    return (
                      <div key={groupKey}>
                        <button
                          onClick={() => toggle(groupKey)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[14px]
                            text-regantify-text-muted hover:text-regantify-text"
                        >
                          {child.label}
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${groupOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {groupOpen && (
                          <div className="ml-2 space-y-0.5 border-l border-black/10 pl-3">
                            {child.children.map(renderLink)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
