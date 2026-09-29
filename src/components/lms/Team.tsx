import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SelectHTMLAttributes } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsMe } from '../../lib/lmsApi';
import { LmsSelect } from './ui';

/*
 * The team pieces several LMS screens share (LMS-plan.md Step 6): who's on
 * the team, the caller's On shift / Away switch, and a picker for who
 * gets a lead.
 */

export const LMS_AGENTS_KEY = ['lms', 'agents'] as const;

/** Owner + staff by name (everyone can read this; the switches are Settings > Team). */
export function useLmsAgents(enabled = true) {
  return useQuery({ queryKey: LMS_AGENTS_KEY, queryFn: lmsApi.agents, enabled, staleTime: 60_000 });
}

/**
 * On shift / Away. Away means no new leads are shared to you (your tasks
 * stay yours); each switch also writes your attendance.
 */
export function ShiftSwitch({ me, className = '' }: { me: LmsMe; className?: string }) {
  const queryClient = useQueryClient();
  const set = useMutation({
    mutationFn: (available: boolean) => lmsApi.setShift(available),
    onSuccess: ({ available }) => {
      toast.success(available ? "You're on shift. New leads can come to you." : "You're away. New leads go to others.");
      queryClient.invalidateQueries({ queryKey: ['lms', 'me'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Your shift didn't change. Try again.")),
  });

  return (
    <div role="group" aria-label="Your shift" className={`inline-flex rounded-md border border-lms-line bg-lms-surface p-0.5 ${className}`}>
      {[
        { value: true, label: 'On shift' },
        { value: false, label: 'Away' },
      ].map((o) => {
        const on = me.available === o.value;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={on}
            disabled={set.isPending || on}
            onClick={() => set.mutate(o.value)}
            className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium disabled:cursor-default ${
              on ? 'bg-lms-ink text-white' : 'text-lms-muted hover:text-lms-ink'
            }`}
          >
            {o.value && <span aria-hidden className={`h-2 w-2 rounded-full ${on ? 'bg-lms-call' : 'bg-lms-line'}`} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Who gets a lead. `extra` puts "Share out in turn" / "Me" / "Unassigned
 * pool" choices above the team; values are "AUTO", "ME", "POOL" or a userId.
 */
export function AgentSelect({
  me,
  extra,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { me: LmsMe; extra: ('AUTO' | 'ME' | 'POOL')[] }) {
  const agents = useLmsAgents();
  const labels = { AUTO: 'Share out in turn', ME: 'Me', POOL: 'Unassigned pool' };
  return (
    <LmsSelect {...props}>
      {extra.map((e) => (
        <option key={e} value={e}>
          {labels[e]}
        </option>
      ))}
      {(agents.data ?? [])
        .filter((a) => !(extra.includes('ME') && a.userId === me.userId))
        .map((a) => (
          <option key={a.userId} value={a.userId}>
            {a.name}
            {a.isOwner ? ' (owner)' : ''}
          </option>
        ))}
    </LmsSelect>
  );
}
