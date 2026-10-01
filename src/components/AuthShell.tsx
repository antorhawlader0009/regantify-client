import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

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
 * same white-topbar look used across the rest of Regantify, so
 * the very first thing a vendor sees already feels like "home".
 */
export function AuthShell({ children, title, subtitle, activeAuthTab }: AuthShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Topbar — mirrors the dashboard topbar exactly */}
      <header className="bg-white border-b border-line h-[60px] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 font-bold text-brand-lime">R</div>
          <span className="text-xl font-semibold leading-none text-regantify-text">Regantify</span>
        </div>

        {/* Login / Sign up — top right corner, only on the vendor entry pages */}
        {activeAuthTab && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/vendor/login')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeAuthTab === 'login'
                  ? 'bg-brand text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-regantify-text'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/vendor/signup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeAuthTab === 'signup'
                  ? 'bg-brand text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-regantify-text'
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
          <div className="bg-white rounded-xl border border-line p-8 sm:p-10">
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
