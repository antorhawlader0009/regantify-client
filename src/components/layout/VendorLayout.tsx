import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { vendorNav } from '../../lib/navConfig';

// Full-screen shell: sidebar fixed on the left, only the content column scrolls.
// Below lg the sidebar is a drawer, opened from the topbar's menu button.
export function VendorLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar sections={vendorNav} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-[#fafafa] lg:border-l lg:border-line">
        <Topbar sections={vendorNav} onMenuClick={() => setMenuOpen(true)} />
        <main className="isolate flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
