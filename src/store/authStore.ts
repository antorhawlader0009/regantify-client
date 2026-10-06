import { create } from 'zustand';

export type Role = 'SUPER_ADMIN' | 'VENDOR' | 'STAFF';

export interface AuthUser {
  id: string;
  role: Role;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  // True until a Vendor either sets their own password or skips the
  // prompt — always false/absent for Super Admin.
  mustSetPassword?: boolean;
  vendor?: {
    storeName: string;
    subdomain: string;
    // Serialized as a string by Prisma's Decimal JSON encoding (e.g.
    // "1250.00") — parse with Number(...) before formatting/display.
    balance: string;
  } | null;
  // What they may do in the dashboard (rule-plan.md Step 3): sent with every
  // user the auth endpoints return. The owner has every permission. Missing
  // on a session saved before roles existed (see viewerOf in useStaffAccess).
  isOwner?: boolean;
  staffRole?: string | null;
  staffRoleName?: string | null;
  permissions?: string[];
  // The owner's note for a staff member, until they've seen it once (Step 7).
  welcomeMessage?: string | null;
  // Note: Vendor.address is intentionally NOT included here — it's not
  // part of the login/session payload, only fetched/edited directly on
  // the Settings page (see getVendorSettings/updateVendorSettings).
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  // False until the app has attempted to restore a session on boot (via
  // a silent /auth/refresh call using the httpOnly refresh cookie).
  // ProtectedRoute waits for this before deciding to redirect to login,
  // so a hard page reload doesn't bounce a still-logged-in vendor out.
  hasHydrated: boolean;
  // True in a Super Admin "Login as vendor" tab. That session has no
  // refresh cookie of its own, so it only works in the tab it was opened in
  // (VendorImpersonateEntry).
  impersonated: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
  markImpersonated: () => void;
  clearAuth: () => void;
  setHasHydrated: () => void;
}

/**
 * Access token + user live only in memory (Zustand), per the project brief.
 * The refresh token is set as an httpOnly cookie by the backend, so it never
 * touches JS on this side.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hasHydrated: false,
  impersonated: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  markImpersonated: () => set({ impersonated: true }),
  clearAuth: () => set({ accessToken: null, user: null, impersonated: false }),
  setHasHydrated: () => set({ hasHydrated: true }),
}));
