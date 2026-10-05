import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { adminNav } from '../../lib/navConfig';
import { useScrollMemory } from '../../lib/useScrollMemory';

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Back / a link up to a list reopens it where it was scrolled (see useScrollMemory).
  const mainRef = useRef<HTMLElement>(null);
  useScrollMemory(mainRef);

  // Marks <body> while the Super Admin panel is open so index.css swaps the
  // dashboard colours to the red set. On <body> (not this div) so dropdowns
  // and dialogs rendered into a portal get it too. The vendor panel keeps
  // the default indigo.
  useEffect(() => {
    document.body.classList.add('admin-panel');
    return () => document.body.classList.remove('admin-panel');
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar sections={adminNav} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-regantify-content lg:border-l lg:border-line">
        <Topbar sections={adminNav} onMenuClick={() => setMenuOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
