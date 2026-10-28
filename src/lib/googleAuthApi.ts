import { api } from './api';
import type { AuthUser } from '../store/authStore';

/**
 * "Continue with Google" (server auth/google-oauth.ts). The browser is sent to Google, Google sends it back to
 * /auth/google/callback (GoogleCallback.tsx), and that page hands the code to the server. A Google account with no
 * Regantify account must add a phone (OTP) before anything is opened or made.
 */

/** Two-step sign-in is on for the account: the code step comes next (/vendor/two-step). */
export type SecondStepNeeded = { twoFactorRequired: true; challengeToken: string };

export type GoogleSignInResult =
  | { needsPhone: false; user: AuthUser; accessToken: string }
  | ({ needsPhone: false } & SecondStepNeeded)
  | { needsPhone: true; googleToken: string; email: string | null; name: string | null };

export type GoogleSession = { isNewUser: boolean; user: AuthUser; accessToken: string } | ({ isNewUser: false } & SecondStepNeeded);

/** Which flow the browser went to Google for; read back by the callback page. */
export const GOOGLE_INTENT_KEY = 'regantify-google-intent';
/** A Google sign-in waiting for its phone (token, email, name), so a refresh of the page doesn't lose it. */
export const GOOGLE_PENDING_KEY = 'regantify-google-pending';

export const googleAuthApi = {
  config: () => api.get<{ enabled: boolean }>('/v1/auth/google/config').then((r) => r.data),
  start: () => api.post<{ url: string }>('/v1/auth/google/start').then((r) => r.data),
  callback: (code: string, state: string) => api.post<GoogleSignInResult>('/v1/auth/google/callback', { code, state }).then((r) => r.data),
  sendPhoneOtp: (googleToken: string, phone: string) =>
    api
      .post<{ accountExists: boolean; phone: string; expiresInSeconds: number }>('/v1/auth/google/phone/send-otp', { googleToken, phone })
      .then((r) => r.data),
  verifyPhone: (googleToken: string, phone: string, code: string) =>
    api.post<GoogleSession>('/v1/auth/google/phone/verify', { googleToken, phone, code }).then((r) => r.data),
  linkStart: () => api.post<{ url: string }>('/v1/auth/google/link/start').then((r) => r.data),
  link: (code: string, state: string) => api.post<{ user: AuthUser }>('/v1/auth/google/link', { code, state }).then((r) => r.data),
  unlink: () => api.post<{ user: AuthUser }>('/v1/auth/google/unlink').then((r) => r.data),
};
