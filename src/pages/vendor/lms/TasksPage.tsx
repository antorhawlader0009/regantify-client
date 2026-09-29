import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Phone } from 'lucide-react';
import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';
import { LeadDrawer } from '../../../components/lms/LeadDrawer';
import { taskOrigin } from '../../../components/lms/FollowUps';
import { AgentSelect } from '../../../components/lms/Team';
import { LmsButton, StageMark } from '../../../components/lms/ui';
import { formatDateTime, formatPhone, minutesSince } from '../../../components/lms/format';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { LMS_TASK_TYPE_LABELS, lmsApi, type LmsMe, type LmsTask, type LmsTaskView } from '../../../lib/lmsApi';

/*
 * LMS > Tasks (LMS-plan.md Step 7): every callback, retry and follow-up,
 * as Overdue / Today / Upcoming / Done. Tick to finish one (it goes on the
 * lead's timeline). Managers can switch to everyone's list or one
 * person's (the old LMS's "view as agent"). View and person are in the URL.
 */

const VIEWS: { id: LmsTaskView; label: string; empty: [string, string] }[] = [
  { id: 'OVERDUE', label: 'Overdue', empty: ['Nothing overdue', 'Every callback is on time.'] },
  { id: 'TODAY', label: 'Today', empty: ['Nothing else due today', 'Callbacks and retries for later today show up here.'] },
  { id: 'UPCOMING', label: 'Upcoming', empty: ['Nothing planned yet', 'Plan a follow-up from any lead, or pick "Call later" on the Call Desk.'] },
  { id: 'DONE', label: 'Done', empty: ['Nothing finished yet', 'Tasks you tick off in the last 30 days show up here.'] },
];

export const LMS_TASK_COUNTS_KEY = ['lms', 'tasks', 'counts'] as const;

export default function TasksPage() {
  return <LmsPage title="Tasks">{(me) => <Tasks me={me} />}</LmsPage>;
}

