import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Phone, Lock } from 'lucide-react';

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

const otpSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(bdPhoneRegex, 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX'),
});

const loginSchema = z.object({
  password: z.string().min(1, 'Enter your password'),
});

type OtpFormValues = z.infer<typeof otpSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Vendor Sign up — phone number, then OTP verification, then set a new
 * password (skippable — see VendorSetPassword). Reached via the "Sign up"
 * button in the top-right corner of the auth header (see AuthShell).
 *
 * If the phone number already belongs to a vendor, sendOtp doesn't send
 * an OTP at all (see AuthService.sendOtp) — instead this shows an
 * inline "this account already exists" state right here: a password
 * field to log in directly, or a link into the forgot-password flow.
 * Avoids the old behavior of silently sending a signup OTP that
 * verify-otp would've just redirected into a forced password reset
 * anyway, with no explanation of why.
 */
export default function VendorSignup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set once sendOtp reports accountExists: true — switches the form
  // below from "send OTP" to "log in with password", still keyed to
  // the same phone number the vendor just typed.
  const [existingPhone, setExistingPhone] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const handleSendOtp = async (values: OtpFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await authApi.sendOtp(values.phone.trim());
      if (res.accountExists) {
        setExistingPhone(values.phone.trim());
        return;
      }
      navigate('/vendor/verify-otp', {
        state: { phone: values.phone },
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (values: LoginFormValues) => {
    if (!existingPhone) return;
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await authApi.vendorLogin(existingPhone, values.password.trim());
      if (res.mustSetPassword) {
        navigate('/vendor/complete-setup', { replace: true, state: { setupToken: res.setupToken } });
        return;
      }
      if (res.accessToken && res.user) {
        setAuth(res.accessToken, res.user);
        navigate('/vendor/dashboard', { replace: true });
      }
    } catch (err: any) {
      setLoginError(err?.response?.data?.message ?? 'Invalid password.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  if (existingPhone) {
    return (
      <AuthShell
        title="Account already exists"
        subtitle={`${existingPhone} is already registered. Log in below, or reset your password.`}
        activeAuthTab="signup"
      >
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
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
                autoFocus
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...loginForm.register('password')}
              />
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1.5">
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}

          <button
            type="submit"
            disabled={loginSubmitting}
            className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
              hover:bg-black transition-colors disabled:opacity-60"
          >
            {loginSubmitting ? 'Signing in…' : 'Log in'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/vendor/forgot-password', { state: { phone: existingPhone } })}
            className="w-full text-sm text-regantify-text-muted hover:text-regantify-text underline"
          >
            Reset password
          </button>

          <button
            type="button"
            onClick={() => {
              setExistingPhone(null);
              setLoginError(null);
              loginForm.reset();
            }}
            className="w-full text-sm text-regantify-text-muted hover:text-regantify-text"
          >
            ← Use a different number
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign up"
      subtitle="Enter your phone number to create your vendor account"
      activeAuthTab="signup"
    >
      <form onSubmit={otpForm.handleSubmit(handleSendOtp)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Phone number
          </label>
          <div className="relative">
            <Phone
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="tel"
              placeholder="017XXXXXXXX"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...otpForm.register('phone')}
            />
          </div>
          {otpForm.formState.errors.phone && (
            <p className="text-red-500 text-sm mt-1.5">
              {otpForm.formState.errors.phone.message}
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
          {submitting ? 'Sending code…' : 'Send OTP'}
        </button>

        <p className="text-xs text-regantify-text-muted text-center">
          We'll text a 6-digit code and set up your account automatically.
        </p>

        <p className="text-xs text-regantify-text-muted text-center">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/vendor/login')}
            className="text-regantify-text font-medium underline"
          >
            Log in
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
