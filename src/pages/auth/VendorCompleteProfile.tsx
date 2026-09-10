import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { User, Store } from 'lucide-react';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  storeName: z.string().min(2, 'Store name is too short').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

/**
 * One-time onboarding step shown right after signup, following either
 * VendorSetPassword's "set password" or "skip for now". Full name is
 * mandatory — there's no "Skip" button for it. Store name is optional:
 * leaving it blank keeps the auto-generated default ("Store XXXX") from
 * signup. This screen is only ever shown once and isn't re-enforced later
 * (ProtectedRoute doesn't check for a missing fullName on later visits).
 */
export default function VendorCompleteProfile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const storeName = values.storeName?.trim() ? values.storeName.trim() : undefined;
      const res = await authApi.completeProfile(values.fullName.trim(), storeName);

      // Merge the updated profile into the in-memory session — accessToken
      // doesn't change here, only the user object (fullName/storeName).
      if (accessToken) {
        setAuth(accessToken, res.user);
      }
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Could not save your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Complete your profile"
      subtitle="Just your name to finish up — the store name is optional."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Full name
          </label>
          <div className="relative">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="text"
              placeholder="Your name"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('fullName')}
            />
          </div>
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1.5">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">
            Store name <span className="text-regantify-text-muted font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Store
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="text"
              placeholder={user?.vendor?.storeName ?? 'e.g. My Shop'}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('storeName')}
            />
          </div>
          {errors.storeName && (
            <p className="text-red-500 text-sm mt-1.5">{errors.storeName.message}</p>
          )}
          <p className="text-xs text-regantify-text-muted mt-1.5">
            Leave this blank to keep "{user?.vendor?.storeName ?? 'your current store name'}" — you
            can always change it later from Settings.
          </p>
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </AuthShell>
  );
}
