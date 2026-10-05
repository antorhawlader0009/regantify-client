import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { PosPage } from '../../../components/pos/PosLayout';
import { ShiftReportDialog } from '../../../components/pos/ShiftReportView';
import { PosButton, taka } from '../../../components/pos/ui';
import { posApi } from '../../../lib/posApi';

/*
 * POS > Sessions (POS-system-plan.md Step 10): every shift with its cash result, and its report:
 * the X report of an open shift, the frozen Z report of a closed one, both printable.
 */

const dhakaTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function PosSessionsPage() {
  return <PosPage title="Sessions">{() => <SessionsTable />}</PosPage>;
}

/** The shifts table. `recent`: the last 10 on the Registers page, with a link here. */
export function SessionsTable({ recent = false }: { recent?: boolean }) {
  const [page, setPage] = useState(1);
  const [registerId, setRegisterId] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  const perPage = recent ? 10 : 25;
  const registers = useQuery({ queryKey: ['pos', 'registers'], queryFn: posApi.registers, enabled: !recent });
  const query = useQuery({
    queryKey: ['pos', 'sessions', { page, perPage, registerId }],
    queryFn: () => posApi.sessions({ page, perPage, registerId: registerId || undefined }),
  });

  if (recent && (!query.isSuccess || query.data.sessions.length === 0)) return null;
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / perPage)) : 1;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {recent ? <h2 className="text-base font-semibold">Recent shifts</h2> : <p className="text-sm text-pos-muted">Every shift, newest first. Open one’s report to see or print it.</p>}
        {recent ? (
          <Link to="/vendor/pos/sessions" className="text-sm text-pos-muted underline-offset-2 hover:text-pos-ink hover:underline">
            All shifts and Z reports
          </Link>
        ) : (
          <select
            value={registerId}
            onChange={(e) => {
              setRegisterId(e.target.value);
              setPage(1);
            }}
            aria-label="Register"
            className="h-9 rounded-md border border-pos-line bg-pos-surface px-3 text-sm"
          >
            <option value="">All registers</option>
            {registers.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {query.isPending ? (
        <p className="text-sm text-pos-muted">Loading…</p>
      ) : !query.data?.sessions.length ? (
        <p className="rounded-[10px] border border-pos-line bg-pos-surface px-4 py-8 text-center text-sm text-pos-muted">No shifts yet. Open a register to start one.</p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-pos-line bg-pos-surface">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-pos-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Register</th>
                <th className="px-4 py-2.5 font-medium">Opened</th>
                <th className="px-4 py-2.5 font-medium">Closed</th>
                <th className="px-4 py-2.5 text-right font-medium">Float</th>
                <th className="px-4 py-2.5 text-right font-medium">Expected</th>
                <th className="px-4 py-2.5 text-right font-medium">Counted</th>
                <th className="px-4 py-2.5 text-right font-medium">Difference</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {query.data.sessions.map((s) => {
                const variance = s.variance === null ? null : Number(s.variance);
                return (
                  <tr key={s.id} className="border-t border-pos-line">
                    <td className="px-4 py-2.5">{s.register.name}</td>
                    <td className="px-4 py-2.5">
                      {dhakaTime(s.openedAt)} <span className="text-pos-muted">· {s.openedByName}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.closedAt ? (
                        <>
                          {dhakaTime(s.closedAt)} <span className="text-pos-muted">· {s.closedByName}</span>
                        </>
                      ) : (
                        <span className="text-pos-go">Open</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{taka(s.openingFloat)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.expectedCash === null ? '' : taka(s.expectedCash)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.countedCash === null ? '' : taka(s.countedCash)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${variance !== null && variance < 0 ? 'text-pos-alert' : ''}`}>
                      {variance === null ? '' : variance === 0 ? taka(0) : `${variance < 0 ? 'Short ' : 'Over '}${taka(Math.abs(variance))}`}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => setViewing(s.id)}>
                        <FileText size={14} aria-hidden />
                        {s.status === 'OPEN' ? 'X report' : 'Z report'}
                      </PosButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!recent && pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <span className="text-pos-muted">
            Page {page} of {pages}
          </span>
          <PosButton className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </PosButton>
          <PosButton className="h-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Older
          </PosButton>
        </div>
      )}
      {viewing && <ShiftReportDialog sessionId={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
