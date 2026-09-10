import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { User, Store } from 'lucide-react';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  storeName: z.string().min(2, 'Enter your store name'),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  phone: string;
}

export default function VendorCompleteSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state?.phone) navigate('/vendor/login', { replace: true });
  }, [state, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!state?.phone) return null;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await authApi.vendorSignup(state.phone, values.fullName, values.storeName);
      setAuth(res.accessToken, res.user);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set up your store" subtitle="Just a couple more details to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Full name</label>
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
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Store name</label>
          <div className="relative">
            <Store
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="text"
              placeholder="e.g. My Shop"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('storeName')}
            />
          </div>
          {errors.storeName && (
            <p className="text-red-500 text-sm mt-1.5">{errors.storeName.message}</p>
          )}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Creating your store…' : 'Create store & continue'}
        </button>
      </form>
    </AuthShell>
  );
}
