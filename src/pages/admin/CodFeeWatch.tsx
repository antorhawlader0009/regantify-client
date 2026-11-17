import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Truck } from 'lucide-react';
import { codFeeWatchApi } from '../../lib/codFeeWatchApi';

const th = 'px-4 py-2 font-normal';
const thR = 'px-4 py-2 text-right font-normal';
const td = 'px-4 py-2.5';
const tdR = 'px-4 py-2.5 text-right tabular-nums';
const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Super Admin > Stores > COD fee watch (security review P-12). The platform fee of a cash-on-delivery order is taken when it first
 * reaches Completed. Orders a store delivers with its own rider are moved by hand, so this lists the signs of orders that were
 * delivered but never marked Completed: long stays in Shipping, and cancels or returns after shipping. Read only.
 */
export default function CodFeeWatch() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({ queryKey: ['admin-cod-fee-watch', days], queryFn: () => codFeeWatchApi.stores(days) });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Truck className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">COD fee watch</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              The platform fee on a cash-on-delivery order is taken when it is marked Completed. Orders a store delivers with its own rider
              (not booked with a connected courier) are marked by the store itself. Stores below have such orders sitting in Shipping for
              more than {data?.stuckAfterDays ?? 14} days, or cancelled or returned after shipping. Nothing here is charged automatically.
            </p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          {[30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label={`In Shipping over ${data.stuckAfterDays} days`} value={data.totals.stuckShipping.toLocaleString('en-US')} />
            <Tile label="Fee not taken on those yet" value={taka(data.totals.stuckFee)} />
            <Tile label="Cancelled or returned after shipping" value={data.totals.cancelledAfterShipping.toLocaleString('en-US')} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                  <th className={th}>Store</th>
                  <th className={thR}>Stuck in Shipping</th>
                  <th className={thR}>Fee not taken</th>
                  <th className={thR}>Cancelled after shipping</th>
                  <th className={thR}>Completed (own delivery)</th>
                </tr>
              </thead>
              <tbody>
                {data.stores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-regantify-text-muted">
                      No store shows these signs in this period.
                    </td>
                  </tr>
                )}
                {data.stores.map((s) => (
                  <tr key={s.vendorId} className="border-b border-line last:border-0">
                    <td className={td}>
                      <Link to={`/admin/vendors/${s.vendorId}`} className="font-medium text-regantify-text hover:underline">
                        {s.storeName}
                      </Link>
                      <span className="console-id ml-1.5 text-xs text-regantify-text-muted">{s.subdomain}</span>
                    </td>
                    <td className={`${tdR} ${s.stuckShipping > 0 ? 'font-medium text-red-700' : ''}`}>{s.stuckShipping}</td>
                    <td className={tdR}>{taka(s.stuckFee)}</td>
                    <td className={`${tdR} ${s.cancelledAfterShipping > 0 ? 'font-medium text-red-700' : ''}`}>{s.cancelledAfterShipping}</td>
                    <td className={tdR}>{s.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-regantify-text">{value}</p>
    </div>
  );
}
