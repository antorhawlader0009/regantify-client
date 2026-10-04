import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { posApi, type PosUnlock } from '../../lib/posApi';
import { Field, PosInput, PosSelect } from './ui';

export const POS_CASHIERS_KEY = ['pos', 'cashiers'] as const;

/**
 * "Who's at the counter": pick your name, type your PIN. Used wherever a
 * counter action is stamped with a person (open / close a register now,
 * every sale from Step 4). The PIN only ever goes to the server's
 * pin-check; what comes back (a 12-hour token) goes on the action.
 */
export function useCashierUnlock() {
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const cashiersQuery = useQuery({ queryKey: POS_CASHIERS_KEY, queryFn: posApi.cashiers });

  const ready = staffId !== '' && /^\d{4,6}$/.test(pin);
  const unlock = (): Promise<PosUnlock> => posApi.pinCheck(staffId, pin);
  const clearPin = () => setPin('');

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name">
        {cashiersQuery.isSuccess && cashiersQuery.data.length === 0 ? (
          <p className="text-sm text-pos-muted">
            Nobody has a PIN yet. Set one under{' '}
            <Link to="/vendor/pos/staff" className="font-medium text-pos-ink underline">
              POS &gt; Staff
            </Link>
            .
          </p>
        ) : (
          <PosSelect value={staffId} onChange={(e) => setStaffId(e.target.value)} disabled={!cashiersQuery.isSuccess}>
            <option value="">{cashiersQuery.isPending ? 'Loading…' : 'Choose'}</option>
            {cashiersQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
                {c.role === 'MANAGER' ? ' (manager)' : ''}
              </option>
            ))}
          </PosSelect>
        )}
      </Field>
      <Field label="PIN">
        <PosInput
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="4 to 6 digits"
          className="font-mono tracking-[0.3em]"
        />
      </Field>
    </div>
  );

  return { fields, ready, unlock, clearPin };
}
