import { useEffect } from 'react';
import { authApi } from '../lib/authApi';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { isNetworkError, offlineUser } from '../lib/posOffline';

// /vendor-impersonate is opened in a brand-new tab from Super Admin's
// "Login as Vendor" (see VendorImpersonateEntry.tsx) — it must NEVER run
// the cookie-based refresh below. That tab is in the SAME browser as the
// admin's own session, so a normal refresh() there would silently log
// the tab in as the ADMIN (whoever's httpOnly refresh cookie is present),
// not the vendor, defeating the entire point of impersonation.
// VendorImpersonateEntry does its own auth setup instead.
const SKIP_COOKIE_REFRESH_PATHS = ['/vendor-impersonate'];

/**
 * The access token and user object only ever live in memory (Zustand) —
 * that's fine for normal navigation, but a hard page reload wipes them,
 * even though the httpOnly refresh-token cookie is still valid. Without
 * this, ProtectedRoute would see accessToken === null right after reload
 * and immediately bounce a still-logged-in vendor/admin back to login.
 *
 * This component runs once on mount, tries a silent refresh, and only
 * then lets the rest of the app (and ProtectedRoute) render — a missing
 * or expired cookie is a normal, expected outcome here, not an error.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  useEffect(() => {
    if (SKIP_COOKIE_REFRESH_PATHS.includes(window.location.pathname)) {
      setHasHydrated();
      return;
    }

    let cancelled = false;

    authApi
      .refresh()
      .then((data) => {
        if (!cancelled) setAuth(data.accessToken, data.user);
      })
      .catch((err: unknown) => {
        // No valid refresh cookie (never logged in, logged out, or
        // expired) — this is the normal "not logged in" case, not a
        // failure to surface to the user.
        //
        // POS offline (POS-system-plan.md Step 13): no answer at all on the
        // counter, reloaded in the tab it was already open in, carries on as
        // the user that tab saved. The placeholder token gets a 401 once the
        // internet is back, and the normal refresh then gets a real one.
        const savedUser = offlineUser<AuthUser>();
        if (isNetworkError(err) && savedUser && window.location.pathname.startsWith('/vendor/pos/')) {
          if (!cancelled) setAuth('offline', savedUser);
        }
      })
      .finally(() => {
        if (!cancelled) setHasHydrated();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-regantify-text-muted">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
