import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /**
   * Which top-right nav button (if any) should render as active. Omit on
   * steps that are part of a flow but not a "starting point" (OTP verify,
   * set-password, complete-setup, forgot-password steps, admin login) so
   * the Login/Signup buttons don't show there at all.
   */
  activeAuthTab?: 'login' | 'signup';
}

/**
 * Wraps every auth screen (send-otp, verify-otp, signup, admin login) in the
 * same black-framed, dark-topbar look used across the rest of Regantify, so
 * the very first thing a vendor sees already feels like "home".
 */
export function AuthShell({ children, title, subtitle, activeAuthTab }: AuthShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-regantify-content flex flex-col">
      {/* Topbar — mirrors the dashboard topbar exactly */}
      <header className="bg-regantify-topbar h-[82px] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <Store className="text-white" size={32} strokeWidth={2} />
          <span className="font-brand text-white text-3xl leading-none pt-1">Regantify</span>
        </div>

        {/* Login / Sign up — top right corner, only on the vendor entry pages */}
        {activeAuthTab && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/vendor/login')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeAuthTab === 'login'
                  ? 'bg-white text-regantify-text'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/vendor/signup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeAuthTab === 'signup'
                  ? 'bg-white text-regantify-text'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Sign up
            </button>
          </div>
        )}
      </header>

      {/* Centered auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 sm:p-10">
            <h1 className="text-2xl font-semibold text-regantify-text mb-1">{title}</h1>
            {subtitle && <p className="text-regantify-text-muted text-sm mb-6">{subtitle}</p>}
            {!subtitle && <div className="mb-6" />}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
