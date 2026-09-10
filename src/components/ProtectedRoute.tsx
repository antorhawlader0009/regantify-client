import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type Role } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

/**
 * Wrap a set of routes with this. Redirects to the right login page if
 * there's no session at all, or to /unauthorized if the session exists but
 * is the wrong role for this section.
 *
 * Relies on AuthBootstrap having already run (it wraps the whole app in
 * App.tsx and blocks rendering until the boot-time session-restore attempt
 * finishes), so by the time this component ever renders, accessToken/user
 * reflect the real session state — not just whatever was left in memory
 * before a page reload.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    const loginPath = allowedRoles.includes('SUPER_ADMIN') ? '/admin/login' : '/vendor/login';
    return <Navigate to={loginPath} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
