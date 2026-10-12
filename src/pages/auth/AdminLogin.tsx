import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { AuthShell } from '../../components/AuthShell';
import { authApi, type AdminSessionResponse } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, ShieldCheck, KeyRound, Copy } from 'lucide-react';
import { RecoveryCodes } from '../../components/admin/RecoveryCodes';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

type Stage =
  | { name: 'password' }
  | { name: 'totp'; challengeToken: string }
  | { name: 'setup'; setupToken: string }
  // The session is held here until the recovery codes have been saved; signing in earlier would navigate away from them.
  | { name: 'codes'; session: AdminSessionResponse; recoveryCodes: string[] };

const inputClass =
  'w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black';
const buttonClass =
  'w-full bg-regantify-black text-white font-medium py-3 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60';

const errorText = (err: any, fallback: string): string => err?.response?.data?.message ?? fallback;

export default function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [stage, setStage] = useState<Stage>({ name: 'password' });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finish = (session: AdminSessionResponse) => {
    setAuth(session.accessToken, session.user);
    navigate('/admin/dashboard', { replace: true });
  };

  const backToPassword = () => {
    setServerError(null);
    setStage({ name: 'password' });
  };

  if (stage.name === 'password') {
    return (
      <AuthShell title="Super Admin login" subtitle="Restricted access — Regantify staff only">
        <PasswordStep
          submitting={submitting}
          serverError={serverError}
          onSubmit={async (values) => {
            setServerError(null);
            setSubmitting(true);
            try {
              const res = await authApi.adminLogin(values.email, values.password);
              setStage(res.step === 'TOTP' ? { name: 'totp', challengeToken: res.challengeToken } : { name: 'setup', setupToken: res.setupToken });
            } catch (err: any) {
              setServerError(errorText(err, 'Invalid credentials.'));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </AuthShell>
    );
  }

  if (stage.name === 'totp') {
    return (
      <AuthShell title="Two-step check" subtitle="Enter the 6-digit code from your authenticator app.">
        <TotpStep
          challengeToken={stage.challengeToken}
          onBack={backToPassword}
          onDone={finish}
          onExpired={() => {
            setStage({ name: 'password' });
            setServerError('That sign-in expired. Please sign in again.');
          }}
        />
      </AuthShell>
    );
  }

  if (stage.name === 'setup') {
    return (
      <AuthShell title="Set up two-step sign-in" subtitle="Super Admin accounts must use an authenticator app. This takes a minute.">
        <SetupStep
          setupToken={stage.setupToken}
          onBack={backToPassword}
          onDone={(session, recoveryCodes) => setStage({ name: 'codes', session, recoveryCodes })}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Save your recovery codes" subtitle="Each code works once if you lose your phone. They are shown only now.">
      <RecoveryCodes codes={stage.recoveryCodes} confirmLabel="Continue to the dashboard" onConfirm={() => finish(stage.session)} />
    </AuthShell>
  );
}

function PasswordStep({
  submitting,
  serverError,
  onSubmit,
}: {
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: FormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
          <input type="email" placeholder="admin@regantify.com" className={inputClass} {...register('email')} />
        </div>
        {errors.email && <p className="text-red-500 text-sm mt-1.5">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
          <input type="password" placeholder="••••••••" className={inputClass} {...register('password')} />
        </div>
        {errors.password && <p className="text-red-500 text-sm mt-1.5">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}

function TotpStep({
  challengeToken,
  onBack,
  onDone,
  onExpired,
}: {
  challengeToken: string;
  onBack: () => void;
  onDone: (session: AdminSessionResponse) => void;
  onExpired: () => void;
}) {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      onDone(await authApi.adminLoginTotp(challengeToken, code.trim()));
    } catch (err: any) {
      const status = err?.response?.status;
      const message = errorText(err, 'That code is not right.');
      // A challenge that ran out (or was never valid) says so with the same 401; send the person back to the password.
      if (status === 401 && /expired/i.test(message)) onExpired();
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">
          {useRecovery ? 'Recovery code' : 'Code from your app'}
        </label>
        <div className="relative">
          {useRecovery ? (
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
          ) : (
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
          )}
          <input
            autoFocus
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 12 : 7}
            placeholder={useRecovery ? 'XXXXX-XXXXX' : '123 456'}
            value={code}
            onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d ]/g, ''))}
            className={`${inputClass} tracking-widest`}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={submitting || code.trim().length < 6} className={buttonClass}>
        {submitting ? 'Checking…' : 'Sign in'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-regantify-text-muted hover:text-regantify-text"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode('');
            setError(null);
          }}
        >
          {useRecovery ? 'Use the app code instead' : 'Lost your phone? Use a recovery code'}
        </button>
        <button type="button" className="text-regantify-text-muted hover:text-regantify-text" onClick={onBack}>
          Back
        </button>
      </div>
    </form>
  );
}

function SetupStep({
  setupToken,
  onBack,
  onDone,
}: {
  setupToken: string;
  onBack: () => void;
  onDone: (session: AdminSessionResponse, recoveryCodes: string[]) => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi
      .adminSetupStart(setupToken)
      .then(async (res) => {
        if (cancelled) return;
        setSecret(res.secret);
        setQr(await QRCode.toDataURL(res.otpauthUrl, { margin: 1, width: 220, errorCorrectionLevel: 'M' }));
      })
      .catch((err) => !cancelled && setError(errorText(err, 'Could not start the set-up. Please sign in again.')));
    return () => {
      cancelled = true;
    };
  }, [setupToken]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.adminSetupConfirm(setupToken, code.trim());
      onDone(res, res.recoveryCodes);
    } catch (err: any) {
      setError(errorText(err, 'That code is not right. Check the app and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <ol className="text-sm text-regantify-text space-y-1 list-decimal pl-5">
        <li>Install Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
        <li>Scan this picture with the app (or type the key below into it).</li>
        <li>Type the 6-digit code the app shows.</li>
      </ol>

      <div className="flex flex-col items-center gap-3">
        {qr ? (
          <img src={qr} alt="Authenticator QR code" width={220} height={220} className="rounded-lg border border-line" />
        ) : (
          <div className="h-[220px] w-[220px] rounded-lg bg-regantify-search animate-pulse" />
        )}
        {secret && (
          <div className="flex items-center gap-2 text-xs">
            <code className="rounded bg-regantify-search px-2 py-1 tracking-wider break-all">{secret.match(/.{1,4}/g)?.join(' ')}</code>
            <button
              type="button"
              className="text-regantify-text-muted hover:text-regantify-text"
              title="Copy key"
              onClick={() => {
                navigator.clipboard?.writeText(secret).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? 'Copied' : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={18} />
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123 456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
          className={`${inputClass} tracking-widest`}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={submitting || !secret || code.replace(/\s/g, '').length !== 6} className={buttonClass}>
        {submitting ? 'Checking…' : 'Turn on and continue'}
      </button>
      <button type="button" className="w-full text-sm text-regantify-text-muted hover:text-regantify-text" onClick={onBack}>
        Back
      </button>
    </form>
  );
}
