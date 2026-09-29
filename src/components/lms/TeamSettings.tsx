import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { downloadCsv, toCsv } from '../../lib/csv';
import {
  LMS_ATTENDANCE_LABELS,
  lmsApi,
  type LmsAttendanceRow,
  type LmsAttendanceStatus,
  type LmsMe,
  type LmsRosterAgent,
  type LmsSettings,
} from '../../lib/lmsApi';
import { Panel } from './LmsPage';
import { LMS_AGENTS_KEY } from './Team';
import { LmsButton, LmsInput, LmsSelect } from './ui';

/*
 * LMS > Settings > Team and Attendance (LMS-plan.md Step 6). Nothing here
 * needs setting up: everyone on the Staff page takes leads, may take from
 * the pool and starts on shift; the owner is a lead manager. These only adjust.
 */

const ROSTER_KEY = ['lms', 'roster'] as const;

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <Panel id={id} className="scroll-mt-20">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-lms-muted">{text}</p>
      <div className="mt-5">{children}</div>
    </Panel>
  );
}

// -------------------------------------------------------------------- team

export function TeamSection({ me, settings }: { me: LmsMe; settings: LmsSettings }) {
  const queryClient = useQueryClient();
  const roster = useQuery({ queryKey: ROSTER_KEY, queryFn: lmsApi.roster });
  const update = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Parameters<typeof lmsApi.updateAgent>[1] }) => lmsApi.updateAgent(userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROSTER_KEY });
      queryClient.invalidateQueries({ queryKey: LMS_AGENTS_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });

  return (
    <Section
      id="team"
      title="Team"
      text="Everyone on your Staff page, and you. New leads are shared out in turn among the people who take leads and are on shift. People with a daily limit stop getting new leads once they reach it."
    >
      <SharingSettings settings={settings} />

      {roster.isPending ? (
        <p className="mt-6 text-sm text-lms-muted">Loading…</p>
      ) : roster.isError ? (
        <p className="mt-6 text-sm">{apiErrorMessage(roster.error, "The team couldn't load.")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-lms-line text-left text-[13px] text-lms-muted">
                <th className="py-2 pr-3 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Takes new leads</th>
                <th className="px-3 py-2 font-medium">Lead manager</th>
                <th className="px-3 py-2 font-medium">Can take from the pool</th>
                <th className="px-3 py-2 font-medium">Daily limit</th>
                <th className="py-2 pl-3 font-medium">Now</th>
              </tr>
            </thead>
            <tbody>
              {roster.data.map((a) => (
                <AgentRow key={a.userId} agent={a} me={me} busy={update.isPending} onChange={(body) => update.mutate({ userId: a.userId, body })} />
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-lms-muted">
            Lead managers see and change every lead and these settings. Only the store owner can choose them. Add people on the Staff page.
          </p>
        </div>
      )}
    </Section>
  );
}

function Check({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-[var(--lms-ink)] disabled:opacity-40"
    />
  );
}

function AgentRow({
  agent,
  me,
  busy,
  onChange,
}: {
  agent: LmsRosterAgent;
  me: LmsMe;
  busy: boolean;
  onChange: (body: Parameters<typeof lmsApi.updateAgent>[1]) => void;
}) {
  const [cap, setCap] = useState(agent.dailyCap?.toString() ?? '');
  const saveCap = () => {
    const next = cap.trim() === '' ? null : Number(cap);
    if (next !== null && (!Number.isInteger(next) || next < 1)) {
      toast.error('A daily limit is a whole number of leads, 1 or more. Leave it empty for no limit.');
      setCap(agent.dailyCap?.toString() ?? '');
      return;
    }
    if (next !== agent.dailyCap) onChange({ dailyCap: next });
  };

  return (
    <tr className="border-b border-lms-line last:border-0">
      <td className="py-3 pr-3">
        <span className="block font-medium">
          {agent.name}
          {agent.userId === me.userId && <span className="font-normal text-lms-muted"> (you)</span>}
        </span>
        <span className="block text-[13px] text-lms-muted">{agent.isOwner ? 'Store owner' : (agent.staffRole ?? 'Staff')}</span>
      </td>
      <td className="px-3 py-3">
        <Check label={`${agent.name} takes new leads`} checked={agent.isAgent} disabled={busy} onChange={(v) => onChange({ isAgent: v })} />
      </td>
      <td className="px-3 py-3">
        <Check
          label={`${agent.name} is a lead manager`}
          checked={agent.isManager}
          disabled={busy || agent.isOwner || !me.isOwner}
          onChange={(v) => onChange({ isManager: v })}
        />
      </td>
      <td className="px-3 py-3">
        <Check label={`${agent.name} can take from the pool`} checked={agent.canPull} disabled={busy} onChange={(v) => onChange({ canPull: v })} />
      </td>
      <td className="px-3 py-3">
        <LmsInput
          type="number"
          min={1}
          aria-label={`${agent.name}'s daily limit`}
          value={cap}
          placeholder="No limit"
          onChange={(e) => setCap(e.target.value)}
          onBlur={saveCap}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="!w-24 tabular-nums"
        />
      </td>
      <td className="py-3 pl-3 text-[13px]">
        <span className={`inline-flex items-center gap-1.5 ${agent.available ? '' : 'text-lms-muted'}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${agent.available ? 'bg-lms-call' : 'bg-lms-line'}`} />
          {agent.available ? 'On shift' : 'Away'}
        </span>
        <span className="block tabular-nums text-lms-muted">
          {agent.assignedToday} today{agent.dailyCap ? ` of ${agent.dailyCap}` : ''}
        </span>
      </td>
    </tr>
  );
}

function SharingSettings({ settings }: { settings: LmsSettings }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(settings.autoAssign);
  const [reclaim, setReclaim] = useState(settings.reclaimAfterMinutes?.toString() ?? '');
  const dirty = mode !== settings.autoAssign || reclaim.trim() !== (settings.reclaimAfterMinutes?.toString() ?? '');
  const save = useMutation({
    mutationFn: () => {
      const minutes = reclaim.trim() === '' ? null : Number(reclaim);
      return lmsApi.updateSettings({ autoAssign: mode, reclaimAfterMinutes: minutes });
    },
    onSuccess: () => {
      toast.success('Sharing saved');
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });
  const submit = () => {
    const minutes = reclaim.trim() === '' ? null : Number(reclaim);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 5 || minutes > 10080)) {
      toast.error('Pick between 5 minutes and 7 days (10080 minutes), or leave it empty.');
      return;
    }
    save.mutate();
  };

  return (
    <div className="space-y-4 rounded-md bg-lms-page p-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">New leads</legend>
        {[
          { value: 'ROUND_ROBIN' as const, label: 'Share them out in turn', text: 'Each new lead goes to the next person on shift.' },
          { value: 'OFF' as const, label: 'Keep them in the pool', text: 'They wait unassigned; anyone who can take from the pool picks them up on the Call Desk.' },
        ].map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-3 py-1.5 text-sm">
            <input type="radio" name="lms-sharing" className="mt-1 accent-[var(--lms-ink)]" checked={mode === o.value} onChange={() => setMode(o.value)} />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-lms-muted">{o.text}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Give a new lead back to the pool if nobody calls it within
        <LmsInput type="number" min={5} value={reclaim} onChange={(e) => setReclaim(e.target.value)} placeholder="Never" className="!w-24 tabular-nums" />
        minutes
      </label>
      <LmsButton variant="primary" disabled={!dirty || save.isPending} onClick={submit}>
        {save.isPending ? 'Saving…' : 'Save sharing'}
      </LmsButton>
    </div>
  );
}

// -------------------------------------------------------------- attendance

function dhakaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

const STATUSES = Object.keys(LMS_ATTENDANCE_LABELS) as LmsAttendanceStatus[];

export function AttendanceSection() {
  const [date, setDate] = useState(dhakaToday());
  const [month, setMonth] = useState(dhakaToday().slice(0, 7));
  const [editing, setEditing] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const key = ['lms', 'attendance', date];
  const day = useQuery({ queryKey: key, queryFn: () => lmsApi.attendanceDay(date) });

  const exportMonth = useMutation({
    mutationFn: () => lmsApi.attendanceMonth(month),
    onSuccess: (rows) => {
      if (!rows.length) {
        toast.info('Nothing recorded in that month yet.');
        return;
      }
      downloadCsv(
        `attendance-${month}.csv`,
        toCsv(
          ['Name', 'Date', 'In', 'Out', 'Status', 'Remark'],
          rows.map((r) => [r.name, r.date, r.in ?? '', r.out ?? (r.onShiftNow ? 'on shift' : ''), r.status ? LMS_ATTENDANCE_LABELS[r.status] : '', r.remark ?? '']),
        ),
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The month couldn't be exported. Try again.")),
  });

  return (
    <Section
      id="attendance"
      title="Attendance"
      text="On shift and Away write in and out times by themselves. Pick a day to see everyone, fix a day, or mark leave and holidays. Export a whole month for payroll."
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium">Day</span>
          <LmsInput type="date" value={date} max={dhakaToday()} onChange={(e) => e.target.value && setDate(e.target.value)} className="!w-auto tabular-nums" />
        </label>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Month</span>
            <LmsInput type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="!w-auto tabular-nums" />
          </label>
          <LmsButton disabled={exportMonth.isPending} onClick={() => exportMonth.mutate()}>
            {exportMonth.isPending ? 'Exporting…' : 'Export CSV'}
          </LmsButton>
        </div>
      </div>

      {day.isPending ? (
        <p className="mt-5 text-sm text-lms-muted">Loading…</p>
      ) : day.isError ? (
        <p className="mt-5 text-sm">{apiErrorMessage(day.error, "Attendance couldn't load.")}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-lms-line text-left text-[13px] text-lms-muted">
                <th className="py-2 pr-3 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">In</th>
                <th className="px-3 py-2 font-medium">Out</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Remark</th>
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody>
              {day.data.map((row) =>
                editing === row.userId ? (
                  <AttendanceEditRow
                    key={row.userId}
                    row={row}
                    date={date}
                    onDone={(rows) => {
                      if (rows) queryClient.setQueryData(key, rows);
                      setEditing(null);
                    }}
                  />
                ) : (
                  <tr key={row.userId} className="border-b border-lms-line last:border-0">
                    <td className="py-3 pr-3 font-medium">{row.name}</td>
                    <td className="px-3 py-3 tabular-nums">{row.in ?? <span className="text-lms-muted">–</span>}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {row.out ?? (row.onShiftNow ? <span className="text-lms-call">On shift now</span> : <span className="text-lms-muted">–</span>)}
                    </td>
                    <td className="px-3 py-3">
                      {row.status ? LMS_ATTENDANCE_LABELS[row.status] : <span className="text-lms-muted">No record</span>}
                      {row.manual && row.updatedByName && <span className="block text-xs text-lms-muted">set by {row.updatedByName}</span>}
                    </td>
                    <td className="px-3 py-3 text-lms-muted">{row.remark}</td>
                    <td className="py-3 pl-3 text-right">
                      <LmsButton variant="quiet" onClick={() => setEditing(row.userId)}>
                        {row.manual ? 'Change' : 'Set day'}
                      </LmsButton>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function AttendanceEditRow({ row, date, onDone }: { row: LmsAttendanceRow; date: string; onDone: (rows?: LmsAttendanceRow[]) => void }) {
  const [status, setStatus] = useState<LmsAttendanceStatus>(row.status ?? 'PRESENT');
  const [inTime, setInTime] = useState(row.manual ? (row.in ?? '') : '');
  const [outTime, setOutTime] = useState(row.manual ? (row.out ?? '') : '');
  const [remark, setRemark] = useState(row.remark ?? '');
  const save = useMutation({
    mutationFn: () =>
      lmsApi.saveAttendance({
        userId: row.userId,
        date,
        status,
        inTime: inTime || undefined,
        outTime: outTime || undefined,
        remark: remark.trim() || undefined,
      }),
    onSuccess: (rows) => {
      toast.success(`${row.name}'s day saved`);
      onDone(rows);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });
  const clear = useMutation({
    mutationFn: () => lmsApi.clearAttendance(row.userId, date),
    onSuccess: (rows) => onDone(rows),
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't changed. Try again.")),
  });

  return (
    <tr className="border-b border-lms-line bg-lms-page last:border-0">
      <td className="py-3 pl-2 pr-3 font-medium">{row.name}</td>
      <td className="px-3 py-3">
        <LmsInput type="time" aria-label="In time" value={inTime} onChange={(e) => setInTime(e.target.value)} className="!w-28 tabular-nums" />
      </td>
      <td className="px-3 py-3">
        <LmsInput type="time" aria-label="Out time" value={outTime} onChange={(e) => setOutTime(e.target.value)} className="!w-28 tabular-nums" />
      </td>
      <td className="px-3 py-3">
        <LmsSelect aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as LmsAttendanceStatus)} className="!w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LMS_ATTENDANCE_LABELS[s]}
            </option>
          ))}
        </LmsSelect>
      </td>
      <td className="px-3 py-3">
        <LmsInput aria-label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={200} placeholder="Optional" />
      </td>
      <td className="whitespace-nowrap py-3 pl-3 text-right">
        <LmsButton variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
          Save
        </LmsButton>
        {row.manual && (
          <LmsButton variant="quiet" disabled={clear.isPending} onClick={() => clear.mutate()} title="Go back to the times the shift switch wrote">
            Use shift times
          </LmsButton>
        )}
        <LmsButton variant="quiet" onClick={() => onDone()}>
          Cancel
        </LmsButton>
      </td>
    </tr>
  );
}
