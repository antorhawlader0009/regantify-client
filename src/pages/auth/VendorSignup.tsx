import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { Phone } from 'lucide-react';

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

const otpSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(bdPhoneRegex, 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX'),
});

type OtpFormValues = z.infer<typeof otpSchema>;

/**
 * Vendor Sign up — phone number, then OTP verification, then set a new
 * password (skippable — see VendorSetPassword). Reached via the "Sign up"
 * button in the top-right corner of the auth header (see AuthShell).
 *
 * If the phone number actually belongs to an existing vendor, verify-otp
 * on the next step still handles it gracefully (routes to complete-setup
 * instead of treating it as a fresh signup) — same backend behavior as
 * before, just reached from a dedicated Sign up entry point now.
 */
export default function VendorSignup() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const handleSendOtp = async (values: OtpFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await authApi.sendOtp(values.phone.trim());
      navigate('/vendor/verify-otp', {
        state: { phone: values.phone },
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
