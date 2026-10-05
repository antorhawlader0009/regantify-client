import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PosPage } from '../../../components/pos/PosLayout';
import { ShiftReportDialog } from '../../../components/pos/ShiftReportView';
import { Panel, PosButton, taka } from '../../../components/pos/ui';
import { posApi, TENDER_LABEL, type PosTender } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';

/*
 * POS > Reports (POS-system-plan.md Step 11): the counter for a range of Dhaka days. Counted
 * like the Z report: sales on the day they were rung up, returns and voids on the day they were
 * given, so one day here equals the Z reports of that day's shifts.
 */

const DAY_MS = 86_400_000;
const dhakaDay = (t: number) => new Date(t + 6 * 3_600_000).toISOString().slice(0, 10);
const methodName = (m: string) => TENDER_LABEL[m as PosTender] ?? m;
const shortDay = (day: string) => new Date(`${day}T00:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short' });
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

type Preset = 'today' | 'yesterday' | '7' | '30' | 'month';
function presetRange(p: Preset): { from: string; to: string } {
  const now = Date.now();
  const today = dhakaDay(now);
  if (p === 'today') return { from: today, to: today };
  if (p === 'yesterday') return { from: dhakaDay(now - DAY_MS), to: dhakaDay(now - DAY_MS) };
  if (p === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: dhakaDay(now - (Number(p) - 1) * DAY_MS), to: today };
}
const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: 'month', label: 'This month' },
];

export default function PosReportsPage() {
  return <PosPage title="Reports">{() => <ReportsBody />}</PosPage>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Panel className="min-w-0">
      <p className="text-xs text-pos-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-pos-muted">{sub}</p>}
    </Panel>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Panel className={className}>
      <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
      {children}
    </Panel>
  );
}

function ReportsBody() {
  const [preset, setPreset] = useState<Preset | null>('today');
  const [range, setRange] = useState(presetRange('today'));
  const [zFor, setZFor] = useState<string | null>(null);
  const report = useQuery({ queryKey: ['pos', 'report', range], queryFn: () => posApi.report(range.from, range.to) });
  const choose = (p: Preset) => {
    setPreset(p);
    setRange(presetRange(p));
  };
  const r = report.data;
  const maxHour = Math.max(1, ...(r?.byHour.map((h) => h.total) ?? [1]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div role="group" aria-label="Period" className="inline-flex overflow-hidden rounded-md border border-pos-line">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => choose(p.id)} className={`h-9 px-3 text-sm ${preset === p.id ? 'bg-pos-ink text-white' : 'bg-pos-surface'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {(['from', 'to'] as const).map((k) => (
          <label key={k} className="text-xs text-pos-muted">
            {k === 'from' ? 'From' : 'To'}
            <input
              type="date"
              value={range[k]}
              onChange={(e) => {
                if (!e.target.value) return;
                setPreset(null);
                setRange((x) => ({ ...x, [k]: e.target.value }));
              }}
              className="mt-1 block h-9 rounded-md border border-pos-line bg-pos-surface px-2.5 text-sm"
            />
          </label>
        ))}
      </div>

      {report.isPending ? (
        <p className="text-sm text-pos-muted">Loading…</p>
      ) : report.isError ? (
        <p className="text-sm text-pos-alert">{apiErrorMessage(report.error, 'The report couldn’t load.')}</p>
      ) : (
        r && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Sales" value={taka(r.totals.total)} sub={`${r.totals.sales} ${r.totals.sales === 1 ? 'sale' : 'sales'}`} />
              <Tile label="Net after returns" value={taka(r.totals.net)} sub={r.totals.returns.count + r.totals.voids.count > 0 ? `${taka(r.totals.returns.amount + r.totals.voids.amount)} given back` : 'Nothing given back'} />
              <Tile label="Average sale" value={taka(r.totals.averageSale)} />
              <Tile label="Discounts and coupons" value={taka(r.totals.discounts)} sub={r.totals.vat > 0 ? `VAT ${taka(r.totals.vat)}` : undefined} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="By day">
                <table className="w-full text-sm">
                  <thead className="text-left text-pos-muted">
                    <tr>
                      <th className="py-1.5 font-medium">Day</th>
                      <th className="py-1.5 text-right font-medium">Sales</th>
                      <th className="py-1.5 text-right font-medium">Total</th>
                      <th className="py-1.5 text-right font-medium">Returns</th>
                      <th className="py-1.5 text-right font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...r.byDay].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-pos-line">
                        <td className="py-1.5">{shortDay(d.day)}</td>
                        <td className="py-1.5 text-right tabular-nums">{d.sales}</td>
                        <td className="py-1.5 text-right tabular-nums">{taka(d.total)}</td>
                        <td className="py-1.5 text-right tabular-nums text-pos-muted">{d.returns > 0 ? `−${taka(d.returns)}` : ''}</td>
                        <td className="py-1.5 text-right font-medium tabular-nums">{taka(d.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section title="Busy hours">
                {r.byHour.length === 0 ? (
                  <p className="text-sm text-pos-muted">No sales in this period.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {r.byHour.map((h) => (
                      <li key={h.hour} className="grid grid-cols-[3rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-sm">
                        <span className="text-pos-muted">{hourLabel(h.hour)}</span>
                        <span className="h-2.5 rounded-full bg-pos-page">
                          <span className="block h-full rounded-full bg-pos-ink" style={{ width: `${Math.max(2, (h.total / maxHour) * 100)}%` }} />
                        </span>
                        <span className="text-right tabular-nums">
                          {taka(h.total)} <span className="text-xs text-pos-muted">({h.sales})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="By payment">
                {r.byMethod.length === 0 ? (
                  <p className="text-sm text-pos-muted">Nothing yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-pos-muted">
                      <tr>
                        <th className="py-1.5 font-medium">Method</th>
                        <th className="py-1.5 text-right font-medium">Sales</th>
                        <th className="py-1.5 text-right font-medium">Due paid</th>
                        <th className="py-1.5 text-right font-medium">Refunds</th>
                        <th className="py-1.5 text-right font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.byMethod.map((m) => (
                        <tr key={m.method} className="border-t border-pos-line">
                          <td className="py-1.5">{methodName(m.method)}</td>
                          <td className="py-1.5 text-right tabular-nums">{taka(m.sales)}</td>
                          <td className="py-1.5 text-right tabular-nums text-pos-muted">{m.dueCollected > 0 ? taka(m.dueCollected) : ''}</td>
                          <td className="py-1.5 text-right tabular-nums text-pos-muted">{m.refunds > 0 ? `−${taka(m.refunds)}` : ''}</td>
                          <td className="py-1.5 text-right font-medium tabular-nums">{taka(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>

              <Section title="By cashier">
                {r.byCashier.length === 0 ? (
                  <p className="text-sm text-pos-muted">Nothing yet.</p>
                ) : (
                  <ul className="divide-y divide-pos-line text-sm">
                    {r.byCashier.map((c) => (
                      <li key={c.name} className="flex justify-between gap-3 py-1.5">
                        <span>
                          {c.name} <span className="text-pos-muted">· {c.sales} {c.sales === 1 ? 'sale' : 'sales'}</span>
                        </span>
                        <span className="tabular-nums">{taka(c.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Top products">
                {r.topProducts.length === 0 ? (
                  <p className="text-sm text-pos-muted">Nothing sold yet.</p>
                ) : (
                  <ul className="divide-y divide-pos-line text-sm">
                    {r.topProducts.map((p) => (
                      <li key={p.name} className="flex justify-between gap-3 py-1.5">
                        <span className="min-w-0 truncate">
                          {p.name} <span className="text-pos-muted">× {p.quantity}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{taka(p.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Cash short and over">
                {r.variances.length === 0 ? (
                  <p className="text-sm text-pos-muted">No register was closed in this period.</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-pos-muted">
                      {r.varianceTotals.shifts} closed {r.varianceTotals.shifts === 1 ? 'shift' : 'shifts'}
                      {r.varianceTotals.short > 0 && <> · short {taka(r.varianceTotals.short)}</>}
                      {r.varianceTotals.over > 0 && <> · over {taka(r.varianceTotals.over)}</>}
                    </p>
                    <ul className="divide-y divide-pos-line text-sm">
                      {r.variances.map((v) => (
                        <li key={v.sessionId} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="min-w-0">
                            {v.register}
                            <span className="block text-xs text-pos-muted">
                              {new Date(v.closedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                              {v.closedByName && ` · ${v.closedByName}`}
                            </span>
                          </span>
                          <span className={`shrink-0 tabular-nums ${v.variance < 0 ? 'text-pos-alert' : ''}`}>
                            {v.variance === 0 ? 'Exact' : `${v.variance < 0 ? 'Short' : 'Over'} ${taka(Math.abs(v.variance))}`}
                          </span>
                          <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => setZFor(v.sessionId)}>
                            Z report
                          </PosButton>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Section>
            </div>
          </>
        )
      )}
      {zFor && <ShiftReportDialog sessionId={zFor} onClose={() => setZFor(null)} />}
    </div>
  );
}
