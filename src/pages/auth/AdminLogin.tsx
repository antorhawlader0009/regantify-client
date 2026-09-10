import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
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
      const res = await authApi.adminLogin(values.email, values.password);
      setAuth(res.accessToken, res.user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Super Admin login" subtitle="Restricted access — Regantify staff only">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Email</label>
          <div className="relative">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
              size={18}
            />
            <input
              type="email"
              placeholder="admin@regantify.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Password</label>
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

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl
            hover:bg-black transition-colors disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
