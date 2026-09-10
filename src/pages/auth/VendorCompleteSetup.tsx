import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Lock } from 'lucide-react';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface LocationState {
  setupToken: string;
  // Which flow sent the vendor here, so the copy below matches. Defaults
  // to 'temp-password' when omitted (the original caller, vendorLogin).
  reason?: 'temp-password' | 'otp-relogin';
}

/**
 * Reached two ways, both MANDATORY (no "Skip for now" here) and both
 * without a real session yet — only the short-lived setupToken passed in
 * via navigation state, so this page is intentionally reachable without
 * ProtectedRoute:
 *  - 'temp-password' (default): vendor logged in with their temporary
 *    (SMS'd) password via vendorLogin.
 *  - 'otp-relogin': an existing vendor logged in via OTP again instead of
 *    their password. Their old password still works elsewhere (via
 *    vendor/login) until they finish this step.
 */
export default function VendorCompleteSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state?.setupToken) navigate('/vendor/login', { replace: true });
  }, [state, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!state?.setupToken) return null;

  const reason = state.reason ?? 'temp-password';
  const subtitle =
    reason === 'otp-relogin'
      ? "You logged in with a code instead of your password. Set a new password to continue — this step can't be skipped."
      : "You're still using the temporary password we texted you. Set your own password to continue — this step can't be skipped.";

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await authApi.completeSetup(state.setupToken, values.password);
      setAuth(res.accessToken, res.user);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ??
          'Could not set your password. Please log in again and retry.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set your password" subtitle={subtitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('password')}
            />
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Set password & continue'}
        </button>

        {reason === 'temp-password' && (
          <p className="text-xs text-regantify-text-muted text-center">
            A new copy of your temporary password was texted to you again in case you need it
            while you finish this step.
          </p>
        )}
      </form>
    </AuthShell>
  );
}
