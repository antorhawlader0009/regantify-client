import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';

/**
 * Landing page for Super Admin > All Vendors > "Login as Vendor", opened
 * in a brand-new tab. AuthBootstrap deliberately skips its normal
 * cookie-based refresh for this exact path (see its own comment) so this
 * tab never picks up whichever admin/vendor session cookie already
 * exists in the browser — instead, this exchanges the one-time token in
 * the URL for a fresh 15-min vendor session directly.
 */
export default function VendorImpersonateEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing login link.');
      return;
    }

    let cancelled = false;
    authApi
      .impersonateExchange(token)
      .then((data) => {
        if (cancelled) return;
        setAuth(data.accessToken, data.user);
        navigate('/vendor/dashboard', { replace: true });
      })
      .catch(() => {
        if (!cancelled) setError('This login link is invalid or has expired.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-sm text-regantify-text-muted">
        {error ?? 'Signing in…'}
      </div>
    </div>
  );
}
