import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useViewer } from '../../lib/useStaffAccess';
import { accessForPath, canAccess } from '../../lib/staffPermissions';
import { PageSection, primaryBtn } from '../ui/PageKit';

/**
 * Shows the current vendor page only when the signed-in person's role may
 * open it (rule-plan.md Step 7, lib/staffPermissions.ts accessForPath),
 * otherwise a "no access" card. The server refuses the data anyway; this
 * just keeps a staff member from landing on a page of 403 errors.
 *
 * `children` for the page inside VendorLayout (the sidebar stays); without
 * children it's a route element for the full-screen pages (builders, POS).
 */
export function VendorPageGate({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const viewer = useViewer();
  if (canAccess(viewer, accessForPath(pathname))) return <>{children ?? <Outlet />}</>;
  return children ? <NoAccess /> : <div className="flex min-h-screen items-center justify-center bg-[#efeff6] p-4"><NoAccess /></div>;
}

function NoAccess() {
  const roleName = useAuthStore((s) => s.user?.staffRoleName);
  return (
    <PageSection>
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-lime/60 text-brand">
          <Lock size={20} strokeWidth={1.8} aria-hidden />
        </span>
        <h1 className="mt-3 text-sm font-medium text-regantify-text">You don’t have access to this page</h1>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          {roleName ? `Your role (${roleName}) doesn’t include it.` : 'Your role doesn’t include it.'} Ask the store owner if you need it.
        </p>
        <Link to="/vendor/dashboard" className={`${primaryBtn} mt-5`}>
          Back to Dashboard
        </Link>
      </div>
    </PageSection>
  );
}
