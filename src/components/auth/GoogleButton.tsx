import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GOOGLE_INTENT_KEY, googleAuthApi } from '../../lib/googleAuthApi';
import { apiErrorMessage } from '../../lib/api';

/** Google's own "G" in its brand colours, unchanged (Sign in with Google branding guidelines). */
export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * "Continue with Google" on the vendor sign-in and sign-up pages. Styled by Google's branding guidelines (light theme:
 * white fill, #747775 border, #1F1F1F text, the colour "G"). Hidden while the server has no Google keys.
 */
export function GoogleButton({ lang = 'en', className = '', orAbove = false }: { lang?: 'en' | 'bn'; className?: string; orAbove?: boolean }) {
  const { data } = useQuery({ queryKey: ['google-auth-config'], queryFn: googleAuthApi.config, staleTime: 5 * 60_000, retry: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!data?.enabled) return null;

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await googleAuthApi.start();
      try {
        sessionStorage.setItem(GOOGLE_INTENT_KEY, 'login');
      } catch {
        /* private mode: the callback page treats a missing intent as a sign-in */
      }
      window.location.assign(url);
    } catch (err) {
      setBusy(false);
      setError(apiErrorMessage(err, lang === 'bn' ? 'Google দিয়ে শুরু করা গেল না। আবার চেষ্টা করুন।' : 'Could not start Google sign-in. Please try again.'));
    }
  };

  return (
    <div className={className}>
      {orAbove && <OrDivider lang={lang} className="mb-4" />}
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-[15px] font-medium text-[#1F1F1F] transition-colors hover:bg-[#F8F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/40 disabled:opacity-60"
      >
        <GoogleG />
        {busy ? (lang === 'bn' ? 'Google খুলছে…' : 'Opening Google…') : lang === 'bn' ? 'Google দিয়ে চালিয়ে যান' : 'Continue with Google'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** "or" between the Google button and the phone/password form. */
export function OrDivider({ lang = 'en', className = '' }: { lang?: 'en' | 'bn'; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-xs uppercase tracking-wider opacity-60 ${className}`}>
      <span className="h-px flex-1 bg-current opacity-30" />
      {lang === 'bn' ? 'অথবা' : 'or'}
      <span className="h-px flex-1 bg-current opacity-30" />
    </div>
  );
}
