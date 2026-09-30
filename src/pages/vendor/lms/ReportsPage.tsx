import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';
import { LmsSelect, StageMark } from '../../../components/lms/ui';
import { formatMoney } from '../../../components/lms/format';
import { useLmsAgents } from '../../../components/lms/Team';
import { BarRows, Block, HourChart, Strip, StripCell, formatMinutes, formatPct } from '../../../components/lms/Reports';
import { apiErrorMessage } from '../../../lib/api';
import { LMS_SOURCE_LABELS, lmsApi, type LmsMe, type LmsReport, type LmsReportRange } from '../../../lib/lmsApi';

const RANGES: { id: LmsReportRange; label: string }[] = [
  { id: '7D', label: '7 days' },
  { id: '30D', label: '30 days' },
  { id: '90D', label: '90 days' },
];

const OUTCOME_WORDS: Record<string, string> = {
  REACHED: 'Reached',
  CALL_LATER: 'Call later',
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  SWITCHED_OFF: 'Switched off',
  WRONG_NUMBER: 'Wrong number / fake',
  WON: 'Won (confirmed or ordering)',
  LOST: 'Lost (cancelled or not interested)',
};

const FORM_WORDS: Record<string, string> = {
  'notify-me': 'Store form: notify me',
  'call-back': 'Store form: call me back',
  'price-request': 'Store form: request a price',
  other: 'Store form',
};

/** "24 Sep" from "2026-09-24". */
function shortDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
}

/** LMS > Reports: is the team doing well? Per agent, source, stage, lost reason and hour (LMS-plan.md Step 11). */
export default function ReportsPage() {
  return <LmsPage title="Reports">{(me) => <Report me={me} />}</LmsPage>;
}

