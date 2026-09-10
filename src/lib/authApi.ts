import { api } from './api';
import type { AuthUser } from '../store/authStore';

export interface SendOtpResponse {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  isNewUser: boolean;
  // Present (true) in two different cases, distinguished by isNewUser:
  //  - isNewUser: true  -> brand-new phone just auto-provisioned; the
  //    frontend shows the SKIPPABLE "set your password" screen, and
  //    accessToken/refreshToken are already present.
  //  - isNewUser: false -> an existing vendor logged in via OTP again;
  //    this is NOT skippable — no tokens are issued, only a setupToken,
  //    and the frontend must route to vendor/complete-setup to force a
  //    new password before a real session is granted.
  mustSetPassword?: boolean;
  setupToken?: string;
  expiresInSeconds?: number;
  phone?: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthTokensResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Response of POST /auth/refresh — now includes the user profile (not just
// tokens) so the app can rehydrate its in-memory auth store after a hard
// page reload, using only the httpOnly refresh cookie.
export interface RefreshResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Response of vendor/login: either a real session (mustSetPassword: false)
// or — if the vendor is still on the temporary SMS'd password — a
// setupToken that only authorizes vendor/complete-setup, with no tokens.
export type VendorLoginResponse =
  | {
      mustSetPassword: false;
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }
  | {
      mustSetPassword: true;
      setupToken: string;
      expiresInSeconds: number;
      user: AuthUser;
    };

export interface SendOtpLikeResponse {
  message: string;
  expiresInSeconds: number;
}

export interface ForgotPasswordVerifyOtpResponse {
  resetToken: string;
  expiresInSeconds: number;
}

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<SendOtpResponse>('/api/v1/auth/vendor/send-otp', { phone }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    api
      .post<VerifyOtpResponse>('/api/v1/auth/vendor/verify-otp', { phone, code })
      .then((r) => r.data),

  // Alternative to OTP — password login using EITHER phone or email as the
  // identifier (backend detects which). If the vendor is still on the
  // temporary password, this comes back as { mustSetPassword: true,
  // setupToken } instead of real tokens — see VendorLoginResponse.
  vendorLogin: (identifier: string, password: string) =>
    api
      .post<VendorLoginResponse>('/api/v1/auth/vendor/login', { identifier, password })
      .then((r) => r.data),

  // Sets the vendor's own password in place of the SMS'd temporary one,
  // right after OTP signup. Requires an authenticated session (called
  // right after verify-otp). Skippable at this point — see skipSetPassword.
  setPassword: (password: string) =>
    api.post('/api/v1/auth/vendor/set-password', { password }).then((r) => r.data),

  // Explicitly dismisses the "set a password" prompt right after signup.
  skipSetPassword: () => api.post('/api/v1/auth/vendor/skip-set-password').then((r) => r.data),

  // One-time onboarding step right after signup, shown after either
  // set-password or skip-set-password. fullName is required; storeName is
  // optional (omit to keep the auto-generated default from signup).
  completeProfile: (fullName: string, storeName?: string) =>
    api
      .post<{ user: AuthUser }>('/api/v1/auth/vendor/complete-profile', { fullName, storeName })
      .then((r) => r.data),

  // Settings page: update full name and/or email (either can be omitted
  // to leave it unchanged). Email is not verified — no confirmation link.
  updateSettingsProfile: (fields: { fullName?: string; email?: string }) =>
    api
      .post<{ user: AuthUser }>('/api/v1/auth/vendor/settings/profile', fields)
      .then((r) => r.data),

  // Settings page: upload/replace the profile picture. The server resizes
  // it down to a max of 720px and recompresses it — no need to do that
  // client-side first, just send the file as picked.
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api
      .post<{ user: AuthUser }>('/api/v1/auth/vendor/settings/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // Settings page: change password. Requires the current password.
  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .post<{ message: string }>('/api/v1/auth/vendor/settings/change-password', {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),

  // Mandatory completion step after a temporary-password login. Uses the
  // setupToken from vendorLogin instead of a bearer token, and returns a
  // real session (tokens) on success.
  completeSetup: (setupToken: string, password: string) =>
    api
      .post<AuthTokensResponse>('/api/v1/auth/vendor/complete-setup', { setupToken, password })
      .then((r) => r.data),

  forgotPasswordSendOtp: (phone: string) =>
    api
      .post<SendOtpLikeResponse>('/api/v1/auth/vendor/forgot-password/send-otp', { phone })
      .then((r) => r.data),

  forgotPasswordVerifyOtp: (phone: string, code: string) =>
    api
      .post<ForgotPasswordVerifyOtpResponse>('/api/v1/auth/vendor/forgot-password/verify-otp', {
        phone,
        code,
      })
      .then((r) => r.data),

  resetPassword: (resetToken: string, password: string) =>
    api
      .post('/api/v1/auth/vendor/forgot-password/reset', { resetToken, password })
      .then((r) => r.data),

  adminLogin: (email: string, password: string) =>
    api.post<AuthTokensResponse>('/api/v1/auth/admin/login', { email, password }).then((r) => r.data),

  // Silently restores a session on app boot using the httpOnly refresh
  // cookie. Rejects (no cookie / expired) if there's nothing to restore —
  // callers should treat that as "not logged in", not an error to surface.
  refresh: () => api.post<RefreshResponse>('/api/v1/auth/refresh').then((r) => r.data),

  logout: () => api.post('/api/v1/auth/logout'),
};
