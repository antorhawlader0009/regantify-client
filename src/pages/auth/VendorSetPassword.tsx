import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
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

/**
 * Shown right after a brand-new vendor account is auto-created. No SMS
 * has been sent yet at this point — the vendor chooses here: set their
 * own password now (sends a welcome confirmation SMS), or skip and get a
 * system-generated temporary password texted to them instead. Either way
 * (set or skip), the vendor is then sent to the mandatory "complete your
 * profile" step (full name required) before reaching the dashboard.
 */
export default function VendorSetPassword() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await authApi.setPassword(values.password);
      navigate('/vendor/complete-profile', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Could not set your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setServerError(null);
    setSkipping(true);
    try {
      await authApi.skipSetPassword();
    } catch {
      // Non-fatal — a temporary password was still saved server-side even
      // if this particular SMS notification failed, so don't block
      // navigation on this call failing.
    } finally {
      setSkipping(false);
      navigate('/vendor/complete-profile', { replace: true });
    }
  };

  return (
    <AuthShell
      title="Set your password"
      subtitle="Set your own password now, or skip and we'll text you a temporary one instead."
    >
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
          disabled={submitting || skipping}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Set password & continue'}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting || skipping}
          className="w-full text-sm text-regantify-text-muted hover:text-regantify-text disabled:opacity-60"
        >
          {skipping ? 'Skipping…' : 'Skip for now'}
        </button>
      </form>
    </AuthShell>
  );
}
