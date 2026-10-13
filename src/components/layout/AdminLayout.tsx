import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AdminTopbar } from '../admin/AdminTopbar';
import { AdminSidebar } from '../admin/AdminSidebar';
import { useConsoleDensity } from '../../lib/useConsoleDensity';
import { adminNav } from '../../lib/navConfig';
import { useScrollMemory } from '../../lib/useScrollMemory';
import { ADMIN_ROLE_LABEL, canOpenAdminPath, useAdminNav, useAdminViewer } from '../../lib/adminPermissions';

/** Shown instead of a page the signed-in team member's role can't open (super-admin-plan.md Step 13). The server refuses the data anyway. */
function AdminNoAccess() {
  const viewer = useAdminViewer();
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-regantify-text-muted">
        <Lock size={20} strokeWidth={1.8} aria-hidden />
      </span>
      <h1 className="mt-3 text-sm font-medium text-regantify-text">You don’t have access to this page</h1>
      <p className="mt-1 max-w-sm text-xs text-regantify-text-muted">
        Your team role ({ADMIN_ROLE_LABEL[viewer.role ?? 'OWNER']}) doesn’t include it. Ask the owner if you need it.
      </p>
      <Link to="/admin/dashboard" className="mt-5 rounded-xl bg-regantify-black px-4 py-2 text-sm font-medium text-white">
        Back to Dashboard
      </Link>
    </div>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Back / a link up to a list reopens it where it was scrolled (see useScrollMemory).
  const mainRef = useRef<HTMLElement>(null);
  useScrollMemory(mainRef);
  const nav = useAdminNav(adminNav);
  const [density, setDensity] = useConsoleDensity();
  const viewer = useAdminViewer();
  const { pathname } = useLocation();

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
      <AdminSidebar sections={nav} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-regantify-content">
        <AdminTopbar sections={nav} onMenuClick={() => setMenuOpen(true)} density={density} onDensity={setDensity} />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
          {canOpenAdminPath(viewer, pathname) ? <Outlet /> : <AdminNoAccess />}
        </main>
      </div>
    </div>
  );
}
