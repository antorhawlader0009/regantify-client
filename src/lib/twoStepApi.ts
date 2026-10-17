import { api } from './api';
import type { AuthUser } from '../store/authStore';

/**
 * Two-step sign-in for store dashboards (optional, Settings > Security). Once on, every sign-in (password, Google, OTP +
 * new password) asks for the authenticator app's 6-digit code, or a one-use recovery code (server AuthService "second step").
 */
export interface TwoStepStatus {
  totpEnabled: boolean;
  totpEnabledAt: string | null;
  recoveryCodesLeft: number;
}

export const twoStepApi = {
  /** The second step of a sign-in: the challenge from the first step and the code. */
  verify: (challengeToken: string, code: string) =>
    api
      .post<{ user: AuthUser; accessToken: string; usedRecoveryCode: boolean; recoveryCodesLeft: number }>('/v1/auth/vendor/2fa/verify', { challengeToken, code })
      .then((r) => r.data),
  status: () => api.get<TwoStepStatus>('/v1/auth/vendor/2fa').then((r) => r.data),
  start: () => api.post<{ secret: string; otpauthUrl: string }>('/v1/auth/vendor/2fa/setup/start').then((r) => r.data),
  confirm: (code: string) => api.post<{ recoveryCodes: string[] }>('/v1/auth/vendor/2fa/setup/confirm', { code }).then((r) => r.data),
  newRecoveryCodes: (code: string) => api.post<{ recoveryCodes: string[] }>('/v1/auth/vendor/2fa/recovery-codes', { code }).then((r) => r.data),
  turnOff: (code: string) => api.post<{ totpEnabled: false }>('/v1/auth/vendor/2fa/turn-off', { code }).then((r) => r.data),
};

/** Where a sign-in that needs the code goes: /vendor/two-step with the challenge in the page state. */
export const TWO_STEP_PATH = '/vendor/two-step';
