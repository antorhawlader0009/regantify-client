import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, KeyRound, MessageSquare } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { staffApi, type StaffMember } from '../../lib/staffApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it yourself.');
  }
}

const errorText = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : typeof message === 'string' ? message : null) ?? fallback;
};

/**
 * Staff > Login details (rule-plan.md 5.6/5.8), owner-only. The password is
 * fetched only when the owner asks to see or copy it, because the server logs
 * every look. Reset makes a new one and signs them out everywhere; "Send by
 * SMS" texts their role and login details (free, no SMS credits).
 */
export function LoginDetailsDialog({ member, onOpenChange }: { member: StaffMember | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={member != null} onOpenChange={onOpenChange} title={member ? `Login details: ${member.name}` : 'Login details'} maxWidth="max-w-lg">
      {/* Keyed by person so a revealed password never carries over to the next one. */}
      {member && <DetailsBody key={member.id} member={member} />}
    </Dialog>
  );
}

function DetailsBody({ member }: { member: StaffMember }) {
  const queryClient = useQueryClient();
  const loginUrl = `${window.location.origin}/vendor/login`;
  // undefined = not asked yet; null = no saved password.
  const [password, setPassword] = useState<string | null | undefined>(undefined);
  const [shown, setShown] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSms, setResetSms] = useState(true);
  const hasPassword = password ? true : password === null ? false : member.hasSavedPassword;

  const fetchPassword = useMutation({
    mutationFn: () => staffApi.credentials(member.id),
    onSuccess: (c) => setPassword(c.password),
    onError: (err) => toast.error(errorText(err, 'Couldn’t load the password. Try again.')),
  });
  const getPassword = async () => (password !== undefined ? password : (await fetchPassword.mutateAsync()).password);

  const reset = useMutation({
    mutationFn: () => staffApi.resetPassword(member.id, { sendLoginSms: resetSms }),
    onSuccess: (r) => {
      setPassword(r.password);
      setShown(true);
      setConfirmReset(false);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      if (r.smsError) toast.error(`New password made, but the SMS didn’t go out: ${r.smsError}`);
      else toast.success(r.smsSent ? `New password sent to ${member.phone}` : 'New password made. Send it to them yourself.');
    },
    onError: (err) => toast.error(errorText(err, 'Couldn’t reset the password. Try again.')),
  });

  const sendSms = useMutation({
    mutationFn: () => staffApi.sendLoginSms(member.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`Login details sent to ${member.phone}`);
    },
    onError: (err) => toast.error(errorText(err, 'Couldn’t send the SMS. Try again in a minute.')),
  });

  const rows: [string, string | null][] = [
    ['Role', member.role],
    ['Login page', loginUrl],
    ['Phone', member.phone],
    ...(member.email ? ([['Email', member.email]] as [string, string][]) : []),
  ];

  return (
    <div className="px-6 pb-6 pt-3">
      <dl className="divide-y divide-line rounded-lg border border-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt className="shrink-0 text-neutral-500">{label}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 break-all text-right">{value ?? '—'}</span>
              {value && label !== 'Role' && (
                <button type="button" onClick={() => copy(value, label)} aria-label={`Copy ${label.toLowerCase()}`} className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text">
                  <Copy size={14} aria-hidden />
                </button>
              )}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <dt className="shrink-0 text-neutral-500">Password</dt>
          <dd className="flex min-w-0 items-center gap-2">
            {hasPassword ? (
              <>
                <span className="font-mono tabular-nums">{shown && password ? password : '••••••••••'}</span>
                <button
                  type="button"
                  disabled={fetchPassword.isPending}
                  onClick={async () => {
                    if (shown) return setShown(false);
                    if ((await getPassword()) !== null) setShown(true);
                  }}
                  aria-label={shown ? 'Hide password' : 'Show password'}
                  className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text disabled:opacity-50"
                >
                  {shown ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                </button>
                <button
                  type="button"
                  disabled={fetchPassword.isPending}
                  onClick={async () => {
                    const pw = await getPassword();
                    if (pw) copy(pw, 'Password');
                  }}
                  aria-label="Copy password"
                  className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text disabled:opacity-50"
                >
                  <Copy size={14} aria-hidden />
                </button>
              </>
            ) : (
              <span className="text-right text-xs text-neutral-500">Not saved. Reset it to get one you can see.</span>
            )}
          </dd>
        </div>
      </dl>

      {!hasPassword && (
        <p className="mt-2 text-xs text-neutral-500">
          They set their own password (or were added before passwords were saved here). We never keep a copy of a password someone picked.
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        {member.lastLoginAt ? `Last sign-in ${formatDhakaDateTime(member.lastLoginAt)}${member.lastLoginIp ? ` from ${member.lastLoginIp}` : ''}.` : 'Hasn’t signed in yet.'}
        {member.credentialsSmsAt && ` Login SMS last sent ${formatDhakaDateTime(member.credentialsSmsAt)}.`}
      </p>

      {confirmReset ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-regantify-text">Make a new password?</p>
          <p className="mt-0.5 text-xs text-neutral-600">They’re signed out everywhere and need the new one to sign in again.</p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={resetSms} onChange={(e) => setResetSms(e.target.checked)} className="h-4 w-4 cursor-pointer accent-brand" />
            Send it to them by SMS
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={reset.isPending} onClick={() => reset.mutate()} className={`${primaryBtn} disabled:opacity-60`}>
              {reset.isPending ? 'Resetting…' : 'Reset password'}
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className={outlineBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const pw = hasPassword ? await getPassword() : null;
              copy(`Role: ${member.role}\nLogin: ${loginUrl}\nPhone: ${member.phone ?? ''}${pw ? `\nPassword: ${pw}` : ''}`, 'Login details');
            }}
            className={outlineBtn}
          >
            <Copy size={14} aria-hidden />
            Copy all
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className={outlineBtn}>
            <KeyRound size={14} aria-hidden />
            Reset password
          </button>
          <button
            type="button"
            disabled={!hasPassword || sendSms.isPending}
            title={hasPassword ? undefined : 'Reset the password first'}
            onClick={() => sendSms.mutate()}
            className={`${outlineBtn} disabled:opacity-50`}
          >
            <MessageSquare size={14} aria-hidden />
            {sendSms.isPending ? 'Sending…' : 'Send by SMS'}
          </button>
        </div>
      )}
    </div>
  );
}
