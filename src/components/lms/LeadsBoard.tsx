import { useState, type KeyboardEvent } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { LMS_STAGES, lmsApi, type LmsLeadFilters, type LmsLeadRow, type LmsMe, type LmsStage } from '../../lib/lmsApi';
import { formatDateTime, formatMoney } from './format';
import { LmsButton, LmsDialog, StageMark } from './ui';

const PER_COLUMN = 50;
const OPEN: LmsStage[] = ['NEW', 'TRYING', 'IN_TALKS'];

/**
 * LMS > Leads, board view: one column per stage. Dragging a card goes
 * through the same rules as the drawer: Lost asks for a reason, and an
 * order's lead is confirmed or cancelled on the order, not here.
 */
export function LeadsBoard({ me, filters, onOpenLead }: { me: LmsMe; filters: LmsLeadFilters; onOpenLead: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<LmsLeadRow | null>(null);
  const [pendingLost, setPendingLost] = useState<LmsLeadRow | null>(null);
  const sensors = useSensors(
    // A short distance before a drag starts, so a click still opens the lead.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const { stage: _ignored, ...rest } = filters;
  const columns = useQueries({
    queries: LMS_STAGES.map((stage) => ({
      queryKey: ['lms', 'leads', 'board', stage, rest],
      queryFn: () => lmsApi.listLeads({ ...rest, stage, perPage: '50' }, 1),
    })),
  });

  const done = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });
  };
  const fail = (err: unknown) => toast.error(apiErrorMessage(err, "The lead didn't move. Try again."));

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: 'NEW' | 'TRYING' | 'IN_TALKS' }) => lmsApi.moveStage(id, stage),
    onSuccess: (lead) => done(`Moved to ${me.stageLabels[lead.stage]}`),
    onError: fail,
  });
  const close = useMutation({
    mutationFn: ({ id, outcome, reason }: { id: string; outcome: 'WON' | 'LOST'; reason?: string }) => lmsApi.closeLead(id, outcome, reason),
    onSuccess: (lead) => {
      setPendingLost(null);
      done(lead.stage === 'WON' ? 'Marked as won' : 'Marked as lost');
    },
    onError: fail,
  });

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.lead as LmsLeadRow) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const lead = e.active.data.current?.lead as LmsLeadRow | undefined;
    const target = e.over?.id as LmsStage | undefined;
    if (!lead || !target || target === lead.stage) return;

    if (OPEN.includes(target)) {
      move.mutate({ id: lead.id, stage: target as 'NEW' | 'TRYING' | 'IN_TALKS' });
      return;
    }
    if (lead.order) {
      toast.info(`This lead is order #${lead.order.invoiceNumber}. Confirm or cancel it on the order.`);
      return;
    }
    if (!OPEN.includes(lead.stage)) {
      toast.info('Move it back to an open stage first.');
      return;
    }
    if (target === 'WON') close.mutate({ id: lead.id, outcome: 'WON' });
    else setPendingLost(lead);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3">
          {LMS_STAGES.map((stage, i) => (
            <Column
              key={stage}
              stage={stage}
              label={me.stageLabels[stage]}
              query={columns[i]}
              onOpenLead={onOpenLead}
            />
          ))}
        </div>
      </div>

      <DragOverlay>{dragging && <Card lead={dragging} overlay />}</DragOverlay>

      <LmsDialog open={!!pendingLost} onOpenChange={(o) => !o && setPendingLost(null)} title="Why was it lost?">
        <div className="flex flex-wrap gap-2">
          {me.lostReasons.map((reason) => (
            <LmsButton
              key={reason}
              disabled={close.isPending}
              onClick={() => pendingLost && close.mutate({ id: pendingLost.id, outcome: 'LOST', reason })}
            >
              {reason}
            </LmsButton>
          ))}
        </div>
      </LmsDialog>
    </DndContext>
  );
}

function Column({
  stage,
  label,
  query,
  onOpenLead,
}: {
  stage: LmsStage;
  label: string;
  query: { data?: { total: number; leads: LmsLeadRow[] }; isPending: boolean; isError: boolean };
  onOpenLead: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const leads = query.data?.leads ?? [];
  const total = query.data?.total ?? 0;

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-[60vh] flex-col rounded-[10px] border p-2 ${isOver ? 'border-lms-ink bg-lms-surface' : 'border-transparent'}`}
    >
      <header className="flex items-center justify-between px-1 pb-2 pt-1 text-sm font-medium">
        <StageMark stage={stage} label={label} />
        <span className="tabular-nums text-lms-muted">{query.data ? total : ''}</span>
      </header>
      <div className="flex flex-col gap-2">
        {query.isPending && <p className="px-1 text-sm text-lms-muted">Loading…</p>}
        {query.isError && <p className="px-1 text-sm">This column couldn't load.</p>}
        {!query.isPending && !query.isError && leads.length === 0 && <p className="px-1 text-sm text-lms-muted">No leads here.</p>}
        {leads.map((lead) => (
          <DraggableCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead.id)} />
        ))}
        {total > PER_COLUMN && (
          <p className="px-1 pt-1 text-xs text-lms-muted">
            Showing {PER_COLUMN} of {total}. Switch to the table to see all.
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ lead, onOpen }: { lead: LmsLeadRow; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : ''}>
      <Card lead={lead} onOpen={onOpen} />
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function Card({ lead, onOpen, overlay = false }: { lead: LmsLeadRow; onOpen?: () => void; overlay?: boolean }) {
  // Enter on the name opens the lead; it mustn't also start a keyboard drag on the card.
  const stopKeys = (e: KeyboardEvent) => e.stopPropagation();
  return (
    <article className={`cursor-grab rounded-[10px] border border-lms-line bg-lms-surface p-3 text-sm ${overlay ? 'shadow-lg' : 'hover:border-lms-muted'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} onKeyDown={stopKeys} className="min-w-0 truncate text-left font-medium hover:underline">
          {lead.name}
        </button>
        {lead.assignedTo && (
          <span
            title={lead.assignedTo.name}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-lms-line text-[11px] font-medium text-lms-muted"
          >
            {initials(lead.assignedTo.name)}
          </span>
        )}
      </div>
      {(lead.productSummary || lead.value !== null) && (
        <p className="mt-1 flex justify-between gap-2 text-lms-muted">
          <span className="truncate">{lead.productSummary}</span>
          {lead.value !== null && <span className="shrink-0 tabular-nums text-lms-ink">{formatMoney(lead.value)}</span>}
        </p>
      )}
      {(lead.nextTaskAt || lead.isStale || lead.order) && (
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs">
          {lead.order && <span className="text-lms-muted">Order #{lead.order.invoiceNumber}</span>}
          {lead.nextTaskAt && <span className="tabular-nums text-lms-muted">Next: {formatDateTime(lead.nextTaskAt)}</span>}
          {lead.isStale && <span className="font-medium text-lms-alert">stale</span>}
        </p>
      )}
    </article>
  );
}
