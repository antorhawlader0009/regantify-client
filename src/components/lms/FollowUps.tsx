import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { LMS_TASK_TYPE_LABELS, lmsApi, type LmsLeadDetail, type LmsMe, type LmsTask, type LmsTaskType } from '../../lib/lmsApi';
import { DuePicker } from './DuePicker';
import { formatDateTime } from './format';
import { AgentSelect } from './Team';
import { LmsButton, LmsInput, LmsSelect } from './ui';

/** Short words for a task's origin, shown next to it. */
export function taskOrigin(t: Pick<LmsTask, 'isAutoRetry' | 'reopensLead'>): string | null {
  if (t.reopensLead) return 'reopens the lead';
  if (t.isAutoRetry) return 'retry';
  return null;
}

/**
 * The drawer's follow-ups (LMS-plan.md Step 7): the lead's open tasks,
 * soonest first, with a tick to finish one, and a small form to plan the
 * next one. The next step is always a dated task, never a stage.
 */
export function FollowUps({ lead, me, onChanged }: { lead: LmsLeadDetail; me: LmsMe; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const key = ['lms', 'lead-tasks', lead.id];
  const tasks = useQuery({ queryKey: key, queryFn: () => lmsApi.leadTasks(lead.id) });
  const [adding, setAdding] = useState(false);
  const isClosed = lead.stage === 'WON' || lead.stage === 'LOST';

  const done = (list: LmsTask[]) => {
    queryClient.setQueryData(key, list);
    queryClient.invalidateQueries({ queryKey: ['lms', 'tasks'] });
    queryClient.invalidateQueries({ queryKey: ['lms', 'notifications'] });
    onChanged();
  };
  const complete = useMutation({
    mutationFn: lmsApi.completeTask,
    onSuccess: (list) => {
      toast.success('Done');
      done(list);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });
  const remove = useMutation({
    mutationFn: lmsApi.removeTask,
    onSuccess: done,
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't removed. Try again.")),
  });

  const open = tasks.data ?? [];
  if (isClosed && !open.length) return null;

  return (
    <section className="border-b border-lms-line px-5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium">Follow-ups</h3>
        {!isClosed && !adding && (
          <LmsButton variant="quiet" className="-mr-3" onClick={() => setAdding(true)}>
            Add follow-up
          </LmsButton>
        )}
      </div>

      {open.length === 0 && !adding && <p className="mt-1 text-sm text-lms-muted">Nothing planned. Add a follow-up so this lead doesn't go quiet.</p>}

      {open.length > 0 && (
        <ul className="mt-2 space-y-2">
          {open.map((t) => {
            const overdue = new Date(t.dueAt).getTime() < Date.now();
            const origin = taskOrigin(t);
            return (
              <li key={t.id} className="flex items-start gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => complete.mutate(t.id)}
                  disabled={complete.isPending}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-lms-line text-transparent hover:border-lms-call hover:text-lms-call"
                  aria-label={`Mark ${LMS_TASK_TYPE_LABELS[t.type]} as done`}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{LMS_TASK_TYPE_LABELS[t.type]}</span>
                  <span className={`ml-2 tabular-nums ${overdue ? 'font-medium text-lms-alert' : 'text-lms-muted'}`}>
                    {overdue ? 'overdue, ' : ''}
                    {formatDateTime(t.dueAt)}
                  </span>
                  {origin && <span className="ml-2 text-xs text-lms-muted">{origin}</span>}
                  {t.note && <span className="block break-words text-lms-muted">{t.note}</span>}
                  {me.isManager && t.assignee && t.assignee.id !== me.userId && <span className="block text-xs text-lms-muted">for {t.assignee.name}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(t.id)}
                  disabled={remove.isPending}
                  className="rounded p-1 text-lms-muted hover:text-lms-ink"
                  aria-label={`Remove ${LMS_TASK_TYPE_LABELS[t.type]}`}
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && <AddFollowUp lead={lead} me={me} onDone={(list) => { setAdding(false); if (list) done(list); }} />}
    </section>
  );
}

function AddFollowUp({ lead, me, onDone }: { lead: LmsLeadDetail; me: LmsMe; onDone: (list?: LmsTask[]) => void }) {
  const [type, setType] = useState<LmsTaskType>('CALL');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState(lead.assignedTo?.id ?? me.userId);
  const create = useMutation({
    mutationFn: () =>
      lmsApi.createTask(lead.id, {
        type,
        dueAt: new Date(due).toISOString(),
        note: note.trim() || undefined,
        ...(me.isManager ? { assigneeId: assignee } : {}),
      }),
    onSuccess: (list) => {
      toast.success('Follow-up planned');
      onDone(list);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The follow-up wasn't saved. Try again.")),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (due) create.mutate();
      }}
      className="mt-3 space-y-3 rounded-md bg-lms-page p-3"
    >
      <div className="flex flex-wrap gap-2">
        <LmsSelect aria-label="What" value={type} onChange={(e) => setType(e.target.value as LmsTaskType)} className="!w-auto">
          {(Object.keys(LMS_TASK_TYPE_LABELS) as LmsTaskType[]).map((t) => (
            <option key={t} value={t}>
              {LMS_TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </LmsSelect>
        {me.isManager && <AgentSelect me={me} extra={[]} aria-label="For" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="!w-auto" />}
      </div>
      <DuePicker label="When" value={due} onChange={setDue} />
      <LmsInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional), e.g. send the size chart first" />
      <div className="flex gap-2">
        <LmsButton type="submit" variant="primary" disabled={!due || create.isPending}>
          {create.isPending ? 'Saving…' : 'Plan it'}
        </LmsButton>
        <LmsButton variant="quiet" onClick={() => onDone()}>
          Cancel
        </LmsButton>
      </div>
    </form>
  );
}
