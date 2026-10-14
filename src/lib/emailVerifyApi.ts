import { api } from './api';

// Mirrors server/src/email/email-verification.controller.ts: Profile > Email > Verify.

export const emailVerifyApi = {
  status: () => api.get<{ email: string | null; verifiedAt: string | null }>('/v1/account/email').then((r) => r.data),
  sendCode: () => api.post<{ sent: boolean; alreadyVerified: boolean; email: string }>('/v1/account/email/send-code').then((r) => r.data),
  verify: (code: string) => api.post<{ verified: true; verifiedAt: string }>('/v1/account/email/verify', { code }).then((r) => r.data),
};
