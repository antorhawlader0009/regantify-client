import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import { Section } from '../ui/FormKit';
import { GoogleG } from '../auth/GoogleButton';
import { GOOGLE_INTENT_KEY, googleAuthApi } from '../../lib/googleAuthApi';
import { twoStepApi } from '../../lib/twoStepApi';
import { apiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../lib/toast';

const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-60';
const primary = 'inline-flex items-center gap-1.5 rounded-lg bg-regantify-black px-4 py-2 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60';
const danger = 'rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60';
const codeInput =
  'w-40 rounded-lg border border-line bg-white px-3 py-2 text-center text-base tracking-[0.25em] text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });

/**
 * Settings > Security > "Sign in with Google": an account made with a phone can connect a Google account, and then sign in
 * with "Continue with Google" too. The phone, password and SMS code keep working. Hidden while the server has no Google keys.
 */
export function GoogleSignInSection() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { data: config } = useQuery({ queryKey: ['google-auth-config'], queryFn: googleAuthApi.config, staleTime: 5 * 60_000, retry: false });
  const [busy, setBusy] = useState(false);

  if (!config?.enabled) return null;

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await googleAuthApi.linkStart();
      try {
        sessionStorage.setItem(GOOGLE_INTENT_KEY, 'link');
      } catch {
        /* private mode */
      }
      window.location.assign(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start Google sign-in.'));
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Google? You will sign in with your phone and password (or an SMS code) instead.')) return;
    setBusy(true);
    try {
      const r = await googleAuthApi.unlink();
      const token = useAuthStore.getState().accessToken;
      if (token) setAuth(token, r.user);
      toast.success('Google disconnected.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not disconnect Google.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Sign in with Google" description="Use your Google account to sign in, next to your phone and password.">
      {user?.googleEmail ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5 text-sm">
            <GoogleG size={20} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-regantify-text">{user.googleEmail}</span>
              <span className="block text-xs text-neutral-500">Connected{user.googleLinkedAt ? ` on ${fmtDate(user.googleLinkedAt)}` : ''}</span>
            </span>
          </span>
          <button type="button" onClick={disconnect} disabled={busy} className={danger}>
            Disconnect
          </button>
        </div>
      ) : (
        <button type="button" onClick={connect} disabled={busy} className={btn}>
          <GoogleG />
          {busy ? 'Opening Google…' : 'Connect Google'}
        </button>
      )}
    </Section>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Regantify recovery codes (each works once)\n\n${codes.join('\n')}\n`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-regantify-text">
        Save these recovery codes somewhere safe (not on this phone). Each one signs you in once if you lose your phone. They are shown only now.
      </p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-neutral-50 p-3 font-mono text-sm text-regantify-text sm:grid-cols-5">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => setCopied(true));
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
            a.download = 'regantify-recovery-codes.txt';
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Download size={14} /> Download
        </button>
        <button type="button" className={primary} onClick={onDone}>
          I have saved them
        </button>
      </div>
    </div>
  );
}

/**
 * Settings > Security > "Two-step sign-in" (optional): an authenticator app (Google Authenticator, Microsoft Authenticator...)
 * gives a 6-digit code that every sign-in then asks for, after the password, Google or the SMS code. Turning it off or making
 * new recovery codes needs a current code, so an open session someone else is using can't remove it.
 */
export function TwoStepSection() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery({ queryKey: ['vendor-two-step'], queryFn: twoStepApi.status });
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [mode, setMode] = useState<'idle' | 'newCodes' | 'off'>('idle');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['vendor-two-step'] });
  const reset = () => {
    setCode('');
    setError(null);
    setMode('idle');
  };

  const start = useMutation({
    mutationFn: twoStepApi.start,
    onSuccess: async (r) => {
      const qr = await QRCode.toDataURL(r.otpauthUrl, { margin: 1, width: 220, errorCorrectionLevel: 'M' });
      setSetup({ secret: r.secret, qr });
      setCode('');
      setError(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the setup.')),
  });
  const confirm = useMutation({
    mutationFn: () => twoStepApi.confirm(code.replace(/\s/g, '')),
    onSuccess: (r) => {
      setSetup(null);
      setCodes(r.recoveryCodes);
      setCode('');
      refresh();
      toast.success('Two-step sign-in is on.');
    },
    onError: (err) => setError(apiErrorMessage(err, 'That code is not right.')),
  });
  const newCodes = useMutation({
    mutationFn: () => twoStepApi.newRecoveryCodes(code.replace(/\s/g, '')),
    onSuccess: (r) => {
      setCodes(r.recoveryCodes);
      reset();
      refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, 'That code is not right.')),
  });
  const turnOff = useMutation({
    mutationFn: () => twoStepApi.turnOff(code.trim()),
    onSuccess: () => {
      reset();
      refresh();
      toast.success('Two-step sign-in is off.');
    },
    onError: (err) => setError(apiErrorMessage(err, 'That code is not right.')),
  });

  useEffect(() => setError(null), [mode]);

  return (
    <Section
      title="Two-step sign-in"
      description="Optional extra safety: after your password, Google or SMS code, sign-in also asks for a code from an authenticator app on your phone."
      action={
        status?.totpEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck size={13} /> On
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="h-12 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : codes ? (
        <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />
      ) : status?.totpEnabled ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            On since {status.totpEnabledAt ? fmtDate(status.totpEnabledAt) : 'earlier'} · {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? '' : 's'} left
          </p>
          {mode === 'idle' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => setMode('newCodes')}>
                New recovery codes
              </button>
              <button type="button" className={danger} onClick={() => setMode('off')}>
                Turn off
              </button>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === 'newCodes') newCodes.mutate();
                else turnOff.mutate();
              }}
            >
              <p className="text-sm text-regantify-text">
                {mode === 'newCodes' ? 'Type the current code from your app. Your old recovery codes stop working.' : 'Type the current code from your app (or a recovery code) to turn it off.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode={mode === 'newCodes' ? 'numeric' : 'text'}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={14}
                  className={codeInput}
                  aria-label="Code"
                />
                <button type="submit" disabled={newCodes.isPending || turnOff.isPending} className={mode === 'off' ? danger : primary}>
                  {mode === 'newCodes' ? 'Make new codes' : 'Turn off'}
                </button>
                <button type="button" onClick={reset} className="text-sm text-neutral-500 hover:text-regantify-text">
                  Cancel
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
        </div>
      ) : setup ? (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirm.mutate();
          }}
        >
          <ol className="list-decimal space-y-1 pl-5 text-sm text-regantify-text">
            <li>Install Google Authenticator (or any authenticator app) on your phone.</li>
            <li>In the app, tap + and scan this QR code.</li>
            <li>Type the 6-digit code the app shows for Regantify.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-5">
            <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-lg border border-line" />
            <div className="min-w-0 text-sm">
              <p className="text-neutral-500">Can’t scan? Type this key in the app:</p>
              <p className="mt-1 break-all font-mono text-regantify-text">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={7}
              className={codeInput}
              aria-label="Code from the app"
            />
            <button type="submit" disabled={confirm.isPending} className={primary}>
              {confirm.isPending ? 'Checking…' : 'Turn on'}
            </button>
            <button type="button" onClick={() => setSetup(null)} className="text-sm text-neutral-500 hover:text-regantify-text">
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => start.mutate()} disabled={start.isPending} className={btn}>
          <ShieldCheck size={15} /> {start.isPending ? 'Preparing…' : 'Set up two-step sign-in'}
        </button>
      )}
    </Section>
  );
}