function Tasks({ me }: { me: LmsMe }) {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'TODAY') as LmsTaskView;
  const who = me.isManager ? (params.get('who') ?? 'ME') : 'ME';
  const page = Number(params.get('page') ?? '1') || 1;
  const leadId = params.get('lead');
  const set = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value === null) p.delete(key);
        else p.set(key, value);
        if (key !== 'page' && key !== 'lead') p.delete('page');
        return p;
      },
      { replace: key === 'lead' && value === null },
    );

  const counts = useQuery({ queryKey: [...LMS_TASK_COUNTS_KEY, who], queryFn: () => lmsApi.taskCounts(who), refetchInterval: 60_000 });
  const list = useQuery({
    queryKey: ['lms', 'tasks', 'list', view, who, page],
    queryFn: () => lmsApi.tasks({ view, who, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const complete = useMutation({
    mutationFn: lmsApi.completeTask,
    onSuccess: () => {
      toast.success('Done');
      queryClient.invalidateQueries({ queryKey: ['lms', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'notifications'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });

  const current = VIEWS.find((v) => v.id === view)!;
  const tasks = list.data?.tasks ?? [];

  return (
    <>
      {me.isManager && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Whose tasks" className="inline-flex rounded-md border border-lms-line bg-lms-surface p-0.5">
            {[
              { id: 'ME', label: 'Mine' },
              { id: 'ALL', label: 'Everyone' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={who === o.id}
                onClick={() => set('who', o.id === 'ME' ? null : o.id)}
                className={`h-9 rounded px-3 text-sm font-medium ${who === o.id ? 'bg-lms-ink text-white' : 'text-lms-muted hover:text-lms-ink'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <AgentSelect
            me={me}
            extra={['POOL']}
            aria-label="One person's tasks"
            placeholder="View one person…"
            className="!w-auto"
            value={who === 'ME' || who === 'ALL' ? '' : who}
            onChange={(e) => set('who', e.target.value || null)}
          />
        </div>
      )}

      {/* The four lists as one joined strip, like the Leads stages. */}
      <div role="tablist" aria-label="When" className="mb-4 overflow-x-auto rounded-[10px] border border-lms-line bg-lms-surface">
        <div className="grid min-w-[480px] grid-cols-4 divide-x divide-lms-line">
          {VIEWS.map((v) => {
            const active = v.id === view;
            const n = v.id === 'DONE' ? null : counts.data?.[v.id];
            const alarm = v.id === 'OVERDUE' && !!n;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => set('view', v.id === 'TODAY' ? null : v.id)}
                className={`px-4 pb-3 pt-2.5 text-left ${active ? 'shadow-[inset_0_-2px_0_var(--lms-ink)]' : 'hover:bg-lms-page'}`}
              >
                <span className={`block text-[13px] ${active ? 'font-medium text-lms-ink' : 'text-lms-muted'}`}>{v.label}</span>
                <span className={`mt-1 block text-xl font-semibold leading-tight tabular-nums ${alarm ? 'text-lms-alert' : ''}`}>
                  {v.id === 'DONE' ? '30 days' : (n ?? '–')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Panel className="!p-0 overflow-hidden">
        {list.isPending ? (
          <p className="p-5 text-sm text-lms-muted">Loading…</p>
        ) : list.isError ? (
          <p className="p-5 text-sm">{apiErrorMessage(list.error, "Tasks couldn't load. Refresh the page to try again.")}</p>
        ) : tasks.length === 0 ? (
          <div className="px-5">
            <EmptyState title={current.empty[0]} text={current.empty[1]} />
          </div>
        ) : (
          <ul className="divide-y divide-lms-line">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                me={me}
                showWho={who !== 'ME'}
                busy={complete.isPending}
                onDone={() => complete.mutate(t.id)}
                onOpen={() => set('lead', t.lead.id)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {list.data && list.data.total > list.data.perPage && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="tabular-nums text-lms-muted">
            {(page - 1) * list.data.perPage + 1}–{Math.min(page * list.data.perPage, list.data.total)} of {list.data.total}
          </span>
          <div className="flex gap-2">
            <LmsButton disabled={page <= 1} onClick={() => set('page', String(page - 1))}>
              Previous
            </LmsButton>
            <LmsButton disabled={page * list.data.perPage >= list.data.total} onClick={() => set('page', String(page + 1))}>
              Next
            </LmsButton>
          </div>
        </div>
      )}

      <LeadDrawer
        leadId={leadId}
        me={me}
        onClose={() => {
          set('lead', null);
          queryClient.invalidateQueries({ queryKey: ['lms', 'tasks'] });
        }}
      />
    </>
  );
}

/** "40 min late", "3 h late", "2 days late". */
function lateWords(iso: string): string {
  const min = minutesSince(iso);
  if (min < 60) return `${Math.max(1, min)} min late`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h late`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} late`;
}

function TaskRow({
  task,
  me,
  showWho,
  busy,
  onDone,
  onOpen,
}: {
  task: LmsTask;
  me: LmsMe;
  showWho: boolean;
  busy: boolean;
  onDone: () => void;
  onOpen: () => void;
}) {
  const overdue = !task.doneAt && new Date(task.dueAt).getTime() < Date.now();
  const origin = taskOrigin(task);
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      {task.doneAt ? (
        <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lms-call text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onDone}
          aria-label={`Mark ${LMS_TASK_TYPE_LABELS[task.type]} with ${task.lead.name} as done`}
          className="group mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-lms-line text-transparent hover:border-lms-call hover:text-lms-call"
        >
          <Check size={14} strokeWidth={3} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{LMS_TASK_TYPE_LABELS[task.type]}</span>
          <button type="button" onClick={onOpen} className="font-medium underline-offset-2 hover:underline">
            {task.lead.name}
          </button>
          <span className="tabular-nums text-lms-muted">{formatPhone(task.lead.phone)}</span>
          {origin && <span className="text-xs text-lms-muted">{origin}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-lms-muted">
          <span className={`tabular-nums ${overdue ? 'font-medium text-lms-alert' : ''}`}>
            {task.doneAt ? `Done ${formatDateTime(task.doneAt)}` : overdue ? `${formatDateTime(task.dueAt)}, ${lateWords(task.dueAt)}` : formatDateTime(task.dueAt)}
          </span>
          <StageMark stage={task.lead.stage} label={me.stageLabels[task.lead.stage]} />
          {task.lead.order && <span>Order #{task.lead.order.invoiceNumber}</span>}
          {showWho && <span>{task.assignee ? task.assignee.name : 'Unassigned'}</span>}
        </p>
        {task.note && <p className="mt-1 break-words text-sm">{task.note}</p>}
      </div>

      {!task.doneAt && (
        <a
          href={`tel:${task.lead.phone}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-lms-line px-3 text-sm font-medium hover:bg-lms-page"
          aria-label={`Call ${task.lead.name}`}
        >
          <Phone size={15} /> <span className="hidden sm:inline">Call</span>
        </a>
      )}
    </li>
  );
}
