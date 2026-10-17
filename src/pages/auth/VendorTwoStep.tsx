import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { twoStepApi } from '../../lib/twoStepApi';
import { apiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../lib/toast';

/**
 * /vendor/two-step: the second step of a sign-in for an account with two-step sign-in on (Settings > Security). The first
 * step (password, Google, ...) sent a 5-minute challenge in the page state; the authenticator app's 6-digit code, or a
 * one-use recovery code, turns it into a session.
 */
export default function VendorTwoStep() {
  const navigate = useNavigate();
  const challengeToken = (useLocation().state as { challengeToken?: string } | null)?.challengeToken;
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!challengeToken) navigate('/vendor/login', { replace: true });
  }, [challengeToken, navigate]);
  if (!challengeToken) return null;

  const submit = async () => {
    const value = code.trim();
    if (!useRecovery && !/^\d{6}$/.test(value.replace(/\s/g, ''))) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (useRecovery && value.replace(/[\s-]/g, '').length !== 10) {
      setError('A recovery code has 10 letters and numbers, like ABCDE-23456.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await twoStepApi.verify(challengeToken, useRecovery ? value : value.replace(/\s/g, ''));
      setAuth(res.accessToken, res.user);
      if (res.usedRecoveryCode) {
        toast.success(`Signed in with a recovery code. ${res.recoveryCodesLeft} left: make new ones in Settings > Security if you are running out.`);
      }
      navigate('/vendor/dashboard', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is not right.'));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Two-step sign-in"
      subtitle={useRecovery ? 'Type one of the recovery codes you saved when you turned two-step sign-in on.' : 'Open your authenticator app and type the 6-digit code for Regantify.'}
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="relative">
          <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            placeholder={useRecovery ? 'ABCDE-23456' : '123456'}
            maxLength={useRecovery ? 14 : 7}
            aria-label={useRecovery ? 'Recovery code' : 'Authenticator code'}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text text-lg tracking-[0.3em]
              placeholder:text-regantify-text-muted/60 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-regantify-black"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Sign in'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setCode('');
              setError(null);
            }}
            className="text-regantify-text-muted underline underline-offset-4 hover:text-regantify-text"
          >
            {useRecovery ? 'Use the app code instead' : 'Use a recovery code'}
          </button>
          <button type="button" onClick={() => navigate('/vendor/login', { replace: true })} className="text-regantify-text-muted hover:text-regantify-text">
            Start again
          </button>
        </div>
        <p className="text-xs text-regantify-text-muted">
          Lost your phone and your recovery codes? Contact Regantify support: they can turn two-step sign-in off for your account.
        </p>
      </form>
    </AuthShell>
  );
}