function Report({ me }: { me: LmsMe }) {
  const [params, setParams] = useSearchParams();
  const range = (RANGES.find((r) => r.id === params.get('range'))?.id ?? '30D') as LmsReportRange;
  const agent = me.isManager ? (params.get('agent') ?? '') : '';
  const set = (key: string, value: string | undefined) =>
    setParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      return p;
    });

  const report = useQuery({
    queryKey: ['lms', 'reports', range, agent],
    queryFn: () => lmsApi.report(range, agent || undefined),
    placeholderData: keepPreviousData,
  });
  const team = useLmsAgents(me.isManager);
  const data = report.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Period" className="inline-flex rounded-md border border-lms-line bg-lms-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => set('range', r.id === '30D' ? undefined : r.id)}
              className={`h-8 rounded px-3 text-sm font-medium ${range === r.id ? 'bg-lms-ink text-white' : 'text-lms-muted hover:text-lms-ink'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {me.isManager && (
          <LmsSelect aria-label="Agent" className="!w-auto" value={agent} onChange={(e) => set('agent', e.target.value || undefined)}>
            <option value="">Whole team</option>
            {(team.data ?? []).map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.name}
                {a.userId === me.userId ? ' (you)' : ''}
              </option>
            ))}
          </LmsSelect>
        )}
        {data && (
          <p className="text-sm text-lms-muted sm:ml-auto">
            {shortDay(data.period.from)} to {shortDay(data.period.to)}, compared with {shortDay(data.period.prevFrom)} to {shortDay(data.period.prevTo)}
          </p>
        )}
      </div>

      {report.isPending ? (
        <Panel>
          <p className="text-sm text-lms-muted">Loading…</p>
        </Panel>
      ) : report.isError ? (
        <Panel>
          <p className="text-sm">{apiErrorMessage(report.error, "The report couldn't load. Refresh the page to try again.")}</p>
        </Panel>
      ) : data ? (
        <ReportBody me={me} data={data} />
      ) : null}
    </div>
  );
}

function ReportBody({ me, data }: { me: LmsMe; data: LmsReport }) {
  const { team } = data;
  const nothing = !team.newLeads.current && !team.contacts.current && !team.won.current && !team.openBacklog;
  if (nothing) {
    return (
      <Panel>
        <EmptyState
          title="Nothing to report for this period"
          text="Reports fill in once leads come in and your team starts contacting them: calls made, reach rate, wins and how fast each lead got a call."
        />
      </Panel>
    );
  }
  const whose = data.agent ? `${data.agent.name}'s` : me.isManager ? "The team's" : 'Your';
  const totalLost = data.lostReasons.reduce((n, r) => n + r.leads, 0);
  const totalCalls = data.outcomes.reduce((n, r) => n + r.calls, 0);
  const busiest = data.byHour.filter((h) => h.calls >= 5).sort((a, b) => (b.reachRate ?? 0) - (a.reachRate ?? 0))[0];

  return (
    <>
      <Strip>
        <StripCell label="New leads" value={team.newLeads} />
        <StripCell label="Contacts made" value={team.contacts} />
        <StripCell label="Reach rate" value={team.reachRate} kind="percent" />
        <StripCell label="Win rate" value={team.winRate} kind="percent" />
        <StripCell label="Time to first contact" value={team.firstContactMinutes} display={formatMinutes} lowerIsBetter />
        <StripCell
          label="Open now"
          value={team.openBacklog}
          hint={team.staleNow ? <span className="font-medium text-lms-alert">{team.staleNow} stale</span> : 'none stale'}
        />
      </Strip>

      <Block title={data.agent || !me.isManager ? `${whose} numbers` : 'Per agent'} subtitle="Won and lost count leads closed in the period. Delivered: of the orders they confirmed on a call, how many were delivered rather than returned.">
        <AgentTable rows={data.agents} />
      </Block>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Where leads come from" subtitle="Leads that came in during the period, and how they ended.">
          {data.sources.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr className="text-left text-lms-muted">
                    <Th className="pl-5">Came from</Th>
                    <Th className="text-right">Leads</Th>
                    <Th className="text-right">Win rate</Th>
                    <Th className="pr-5 text-right">Value won</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((s) => (
                    <tr key={s.key}>
                      <Td className="pl-5">{s.form ? FORM_WORDS[s.form] : LMS_SOURCE_LABELS[s.source]}</Td>
                      <Td className="text-right">{s.leads.toLocaleString('en-US')}</Td>
                      <Td className="text-right">{formatPct(s.winRate)}</Td>
                      <Td className="pr-5 text-right">{s.valueWon ? formatMoney(s.valueWon) : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-sm text-lms-muted">No leads came in during this period.</p>
          )}
        </Block>

        <Block title="Stage flow" subtitle="How many of the period's leads reached each stage, and how long they stayed before moving on. Imports aren't counted.">
          <BarRows
            empty="No leads came in during this period."
            rows={data.stageFlow.map((s) => ({
              key: s.stage,
              label: (
                <>
                  <StageMark stage={s.stage} label={me.stageLabels[s.stage]} />
                  {s.avgMinutes != null && <span className="ml-2 text-lms-muted">avg {formatMinutes(s.avgMinutes)} here</span>}
                </>
              ),
              value: s.leads,
            }))}
          />
        </Block>

        <Block title="Why leads were lost" subtitle="Leads closed as lost in the period.">
          <BarRows
            empty="No lost leads in this period."
            rows={data.lostReasons.map((r) => ({
              key: r.reason,
              label: r.reason,
              value: r.leads,
              display: `${r.leads.toLocaleString('en-US')} (${formatPct((r.leads / totalLost) * 100)})`,
            }))}
          />
        </Block>

        <Block title="Call results" subtitle="Every call logged on the Call Desk in the period.">
          <BarRows
            empty="No calls logged in this period."
            rows={data.outcomes.map((o) => ({
              key: o.outcome,
              label: OUTCOME_WORDS[o.outcome] ?? o.outcome,
              value: o.calls,
              display: `${o.calls.toLocaleString('en-US')} (${formatPct((o.calls / totalCalls) * 100)})`,
            }))}
          />
        </Block>
      </div>

      <Block
        title="When people pick up"
        subtitle={
          busiest
            ? `Share of calls answered by hour of the day (Dhaka time). Best hour so far: ${busiest.hour % 12 || 12} ${busiest.hour < 12 ? 'am' : 'pm'}, ${formatPct(busiest.reachRate)}.`
            : 'Share of calls answered by hour of the day (Dhaka time).'
        }
      >
        {totalCalls ? (
          <>
            <HourChart hours={data.byHour} />
            <HourTable hours={data.byHour} />
          </>
        ) : (
          <p className="py-6 text-sm text-lms-muted">No calls logged in this period.</p>
        )}
      </Block>
    </>
  );
}

function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`h-9 whitespace-nowrap border-b border-lms-line px-3 font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`h-9 whitespace-nowrap border-b border-lms-line px-3 tabular-nums ${className}`}>{children}</td>;
}

function AgentTable({ rows }: { rows: LmsReport['agents'] }) {
  if (!rows.length) return <p className="py-6 text-sm text-lms-muted">Nobody on the team yet.</p>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className="text-left text-lms-muted">
            <Th className="pl-5">Agent</Th>
            <Th className="text-right">Leads worked</Th>
            <Th className="text-right">Contacts</Th>
            <Th className="text-right">Reach</Th>
            <Th className="text-right">Won</Th>
            <Th className="text-right">Lost</Th>
            <Th className="text-right">Win rate</Th>
            <Th className="text-right">First contact</Th>
            <Th className="text-right">Overdue tasks</Th>
            <Th className="pr-5 text-right">Delivered</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId}>
              <Td className="pl-5 font-medium">{r.name}</Td>
              <Td className="text-right">{r.leadsHandled}</Td>
              <Td className="text-right">{r.contacts}</Td>
              <Td className="text-right">{formatPct(r.reachRate)}</Td>
              <Td className="text-right">{r.won}</Td>
              <Td className="text-right">{r.lost}</Td>
              <Td className="text-right">{formatPct(r.winRate)}</Td>
              <Td className="text-right">{formatMinutes(r.firstContactMinutes)}</Td>
              <Td className={`text-right ${r.overdueTasks ? 'font-medium text-lms-alert' : ''}`}>{r.overdueTasks}</Td>
              <Td className="pr-5 text-right">
                {r.deliveredRate == null ? (
                  <span className="text-lms-muted">{r.confirmedOrders ? `${r.confirmedOrders} not finished` : '—'}</span>
                ) : (
                  <>
                    {formatPct(r.deliveredRate)}
                    <span className="ml-1 text-lms-muted">
                      ({r.delivered} of {r.delivered + r.returned})
                    </span>
                  </>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The hour chart's numbers as a table, for anyone who can't read the chart. */
function HourTable({ hours }: { hours: LmsReport['byHour'] }) {
  const [open, setOpen] = useState(false);
  const withCalls = hours.filter((h) => h.calls);
  return (
    <details className="mt-3 text-sm" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-lms-muted hover:text-lms-ink">Show as a table</summary>
      <table className="mt-2 w-full max-w-md text-[13px]">
        <thead>
          <tr className="text-left text-lms-muted">
            <Th className="pl-0">Hour</Th>
            <Th className="text-right">Calls</Th>
            <Th className="text-right">Picked up</Th>
            <Th className="text-right">Reach</Th>
          </tr>
        </thead>
        <tbody>
          {withCalls.map((h) => (
            <tr key={h.hour}>
              <Td className="pl-0">
                {String(h.hour).padStart(2, '0')}:00 to {String((h.hour + 1) % 24).padStart(2, '0')}:00
              </Td>
              <Td className="text-right">{h.calls}</Td>
              <Td className="text-right">{h.reached}</Td>
              <Td className="text-right">{formatPct(h.reachRate)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
