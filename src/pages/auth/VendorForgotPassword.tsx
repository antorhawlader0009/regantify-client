import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { Phone } from 'lucide-react';

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

const schema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(bdPhoneRegex, 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX'),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  phone?: string;
}

/**
 * Step 1 of forgot-password: enter the phone number to receive a reset
 * code. Prefills from location state when reached via the "Reset
 * password" link on the "account already exists" step of Sign up (see
 * VendorSignup) — the vendor already typed their number once there.
 */
export default function VendorForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillPhone = (location.state as LocationState | undefined)?.phone;
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { phone: prefillPhone ?? '' } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPasswordSendOtp(values.phone);
      navigate('/vendor/forgot-password/verify', {
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
      title="Reset your password"
      subtitle="Enter your phone number and we'll text you a reset code"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              {...register('phone')}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1.5">{errors.phone.message}</p>}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Sending code…' : 'Send reset code'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/vendor/login')}
          className="w-full text-sm text-regantify-text-muted hover:text-regantify-text"
        >
          ← Back to login
        </button>
      </form>
    </AuthShell>
  );
}
