import { useMemo, type ReactNode } from 'react';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { vendorNav, type NavSection } from './navConfig';
import { canAccess, navForViewer, type NavAccess, type StaffViewer } from './staffPermissions';

/**
 * The signed-in person's dashboard access (rule-plan.md Step 7), from the
 * permissions the server sends with the user. The server enforces all of it;
 * these only decide what to show.
 */
export function viewerOf(user: AuthUser | null): StaffViewer {
  if (!user) return { isOwner: false, permissions: [] };
  if (user.role === 'VENDOR') return { isOwner: true, permissions: null };
  // A session saved before roles existed has no list: show the page and let the server decide.
  return { isOwner: user.isOwner ?? false, permissions: user.permissions ?? null };
}

export function useViewer(): StaffViewer {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => viewerOf(user), [user]);
}

/** e.g. useCan('orders.cancel_refund'), useCan(['orders.courier', 'courier.manage']), useCan('owner'). */
export function useCan(need: NavAccess): boolean {
  return canAccess(useViewer(), need);
}

/** Renders its children only when the viewer has `perm` (any one of a list), else `fallback`. */
export function Can({ perm, children, fallback = null }: { perm: NavAccess; children: ReactNode; fallback?: ReactNode }) {
  return <>{useCan(perm) ? children : fallback}</>;
}

/** The vendor nav without the pages this viewer can't open. */
export function useVendorNav(): NavSection[] {
  const viewer = useViewer();
  return useMemo(() => navForViewer(vendorNav, viewer), [viewer]);
}
