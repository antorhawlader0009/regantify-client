import { create } from 'zustand';

export type Role = 'SUPER_ADMIN' | 'VENDOR' | 'STAFF';

/** How much of the vendor dashboard a person sees (User.dashboardView). Not a plan and not a permission. */
export type DashboardView = 'SIMPLE' | 'FULL';

export interface AuthUser {
  id: string;
  role: Role;
  phone?: string | null;
  email?: string | null;
  /** When the email was verified with a code (Profile > Verify); null = not verified, or changed since. */
  emailVerifiedAt?: string | null;
  /** The Google account that can sign in to this account ("Continue with Google"), and when it was linked. */
  googleEmail?: string | null;
  googleLinkedAt?: string | null;
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
  // A Super Admin's team role and what it allows (super-admin-plan.md Step 13). Missing on a session saved before roles existed.
  adminRole?: string;
  adminPermissions?: string[];
  // The owner's note for a staff member, until they've seen it once (Step 7).
  welcomeMessage?: string | null;
  // Simple mode / Full mode of the dashboard and the pages pinned to the menu in Simple mode (SIMPLE-VIEW-plan.md).
  // Missing on a session saved before the feature: treated as FULL (see useDashboardView).
  dashboardView?: DashboardView;
  simplePins?: string[];
  // Note: Vendor.address is intentionally NOT included here — it's not
  // part of the login/session payload, only fetched/edited directly on
  // the Settings page (see getVendorSettings/updateVendorSettings).
}

export interface ImpersonationInfo {
  adminName: string;
  readOnly: boolean;
  reason: string | null;
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
  /** Who is looking and whether changes are allowed (shown in the red bar). */
  impersonation: ImpersonationInfo | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  markImpersonated: (info?: ImpersonationInfo) => void;
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
  impersonation: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  markImpersonated: (info) => set({ impersonated: true, impersonation: info ?? null }),
  clearAuth: () => set({ accessToken: null, user: null, impersonated: false, impersonation: null }),
  setHasHydrated: () => set({ hasHydrated: true }),
}));
