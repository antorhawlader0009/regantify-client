import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2, MailCheck } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { emailVerifyApi } from '../../lib/emailVerifyApi';
import { useAuthStore } from '../../store/authStore';

/**
 * Under the email on Profile: "Verified", or a Verify button that emails a 6-digit code and a box to type it in. Shown only for a saved email; a
 * changed email has to be saved first (saving it clears the old mark on the server).
 */
export function EmailVerifyBox({ dirty }: { dirty: boolean }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [stage, setStage] = useState<'idle' | 'sent'>('idle');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // A different email was saved: start over.
  useEffect(() => {
    setStage('idle');
    setCode('');
    setError(null);
    setInfo(null);
  }, [user?.email]);

  if (!user?.email) return null;
  if (user.emailVerifiedAt && !dirty) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <BadgeCheck size={14} /> Verified
      </p>
    );
  }
  if (dirty) return <p className="mt-1.5 text-xs text-neutral-500">Save the new email first, then verify it.</p>;

  const markVerified = (verifiedAt: string) => {
    if (accessToken && user) setAuth(accessToken, { ...user, emailVerifiedAt: verifiedAt });
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await emailVerifyApi.sendCode();
      if (res.alreadyVerified) {
        const s = await emailVerifyApi.status();
        if (s.verifiedAt) markVerified(s.verifiedAt);
        return;
      }
      setStage('sent');
      setInfo(`We emailed a 6-digit code to ${res.email}. It works for 15 minutes. Check the spam folder too.`);
      setWait(60);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the code.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await emailVerifyApi.verify(code);
      markVerified(res.verifiedAt);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not verify the code.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
        <MailCheck size={14} /> Not verified yet
      </p>
      {stage === 'idle' ? (
        <button type="button" onClick={() => void send()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-regantify-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {busy && <Loader2 size={13} className="animate-spin" />}
          Send me a code
        </button>
      ) : (
        <div className="space-y-2">
          {info && <p className="text-xs text-neutral-600">{info}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && !busy && (e.preventDefault(), void verify())}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="h-9 w-32 rounded-lg border border-line bg-white px-3 text-sm tracking-widest focus:outline-none"
            />
            <button type="button" onClick={() => void verify()} disabled={code.length !== 6 || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-regantify-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {busy && <Loader2 size={13} className="animate-spin" />}
              Verify
            </button>
            <button type="button" onClick={() => void send()} disabled={busy || wait > 0} className="text-xs font-medium text-neutral-600 hover:underline disabled:text-neutral-400 disabled:no-underline">
              {wait > 0 ? `Send again in ${wait}s` : 'Send again'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
