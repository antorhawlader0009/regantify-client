import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RefreshCw, Scale } from 'lucide-react';
import { adminEconomicsApi, type EconomicsOverview, type EconomicsRates } from '../../lib/adminEconomicsApi';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { formatTaka } from '../../components/analytics/format';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const panel = 'rounded-xl border border-line bg-white';
const th = 'px-4 py-2 font-normal';
const thR = 'px-4 py-2 text-right font-normal';
const td = 'px-4 py-2.5';
const tdR = 'px-4 py-2.5 text-right tabular-nums';
const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLong = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const marginClass = (n: number) => (n < 0 ? 'text-red-700' : 'text-regantify-text');
const pctOf = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '-');

/**
 * Super Admin > Economics (super-admin-new.md Step 10): what each store, plan and month brings the platform against what it costs us (AI, SMS, the
 * PayStation fee, referral payouts). The numbers come from a table rebuilt every night at 3:25 AM and right after a cost rate is changed.
 */
export default function Economics() {
  const qc = useQueryClient();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [ratesOpen, setRatesOpen] = useState(false);
  const canAdjust = adminCan(useAdminViewer(), 'money.adjust');
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['admin-economics', month ?? 'default'], queryFn: () => adminEconomicsApi.overview(month) });
  const rebuild = useMutation({
    mutationFn: adminEconomicsApi.rebuild,
    onSuccess: () => {
      toast.success('Recalculated.');
      qc.invalidateQueries({ queryKey: ['admin-economics'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not recalculate.')),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const t = data.totals;
  const r = data.rates;
  const missing = [!r.aiUsdRateSet && `dollar rate (using ${r.aiUsdRate} taka)`, !r.smsRateSet && 'SMS cost (counted as 0)', !r.gatewayFeePercentSet && 'PayStation fee (counted as 0)'].filter(Boolean) as string[];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Scale className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Economics</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              What each store paid the platform in a month against what it cost us: AI, SMS sent from its credits, the PayStation fee on its payments and
              referral rewards paid for bringing it in. Money is counted in the month it was paid.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={data.month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            {data.months.map((m) => (
              <option key={m} value={m}>
                {monthLong(m)}
              </option>
            ))}
          </select>
          {canAdjust && (
            <>
              <button type="button" onClick={() => setRatesOpen(true)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text hover:bg-regantify-search">
                Cost rates
              </button>
              <button type="button" disabled={rebuild.isPending} onClick={() => rebuild.mutate()} title="Recalculate now" className="rounded-lg border border-line bg-white p-2 text-regantify-text hover:bg-regantify-search disabled:opacity-50">
                <RefreshCw size={16} className={rebuild.isPending ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            Not set yet: {missing.join(', ')}. Costs look lower than they are until these are set{canAdjust ? ' in Cost rates' : ''}.
          </p>
        </div>
      )}

      <div className={`grid gap-3 sm:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
        <Tile label="Revenue" value={formatTaka(t.revenue)} hint={`${t.stores} stores with money in or out`} />
        <Tile label="Cost" value={formatTaka(t.cost)} hint={`${pctOf(t.cost, t.revenue)} of revenue`} />
        <Tile label="Margin" value={formatTaka(t.margin)} hint={t.revenue > 0 ? `${Math.round((t.margin / t.revenue) * 100)}% of revenue` : '-'} danger={t.margin < 0} />
        <Tile
          label="Paying store, per month"
          value={formatTaka(data.unit.arpu)}
          hint={data.unit.ltv !== null ? `about ${formatTaka(data.unit.ltv)} over its life (${data.unit.churnPercent}% leave a month)` : `${data.unit.payingStores} paying, none lost this month`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${panel} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-regantify-text">Where the money came from</h2>
          <Lines
            rows={[
              ['Plans', t.revPlan],
              ['SMS packs', t.revSms],
              ['AI Credit packs', t.revAi],
              ['Platform charges on orders', t.revFees],
            ]}
            total={t.revenue}
          />
        </section>
        <section className={`${panel} p-4`}>
          <h2 className="mb-3 text-sm font-semibold text-regantify-text">What it cost us</h2>
          <Lines
            rows={[
              [`AI ($${t.aiUsd.toFixed(2)} at ${r.aiUsdRate} taka)`, t.costAi],
              [`SMS (${t.smsSent.toLocaleString('en-US')} parts)`, t.costSms],
              [`PayStation fee (${r.gatewayFeePercent}%)`, t.costGateway],
              ['Referral rewards and commissions', t.costReferral],
            ]}
            total={t.cost}
          />
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Versus title="AI: what stores paid vs what it cost" paid={data.ai.revenue} cost={data.ai.cost} note="AI included in plans is paid for by the plan price, so AI alone can look like a loss." />
        <Versus title="SMS: what stores paid vs what it cost" paid={data.sms.revenue} cost={data.sms.cost} note={`${data.sms.sent.toLocaleString('en-US')} SMS parts sent from store credits.`} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">By plan, {monthLong(data.month)}</h2>
        <div className={`overflow-x-auto ${panel}`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={th}>Plan</th>
                <th className={thR}>Stores</th>
                <th className={thR}>Revenue</th>
                <th className={thR}>Cost</th>
                <th className={thR}>Margin</th>
                <th className={thR}>Margin %</th>
                <th className={thR}>Per store</th>
                <th className={thR}>Losing money</th>
              </tr>
            </thead>
            <tbody>
              {data.byPlan.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-regantify-text-muted">
                    Nothing was paid or spent in this month.
                  </td>
                </tr>
              )}
              {data.byPlan.map((p) => (
                <tr key={p.planCode} className="border-b border-line last:border-0">
                  <td className={`${td} text-regantify-text`}>{p.plan}</td>
                  <td className={tdR}>{p.stores}</td>
                  <td className={tdR}>{formatTaka(p.revenue)}</td>
                  <td className={tdR}>{formatTaka(p.cost)}</td>
                  <td className={`${tdR} font-medium ${marginClass(p.margin)}`}>{formatTaka(p.margin)}</td>
                  <td className={`${tdR} ${p.marginPercent !== null && p.marginPercent < 0 ? 'text-red-700' : ''}`}>{p.marginPercent === null ? '-' : `${p.marginPercent}%`}</td>
                  <td className={tdR}>{formatTaka(p.arpu)}</td>
                  <td className={tdR}>{p.lossMaking || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-regantify-text-muted">The plan is the one the store was on at the end of the month. Free stores are listed only when they paid for something or cost us something.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Stores losing the most money, {monthLong(data.month)}</h2>
        {data.losers.length === 0 ? (
          <p className={`${panel} px-4 py-8 text-center text-sm text-regantify-text-muted`}>No store cost us more than it paid in this month.</p>
        ) : (
          <div className={`overflow-x-auto ${panel}`}>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                  <th className={th}>Store</th>
                  <th className={th}>Plan</th>
                  <th className={thR}>Paid</th>
                  <th className={thR}>AI</th>
                  <th className={thR}>SMS</th>
                  <th className={thR}>Fee</th>
                  <th className={thR}>Referral</th>
                  <th className={thR}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.losers.map((s) => (
                  <tr key={s.vendorId} className="border-b border-line last:border-0">
                    <td className={td}>
                      <Link to={`/admin/vendors/${s.vendorId}`} className="font-medium text-regantify-text hover:underline">
                        {s.storeName}
                      </Link>
                      <span className="console-id ml-1.5 text-xs text-regantify-text-muted">{s.subdomain}</span>
                    </td>
                    <td className={td}>{s.plan}</td>
                    <td className={tdR}>{formatTaka(s.revenue)}</td>
                    <td className={`${tdR} ${s.biggestCost === 'AI' ? 'font-medium text-regantify-text' : ''}`}>{formatTaka(s.costAi)}</td>
                    <td className={`${tdR} ${s.biggestCost === 'SMS' ? 'font-medium text-regantify-text' : ''}`}>{formatTaka(s.costSms)}</td>
                    <td className={`${tdR} ${s.biggestCost === 'Gateway' ? 'font-medium text-regantify-text' : ''}`}>{formatTaka(s.costGateway)}</td>
                    <td className={`${tdR} ${s.biggestCost === 'Referral' ? 'font-medium text-regantify-text' : ''}`}>{formatTaka(s.costReferral)}</td>
                    <td className={`${tdR} font-medium text-red-700`}>{formatTaka(s.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Last 12 months</h2>
        <div className={`overflow-x-auto ${panel}`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={th}>Month</th>
                <th className={thR}>Paying stores</th>
                <th className={thR}>Revenue</th>
                <th className={thR}>Cost</th>
                <th className={thR}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {[...data.trend].reverse().map((m) => (
                <tr key={m.month} className={`border-b border-line last:border-0 ${m.month === data.month ? 'bg-regantify-search/60' : ''}`}>
                  <td className={`${td} text-regantify-text`}>{monthLabel(m.month)}</td>
                  <td className={tdR}>{m.payingStores}</td>
                  <td className={tdR}>{formatTaka(m.revenue)}</td>
                  <td className={tdR}>{formatTaka(m.cost)}</td>
                  <td className={`${tdR} font-medium ${marginClass(m.margin)}`}>{formatTaka(m.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Cohorts data={data} />

      <p className="text-xs text-regantify-text-muted">
        {data.computedAt ? `Last calculated ${formatDhakaDateTime(data.computedAt)}. ` : ''}Recalculated every night at 3:25 AM and whenever a cost rate is changed; a new rate applies to all 12
        months. Not counted: AI features that use their own monthly limits (LMS assist, landing page AI, product info maker), SMS the platform sends itself (sign-in
        codes and the like), and server costs.
      </p>

      <RatesDialog open={ratesOpen} rates={r} onClose={() => setRatesOpen(false)} />
    </div>
  );
}

function Tile({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className={`${panel} p-4`}>
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${danger ? 'text-red-700' : 'text-regantify-text'}`}>{value}</p>
      <p className="text-xs text-regantify-text-muted">{hint}</p>
    </div>
  );
}

function Lines({ rows, total }: { rows: Array<[string, number]>; total: number }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="py-1 text-regantify-text">{label}</td>
            <td className="py-1 text-right tabular-nums text-regantify-text-muted">{pctOf(value, total)}</td>
            <td className="w-28 py-1 text-right tabular-nums">{formatTaka(value)}</td>
          </tr>
        ))}
        <tr className="border-t border-line">
          <td className="pt-2 font-medium text-regantify-text">Total</td>
          <td />
          <td className="pt-2 text-right font-medium tabular-nums">{formatTaka(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Versus({ title, paid, cost, note }: { title: string; paid: number; cost: number; note: string }) {
  const diff = paid - cost;
  return (
    <div className={`${panel} p-4`}>
      <p className="text-xs text-regantify-text-muted">{title}</p>
      <p className="mt-1 text-sm text-regantify-text">
        Paid {formatTaka(paid)} · cost {formatTaka(cost)} · <span className={`font-medium ${marginClass(diff)}`}>{formatTaka(diff)}</span>
      </p>
      <p className="mt-1 text-xs text-regantify-text-muted">{note}</p>
    </div>
  );
}

/** Stores that opened in a month and the revenue they brought in each month after (0 = the month they opened). */
function Cohorts({ data }: { data: EconomicsOverview }) {
  const width = Math.max(1, ...data.cohorts.map((c) => c.cells.length));
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-regantify-text">Revenue by sign-up month</h2>
      <div className={`overflow-x-auto ${panel}`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
              <th className={th}>Opened in</th>
              <th className={thR}>Stores</th>
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className={thR}>
                  {i === 0 ? 'Same month' : `+${i}`}
                </th>
              ))}
              <th className={thR}>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...data.cohorts].reverse().map((c) => {
              const total = c.cells.reduce((s, x) => s + x.revenue, 0);
              return (
                <tr key={c.cohort} className="border-b border-line last:border-0">
                  <td className={`${td} text-regantify-text`}>{monthLabel(c.cohort)}</td>
                  <td className={tdR}>{c.stores}</td>
                  {Array.from({ length: width }, (_, i) => {
                    const cell = c.cells[i];
                    return (
                      <td key={i} className={`${tdR} ${cell ? '' : 'bg-regantify-search/40'}`} title={cell ? `${cell.paying} paying, margin ${formatTaka(cell.margin)}` : undefined}>
                        {cell ? (cell.revenue ? formatTaka(cell.revenue) : '-') : ''}
                      </td>
                    );
                  })}
                  <td className={`${tdR} font-medium`}>{formatTaka(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-regantify-text-muted">Hover a cell for how many of those stores were paying and the margin they left.</p>
    </section>
  );
}

function RatesDialog({ open, rates, onClose }: { open: boolean; rates: EconomicsRates; onClose: () => void }) {
  const qc = useQueryClient();
  const [ai, setAi] = useState('');
  const [sms, setSms] = useState('');
  const [gw, setGw] = useState('');
  useEffect(() => {
    if (!open) return;
    setAi(rates.aiUsdRateSet ? String(rates.aiUsdRate) : '');
    setSms(rates.smsRateSet ? String(rates.smsRate) : '');
    setGw(rates.gatewayFeePercentSet ? String(rates.gatewayFeePercent) : '');
  }, [open, rates]);
  const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
  const values = { aiUsdRate: toNum(ai), smsRate: toNum(sms), gatewayFeePercent: toNum(gw) };
  const valid =
    (values.aiUsdRate === null || (values.aiUsdRate >= 1 && values.aiUsdRate <= 1000)) &&
    (values.smsRate === null || (values.smsRate >= 0.01 && values.smsRate <= 10)) &&
    (values.gatewayFeePercent === null || (values.gatewayFeePercent >= 0 && values.gatewayFeePercent <= 10));
  const save = useMutation({
    mutationFn: () => adminEconomicsApi.setRates(values),
    onSuccess: () => {
      toast.success('Saved. The last 12 months were recalculated with the new rates.');
      qc.invalidateQueries({ queryKey: ['admin-economics'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the rates.')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Cost rates" maxWidth="max-w-md">
      <div className="space-y-4 p-6 pt-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Taka per US dollar (AI)</label>
          <input type="number" step="0.01" min={1} value={ai} onChange={(e) => setAi(e.target.value)} placeholder={`Not set (using ${rates.aiUsdRate})`} className={field} />
          <p className="mt-1 text-xs text-regantify-text-muted">Cloudflare bills AI in dollars; use what your card is actually charged.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">What one SMS part costs us (taka)</label>
          <input type="number" step="0.0001" min={0.01} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Not set" className={field} />
          <p className="mt-1 text-xs text-regantify-text-muted">The bulksmsbd price per text. The same rate Messages uses to show a send's cost.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">PayStation fee (% of each payment)</label>
          <input type="number" step="0.01" min={0} max={10} value={gw} onChange={(e) => setGw(e.target.value)} placeholder="Not set" className={field} />
          <p className="mt-1 text-xs text-regantify-text-muted">Taken from every payment that goes through PayStation: plans, packs, wallet top-ups and shoppers' online payments.</p>
        </div>
        <p className="text-xs text-regantify-text-muted">Leave a box empty for "not set". Saving recalculates the last 12 months, which can take a few seconds.</p>
        <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save and recalculate'}
        </button>
      </div>
    </Dialog>
  );
}
