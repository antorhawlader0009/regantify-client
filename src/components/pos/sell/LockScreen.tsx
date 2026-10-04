import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Delete, Lock } from 'lucide-react';
import { posApi, type PosUnlock } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { POS_CASHIERS_KEY } from '../CashierUnlock';
import { PosButton } from '../ui';

/**
 * The counter's lock screen: tap your name, type your PIN (keypad or
 * keyboard). A correct PIN unlocks the counter for 12 hours; "Lock" on the
 * sell screen brings this back for the next person.
 */
export function LockScreen({ registerName, onUnlock }: { registerName: string; onUnlock: (unlock: PosUnlock) => void }) {
  const cashiers = useQuery({ queryKey: POS_CASHIERS_KEY, queryFn: posApi.cashiers });
  const [staffId, setStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: (code: string) => posApi.pinCheck(staffId!, code),
    onSuccess: onUnlock,
    onError: (err) => {
      setPin('');
      setError(apiErrorMessage(err, 'That didn’t work. Try again.'));
    },
  });

  const press = (digit: string) => {
    if (check.isPending) return;
    setError(null);
    setPin((p) => (p.length < 6 ? p + digit : p));
  };
  const submit = () => {
    if (staffId && /^\d{4,6}$/.test(pin)) check.mutate(pin);
  };

  // Typing works too: digits, Backspace, Enter.
  useEffect(() => {
    if (!staffId) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Enter') submit();
      else if (e.key === 'Escape') {
        setStaffId(null);
        setPin('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chosen = cashiers.data?.find((c) => c.id === staffId);

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[14px] border border-pos-line bg-pos-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 text-pos-muted">
          <Lock size={16} aria-hidden />
          <span className="text-sm">{registerName} is locked</span>
        </div>

        {!chosen ? (
          <>
            <h1 className="text-lg font-semibold">Who's at the counter?</h1>
            {cashiers.isPending && <p className="mt-4 text-sm text-pos-muted">Loading…</p>}
            {cashiers.isSuccess && cashiers.data.length === 0 && (
              <p className="mt-4 text-sm text-pos-muted">
                Nobody has a PIN yet. Set one under{' '}
                <Link to="/vendor/pos/staff" className="font-medium text-pos-ink underline">
                  POS &gt; Staff
                </Link>
                .
              </p>
            )}
            <div className="mt-4 grid gap-2">
              {cashiers.data?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setStaffId(c.id)}
                  className="flex h-14 items-center justify-between rounded-lg border border-pos-line px-4 text-left text-base font-medium hover:bg-pos-page"
                >
                  {c.displayName}
                  {c.role === 'MANAGER' && <span className="text-xs font-normal text-pos-muted">Manager</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">{chosen.displayName}, enter your PIN</h1>
            <div className="mt-4 flex h-12 items-center justify-center gap-3" aria-live="polite" aria-label={`${pin.length} digits entered`}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? 'bg-pos-ink' : i < 4 ? 'border-2 border-pos-line' : 'border border-dashed border-pos-line'}`} />
              ))}
            </div>
            {error && <p className="mb-2 text-center text-sm text-pos-alert">{error}</p>}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <KeyButton key={d} onClick={() => press(d)}>
                  {d}
                </KeyButton>
              ))}
              <KeyButton onClick={() => setPin((p) => p.slice(0, -1))} label="Delete last digit">
                <Delete size={20} aria-hidden />
              </KeyButton>
              <KeyButton onClick={() => press('0')}>0</KeyButton>
              <button
                type="button"
                onClick={submit}
                disabled={pin.length < 4 || check.isPending}
                className="h-14 rounded-lg bg-pos-go text-base font-semibold text-white disabled:opacity-40"
              >
                {check.isPending ? '…' : 'OK'}
              </button>
            </div>
            <PosButton
              variant="quiet"
              className="mt-3 w-full"
              onClick={() => {
                setStaffId(null);
                setPin('');
                setError(null);
              }}
            >
              Not you?
            </PosButton>
          </>
        )}
      </div>
    </div>
  );
}

function KeyButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-14 items-center justify-center rounded-lg border border-pos-line text-xl font-medium hover:bg-pos-page active:bg-pos-line"
    >
      {children}
    </button>
  );
}
