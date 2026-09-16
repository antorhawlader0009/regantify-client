import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { OtpInput } from '../../components/OtpInput';
import { authApi } from '../../lib/authApi';

// Matches the server's per-phone resend cooldown (see
// AuthService.enforceOtpCooldown) — kept in sync so the button re-enables
// right when a resend would actually succeed, not earlier.
const RESEND_COOLDOWN_SECONDS = 60;

interface LocationState {
  phone: string;
}

/** Step 2 of forgot-password: verify the OTP, then move on to set a new password. */
export default function VendorForgotPasswordVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!state?.phone) navigate('/vendor/forgot-password', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!state?.phone) return null;

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.forgotPasswordVerifyOtp(state.phone, code);
      navigate('/vendor/forgot-password/reset', {
        state: { resetToken: res.resetToken },
        replace: true,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await authApi.forgotPasswordSendOtp(state.phone);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
    } catch (err: any) {
      // 429 = still within the server's own cooldown — resync the local
      // timer to the server's actual remaining time instead of leaving
      // the button enabled.
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      if (typeof retryAfter === 'number') {
        setCooldown(retryAfter);
      }
      setError(err?.response?.data?.message ?? 'Could not resend code. Try again shortly.');
    }
  };

  return (
    <AuthShell
      title="Enter reset code"
      subtitle={`We sent a 6-digit code to ${state.phone}`}
    >
      <div className="space-y-5">
        <OtpInput value={code} onChange={setCode} error={error ?? undefined} />

        <button
          onClick={handleVerify}
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Verifying…' : 'Verify code'}
        </button>

        <div className="text-center text-sm">
          {cooldown > 0 ? (
            <span className="text-regantify-text-muted">Resend code in {cooldown}s</span>
          ) : (
            <button onClick={handleResend} className="text-regantify-text font-medium underline">
              Resend code
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/vendor/forgot-password')}
          className="w-full text-sm text-regantify-text-muted hover:text-regantify-text"
        >
          ← Use a different number
        </button>
      </div>
    </AuthShell>
  );
}
