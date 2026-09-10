import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Lock, User } from 'lucide-react';

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Phone number or email is required')
    .refine(
      (v) => bdPhoneRegex.test(v.trim()) || emailRegex.test(v.trim()),
      'Enter a valid phone number or email address',
    ),
  password: z.string().min(1, 'Password is required'),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * Vendor Login — phone number or email + password. Reached via the "Login"
 * button in the top-right corner of the auth header (see AuthShell). New
 * vendors use the "Sign up" button instead, which starts the phone + OTP
 * flow in VendorSignup.
 */
export default function VendorPhoneEntry() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const handlePasswordLogin = async (values: PasswordFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      // Guard against accidental whitespace/newlines picked up when a
      // vendor pastes the temporary password straight from the SMS app.
      const res = await authApi.vendorLogin(values.identifier.trim(), values.password.trim());

      if (res.mustSetPassword) {
        // Still on the temporary password — no real session was issued.
        // Setting a real password is mandatory here (unlike right after
        // signup), so send them to the non-skippable setup screen.
        navigate('/vendor/complete-setup', { replace: true, state: { setupToken: res.setupToken } });
        return;
      }

      setAuth(res.accessToken, res.user);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Invalid phone/email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Log in with your phone number or email, and password"
      activeAuthTab="login"
    >
      <form onSubmit={passwordForm.handleSubmit(handlePasswordLogin)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Phone number or email
          </label>
          <div className="relative">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="text"
              placeholder="017XXXXXXXX or you@example.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...passwordForm.register('identifier')}
            />
          </div>
          {passwordForm.formState.errors.identifier && (
            <p className="text-red-500 text-sm mt-1.5">
              {passwordForm.formState.errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Password
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
              {...passwordForm.register('password')}
            />
          </div>
          {passwordForm.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1.5">
              {passwordForm.formState.errors.password.message}
            </p>
          )}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/vendor/forgot-password')}
          className="w-full text-sm text-regantify-text-muted hover:text-regantify-text"
        >
          Forgot password?
        </button>

        <p className="text-xs text-regantify-text-muted text-center">
          New here?{' '}
          <button
            type="button"
            onClick={() => navigate('/vendor/signup')}
            className="text-regantify-text font-medium underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
