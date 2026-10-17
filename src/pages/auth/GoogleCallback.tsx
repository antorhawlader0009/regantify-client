import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Phone } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { GOOGLE_INTENT_KEY, GOOGLE_PENDING_KEY, googleAuthApi } from '../../lib/googleAuthApi';
import { TWO_STEP_PATH } from '../../lib/twoStepApi';
import { apiErrorMessage } from '../../lib/api';
import { normalizeBdPhone, toLatinDigits } from '../../lib/bdPhone';
import { clearReferralCode, savedReferralCode } from '../../lib/referralCapture';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../lib/toast';

type Pending = { googleToken: string; email: string | null; name: string | null };

// The one-time code from Google can be used once; React's dev double-run must not send it twice.
const handledCodes = new Set<string>();

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

function savePending(p: Pending | null) {
  try {
    if (p) sessionStorage.setItem(GOOGLE_PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(GOOGLE_PENDING_KEY);
  } catch {
    /* private mode: the flow still works in this page's memory */
  }
}

/**
 * /auth/google/callback (GOOGLE_CALLBACK_URL): where Google sends the browser back. For a sign-in it hands the code to the
 * server; a Google account with no Regantify account then adds a phone and its OTP here, which either opens the account
 * that phone already has (and links Google to it) or makes a new store. For Settings > "Connect Google" it links the
 * signed-in account and goes back to Settings.
 */
export default function GoogleCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const signedIn = useAuthStore((s) => Boolean(s.accessToken));
  const [stage, setStage] = useState<'working' | 'phone' | 'otp' | 'error'>(() => (readPending() ? 'phone' : 'working'));
  const [pending, setPending] = useState<Pending | null>(readPending);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<{ phone: string; accountExists: boolean } | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const intent = (() => {
    try {
      return sessionStorage.getItem(GOOGLE_INTENT_KEY) === 'link' ? 'link' : 'login';
    } catch {
      return 'login';
    }
  })();

  const finishSession = (accessToken: string, user: Parameters<typeof setAuth>[1], isNewUser: boolean) => {
    savePending(null);
    setAuth(accessToken, user);
    navigate(isNewUser ? '/vendor/complete-profile' : '/vendor/dashboard', { replace: true });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const googleError = params.get('error');
    // Keep the one-time code out of the address bar and the history.
    if (code || googleError) window.history.replaceState(null, '', '/auth/google/callback');

    if (googleError) {
      setError(googleError === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in did not finish. Please try again.');
      setStage('error');
      return;
    }
    if (!code || !state) {
      // Back on this page after a refresh in the middle of the phone step: carry on with it; otherwise nothing to do.
      if (!readPending()) {
        setError('This Google sign-in has ended. Please start again.');
        setStage('error');
      }
      return;
    }
    if (handledCodes.has(code)) return;
    handledCodes.add(code);
    try {
      sessionStorage.removeItem(GOOGLE_INTENT_KEY);
    } catch {
      /* ignore */
    }

    if (intent === 'link') {
      googleAuthApi
        .link(code, state)
        .then((r) => {
          const token = useAuthStore.getState().accessToken;
          if (token) setAuth(token, r.user);
          toast.success(`Google account connected${r.user.googleEmail ? `: ${r.user.googleEmail}` : ''}.`);
          navigate('/vendor/settings?tab=security', { replace: true });
        })
        .catch((err) => {
          setError(apiErrorMessage(err, 'Could not connect the Google account.'));
          setStage('error');
        });
      return;
    }

    googleAuthApi
      .callback(code, state)
      .then((r) => {
        if (r.needsPhone) {
          const p = { googleToken: r.googleToken, email: r.email, name: r.name };
          savePending(p);
          setPending(p);
          setStage('phone');
          return;
        }
        if ('challengeToken' in r) {
          navigate(TWO_STEP_PATH, { replace: true, state: { challengeToken: r.challengeToken } });
          return;
        }
        finishSession(r.accessToken, r.user, false);
      })
      .catch((err) => {
        setError(apiErrorMessage(err, 'Google sign-in failed. Please try again.'));
        setStage('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      setError('Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.');
      return;
    }
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const r = await googleAuthApi.sendPhoneOtp(pending.googleToken, normalized);
      setSentTo({ phone: r.phone, accountExists: r.accountExists });
      setOtp('');
      setStage('otp');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!pending || !sentTo) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code we texted you.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await googleAuthApi.verifyPhone(pending.googleToken, sentTo.phone, otp.trim(), savedReferralCode());
      if ('challengeToken' in r) {
        savePending(null);
        navigate(TWO_STEP_PATH, { replace: true, state: { challengeToken: r.challengeToken } });
        return;
      }
      if (r.isNewUser) clearReferralCode();
      finishSession(r.accessToken, r.user, r.isNewUser);
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is not right.'));
      setBusy(false);
    }
  };

  const restart = () => {
    savePending(null);
    navigate(intent === 'link' && signedIn ? '/vendor/settings?tab=security' : '/vendor/login', { replace: true });
  };

  const input =
    'w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black';
  const primary = 'w-full bg-regantify-black text-white font-medium py-3 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60';

  if (stage === 'working') {
    return (
      <AuthShell title="Signing in with Google" subtitle="One moment…">
        <div className="flex justify-center py-6">
          <Loader2 size={24} className="animate-spin text-regantify-text-muted" />
        </div>
      </AuthShell>
    );
  }

  if (stage === 'error') {
    return (
      <AuthShell title="Google sign-in" subtitle={error ?? 'Something went wrong.'}>
        <button type="button" onClick={restart} className={primary}>
          {intent === 'link' && signedIn ? 'Back to Settings' : 'Back to sign in'}
        </button>
      </AuthShell>
    );
  }

  if (stage === 'phone') {
    return (
      <AuthShell
        title="Add your phone number"
        subtitle={`${pending?.email ? `${pending.email} isn’t connected to a store yet. ` : ''}Every Regantify account needs a phone number. We’ll text you a code to check it’s yours.`}
      >
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
            <input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(toLatinDigits(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="017XXXXXXXX"
              aria-label="Phone number"
              className={input}
            />
          </div>
          <p className="text-xs text-regantify-text-muted">
            Already have a store with this number? You’ll be signed in to it, and Google will be connected to it.
          </p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={busy} className={primary}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
          <button type="button" onClick={restart} className="w-full text-sm text-regantify-text-muted hover:text-regantify-text">
            Cancel
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter the code"
      subtitle={`We texted a 6-digit code to ${sentTo?.phone ?? 'your phone'}. ${sentTo?.accountExists ? 'You’ll be signed in to the store on this number.' : 'A new store will be made for you.'}`}
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <input
          autoFocus
          value={otp}
          onChange={(e) => setOtp(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          aria-label="Code"
          className="w-full px-4 py-3 rounded-xl bg-regantify-search text-center text-lg tracking-[0.4em] text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-black"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>
          {busy ? 'Checking…' : 'Verify and continue'}
        </button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStage('phone');
              setError(null);
            }}
            className="text-regantify-text-muted underline underline-offset-4 hover:text-regantify-text"
          >
            Change number
          </button>
          <button type="button" disabled={busy} onClick={() => void sendCode()} className="text-regantify-text-muted hover:text-regantify-text disabled:opacity-50">
            Send the code again
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
