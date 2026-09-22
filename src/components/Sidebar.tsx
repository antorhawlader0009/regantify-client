import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { NavSection } from '../lib/navConfig';

interface SidebarProps {
  sections: NavSection[];
}

export function Sidebar({ sections }: SidebarProps) {
  const location = useLocation();

  // Expand whichever section contains the current route on first render.
  const initiallyOpen = sections
    .filter((s) => s.children?.some((c) => location.pathname.startsWith(c.path)))
    .map((s) => s.label);

  const [openSections, setOpenSections] = useState<string[]>(initiallyOpen);

  const toggle = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  return (
    <aside className="w-[280px] shrink-0 bg-[#f8f8f8] border-r border-black/5 h-full overflow-y-auto py-6 px-4">
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const hasChildren = !!section.children?.length;
          const isOpen = openSections.includes(section.label);

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
                  {section.children!.map((child) => (
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
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
