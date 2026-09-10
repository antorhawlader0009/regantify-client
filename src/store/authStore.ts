import { create } from 'zustand';

export type Role = 'SUPER_ADMIN' | 'VENDOR';

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
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  // False until the app has attempted to restore a session on boot (via
  // a silent /auth/refresh call using the httpOnly refresh cookie).
  // ProtectedRoute waits for this before deciding to redirect to login,
  // so a hard page reload doesn't bounce a still-logged-in vendor out.
  hasHydrated: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
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
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setHasHydrated: () => set({ hasHydrated: true }),
}));
