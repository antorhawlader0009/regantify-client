import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from './AnalyticsUi';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { staffIncentivesApi, type IncentiveRow } from '../../lib/staffIncentivesApi';
import { downloadCsv, toCsv } from '../../lib/csv';
import { useCan } from '../../lib/useStaffAccess';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatTaka } from './format';

const thisMonth = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 7);

/**
 * Analytics > Orders > "Staff incentives" (TellMe idea 105). A sum per confirmed order and per delivered order, set by the owner for each person;
 * the month's figure is worked out when read. It is a figure to pay by hand: nothing is paid or recorded as an expense. A staff member sees only their own row.
 */
export function StaffIncentives() {
  const isOwner = useCan('owner');
  const [month, setMonth] = useState(thisMonth());
  const query = useQuery({ queryKey: ['staff-incentives', month], queryFn: () => staffIncentivesApi.report(month), enabled: /^\d{4}-\d{2}$/.test(month) });
  const data = query.data;

  return (
    <Card
      title="Staff incentives"
      subtitle="A sum for each order a person confirmed and each order they delivered. Only orders that are Completed now count; returned, refunded and cancelled orders earn nothing."
      action={
        <div className="flex items-center gap-2">
          <input type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-lg border border-line px-2 text-sm" aria-label="Month" />
          <button
            type="button"
            disabled={!data || data.rows.length === 0}
            className={outlineBtn}
            onClick={() =>
              data &&
              downloadCsv(
                `staff-incentives-${data.month}.csv`,
                toCsv(
                  ['Name', 'Confirmed', 'Per confirmed', 'Delivered', 'Per delivered', 'Amount'],
                  data.rows.map((r) => [r.name, r.confirmed, r.perConfirm, r.delivered, r.perDelivered, r.amount].map(String)),
                ),
              )
            }
          >
            Download CSV
          </button>
        </div>
      }
    >
      {query.isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : query.isError || !data ? (
        <p className="text-sm text-neutral-500">Could not load the figures.</p>
      ) : data.rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No staff members yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Per confirmed</th>
                <th className="py-2 pr-3 font-medium">Per delivered</th>
                <th className="py-2 pr-3 text-right font-medium">Confirmed</th>
                <th className="py-2 pr-3 text-right font-medium">Delivered</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <IncentiveLine key={r.staffId} row={r} editable={isOwner} />
              ))}
            </tbody>
            {data.rows.length > 1 && (
              <tfoot>
                <tr className="border-t border-line font-semibold">
                  <td className="py-2" colSpan={5}>
                    Total
                  </td>
                  <td className="py-2 text-right">{formatTaka(data.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Card>
  );
}

function IncentiveLine({ row, editable }: { row: IncentiveRow; editable: boolean }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(String(row.perConfirm));
  const [delivered, setDelivered] = useState(String(row.perDelivered));
  useEffect(() => {
    setConfirm(String(row.perConfirm));
    setDelivered(String(row.perDelivered));
  }, [row.perConfirm, row.perDelivered]);
  const dirty = Number(confirm) !== row.perConfirm || Number(delivered) !== row.perDelivered;
  const save = useMutation({
    mutationFn: () => staffIncentivesApi.setRates(row.staffId, Number(confirm) || 0, Number(delivered) || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-incentives'] });
      toast.success('Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });
  const input = 'h-8 w-20 rounded-lg border border-line px-2 text-sm';

  return (
    <tr className="border-t border-line">
      <td className="py-2 pr-3">
        {row.name}
        {!row.active && <span className="ml-1 text-xs text-neutral-400">(inactive)</span>}
      </td>
      <td className="py-2 pr-3">
        {editable ? <input type="number" min={0} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} /> : formatTaka(row.perConfirm)}
      </td>
      <td className="py-2 pr-3">
        {editable ? (
          <span className="flex items-center gap-2">
            <input type="number" min={0} value={delivered} onChange={(e) => setDelivered(e.target.value)} className={input} />
            {dirty && (
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={`${primaryBtn} !h-8 !px-3`}>
                Save
              </button>
            )}
          </span>
        ) : (
          formatTaka(row.perDelivered)
        )}
      </td>
      <td className="py-2 pr-3 text-right">{row.confirmed}</td>
      <td className="py-2 pr-3 text-right">{row.delivered}</td>
      <td className="py-2 text-right font-medium">{formatTaka(row.amount)}</td>
    </tr>
  );
}
