import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { adminNav } from '../../lib/navConfig';

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar sections={adminNav} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-[#fafafa] lg:border-l lg:border-line">
        <Topbar sections={adminNav} onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
