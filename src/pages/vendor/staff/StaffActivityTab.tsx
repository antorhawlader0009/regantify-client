import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { EmptyState, StackedList } from '../../../components/ui/PageKit';
import { staffApi, type StaffActivityEntry, type StaffMember } from '../../../lib/staffApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** One log line in words (server action names: StaffService.log). */
function sentence(e: StaffActivityEntry): string {
  const actor = e.actorName || 'Someone';
  const who = e.staffName || 'a staff member';
  const m = e.meta ?? {};
  switch (e.action) {
    case 'STAFF_ADDED':
      return `${actor} added ${who} as ${str(m.role) || 'staff'}`;
    case 'STAFF_UPDATED':
      return `${actor} changed ${who}’s ${Array.isArray(m.changed) ? (m.changed as string[]).join(', ') : 'details'}`;
    case 'ROLE_CHANGED':
      return `${actor} changed ${who}’s role from ${str(m.from)} to ${str(m.to)}`;
    case 'STAFF_SUSPENDED':
      return `${actor} turned off ${who}’s account`;
    case 'STAFF_ACTIVATED':
      return `${actor} turned ${who}’s account back on`;
    case 'STAFF_REMOVED':
      return `${actor} removed ${who}${str(m.role) ? ` (${str(m.role)})` : ''}`;
    case 'PASSWORD_SHOWN':
      return `${actor} looked at ${who}’s password`;
    case 'PASSWORD_RESET':
      return `${actor} reset ${who}’s password`;
    case 'LOGIN_SMS_SENT':
      return `${who}’s login details were sent by SMS`;
    case 'ROLE_CREATED':
      return `${actor} made the custom role “${str(m.role)}”`;
    case 'ROLE_EDITED':
      return str(m.renamedFrom)
        ? `${actor} changed the custom role “${str(m.renamedFrom)}” and renamed it “${str(m.role)}”`
        : `${actor} changed the custom role “${str(m.role)}”`;
    case 'ROLE_DELETED':
      return `${actor} deleted the custom role “${str(m.role)}”`;
    default:
      return `${actor}: ${e.action.toLowerCase().replace(/_/g, ' ')}`;
  }
}

/** Staff > Activity (rule-plan.md Step 9): what happened to your team, newest first (last 100). */
export function StaffActivityTab({ members }: { members: StaffMember[] }) {
  const [person, setPerson] = useState('');
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['staff-activity', person],
    queryFn: () => staffApi.activity(person || undefined),
  });
  const staff = members.filter((m) => !m.isOwner);

  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-regantify-text">Activity</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Who was added, changed or turned off, and every look at a password.</p>
        </div>
        {staff.length > 0 && (
          <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Show activity for" className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
            <option value="">Everyone</option>
            {staff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-neutral-600">Couldn’t load the activity. Reload the page.</p>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-line">
          <EmptyState icon={History} title="Nothing yet" hint="Changes to your team show up here." />
        </div>
      ) : (
        <StackedList>
          {data.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2.5">
              <span className="text-sm text-regantify-text">{sentence(e)}</span>
              <time dateTime={e.createdAt} className="shrink-0 text-xs tabular-nums text-neutral-500">
                {formatDhakaDateTime(e.createdAt)}
              </time>
            </li>
          ))}
        </StackedList>
      )}
    </section>
  );
}
