import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, CircleCheck, MessageSquareWarning, Pencil, RefreshCw } from 'lucide-react';
import { toast } from '../../lib/toast';
import { apiErrorMessage } from '../../lib/api';
import { adminDashboardApi, type SmsBalanceLevel } from '../../lib/adminDashboardApi';
import { formatTaka } from '../analytics/format';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

const LEVEL: Record<SmsBalanceLevel, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  OK: { label: 'Fine', cls: 'bg-green-50 text-green-700 border-green-200', Icon: CircleCheck },
  LOW: { label: 'Low, top up soon', cls: 'bg-red-50 text-red-800 border-red-200', Icon: CircleAlert },
  CRITICAL: { label: 'Almost empty', cls: 'bg-red-50 text-red-700 border-red-200', Icon: MessageSquareWarning },
  UNKNOWN: { label: 'Could not read', cls: 'bg-neutral-50 text-neutral-600 border-neutral-200', Icon: CircleAlert },
};

export const SMS_BALANCE_QUERY = ['admin', 'sms-balance'];

/**
 * The platform's own bulksmsbd.net balance (super-admin-plan.md Step 3). When it reaches zero every OTP on the platform fails, so nobody can sign in or
 * sign up; the owner is texted under the alert level (and hourly under ৳100). Used on the Dashboard and on System status.
 */
export function SmsBalanceCard() {
  const qc = useQueryClient();
  const viewer = useAdminViewer();
  const { data, isFetching } = useQuery({ queryKey: SMS_BALANCE_QUERY, queryFn: adminDashboardApi.smsBalance, refetchInterval: 5 * 60_000 });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const save = useMutation({
    mutationFn: (n: number) => adminDashboardApi.setSmsThreshold(n),
    onSuccess: (next) => {
      qc.setQueryData(SMS_BALANCE_QUERY, next);
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
      setEditing(false);
      toast.success('Alert level saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the alert level.')),
  });

  const level = data ? LEVEL[data.level] : LEVEL.UNKNOWN;
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-regantify-text">Platform SMS balance</p>
          <p className="text-xs text-regantify-text-muted">bulksmsbd.net. Every OTP on the platform needs it.</p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: SMS_BALANCE_QUERY })}
          disabled={isFetching}
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-regantify-text disabled:opacity-50"
          aria-label="Check the balance again"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-regantify-text-muted">Checking…</p>
      ) : !data.configured ? (
        <p className="mt-4 text-sm text-regantify-text-muted">No SMS key is set on this server, so the balance can’t be read.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-semibold tabular-nums text-regantify-text">{data.balance === null ? '—' : formatTaka(data.balance)}</p>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${level.cls}`}>
              <level.Icon size={13} /> {level.label}
            </span>
          </div>
          {data.error && <p className="mt-2 text-sm text-red-700">{data.error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-regantify-text-muted">
            {editing ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(value);
                  if (!Number.isInteger(n) || n < 0) return toast.error('Type a whole number of taka.');
                  save.mutate(n);
                }}
              >
                <span>Text me when under ৳</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
                  className="w-20 rounded-md border border-black/10 px-2 py-1 text-sm text-regantify-text"
                />
                <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-1 rounded-md bg-regantify-black px-2 py-1 text-white disabled:opacity-50">
                  <Check size={12} /> Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="underline">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span>
                  Texts you under {formatTaka(data.threshold)} (and every hour under ৳100).
                </span>
                {adminCan(viewer, 'settings.manage') && <button
                  type="button"
                  onClick={() => {
                    setValue(String(data.threshold));
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-1 underline hover:text-regantify-text"
                >
                  <Pencil size={12} /> Change
                </button>}
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-regantify-text-muted">Checked {formatDhakaDateTime(data.checkedAt)}</p>
        </>
      )}
    </div>
  );
}
