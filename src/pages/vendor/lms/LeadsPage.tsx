import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';
import { AddLeadDialog } from '../../../components/lms/AddLeadDialog';
import { LeadDrawer } from '../../../components/lms/LeadDrawer';
import { Field, LmsButton, LmsDialog, LmsInput, LmsSelect } from '../../../components/lms/ui';
import { formatDateTime, formatMoney, formatPhone, minutesSince, timeAgo } from '../../../components/lms/format';
import { STAGE_RULE } from '../../../components/lms/stageStyles';
import { LeadsBoard } from '../../../components/lms/LeadsBoard';
import { LandingBacklogNotice } from '../../../components/lms/LandingBacklog';
import { formatExtraValue, useLmsFields } from '../../../components/lms/ExtraFields';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import {
  LMS_FILTER_KEYS,
  LMS_KIND_LABELS,
  LMS_SOURCE_LABELS,
  LMS_STAGES,
  lmsApi,
  type LmsBulkAction,
  type LmsFieldDef,
  type LmsLeadFilters,
  type LmsLeadRow,
  type LmsMe,
} from '../../../lib/lmsApi';

/** LMS > Leads: the call sheet. Filters live in the URL, so a view can be bookmarked or saved. */
export default function LeadsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const openLead = (id: string | null) =>
    setParams(
      (p) => {
        if (id) p.set('lead', id);
        else p.delete('lead');
        return p;
      },
      { replace: !id },
    );

  return (
    <LmsPage
      title="Leads"
      actions={
        <LmsButton variant="primary" onClick={() => setAddOpen(true)}>
          Add lead
        </LmsButton>
      }
    >
      {(me) => (
        <>
          <LandingBacklogNotice me={me} className="mb-4" />
          <LeadsList me={me} params={params} setParams={setParams} onOpenLead={openLead} onAdd={() => setAddOpen(true)} />
          <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onOpenLead={openLead} />
          <LeadDrawer leadId={params.get('lead')} me={me} onClose={() => openLead(null)} />
        </>
      )}
    </LmsPage>
  );
}

type SetParams = ReturnType<typeof useSearchParams>[1];

function readFilters(params: URLSearchParams): LmsLeadFilters {
  const filters: Record<string, string> = {};
  for (const key of LMS_FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  return filters as LmsLeadFilters;
}

function LeadsList({
  me,
  params,
  setParams,
  onOpenLead,
  onAdd,
}: {
  me: LmsMe;
  params: URLSearchParams;
  setParams: SetParams;
  onOpenLead: (id: string) => void;
  onAdd: () => void;
}) {
  const queryClient = useQueryClient();
  const filters = useMemo(() => readFilters(params), [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Changing any filter goes back to page 1 and clears the selection.
  const setFilter = (key: keyof LmsLeadFilters, value: string | undefined) => {
    setParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      p.delete('page');
      return p;
    });
    setSelected(new Set());
  };
  const setPage = (next: number) =>
    setParams((p) => {
      if (next > 1) p.set('page', String(next));
      else p.delete('page');
      return p;
    });

  const isBoard = params.get('view') === 'board';
  const setView = (board: boolean) =>
    setParams((p) => {
      if (board) p.set('view', 'board');
      else p.delete('view');
      p.delete('page');
      return p;
    });

  const listQuery = useQuery({
    queryKey: ['lms', 'leads', 'list', filters, page],
    queryFn: () => lmsApi.listLeads(filters, page),
    placeholderData: keepPreviousData,
    enabled: !isBoard,
  });
  const countsQuery = useQuery({
    queryKey: ['lms', 'leads', 'counts', { ...filters, stage: undefined }],
    queryFn: () => lmsApi.counts(filters),
    placeholderData: keepPreviousData,
    enabled: !isBoard,
  });
  const agentsQuery = useQuery({ queryKey: ['lms', 'agents'], queryFn: lmsApi.agents, enabled: me.isManager });
  // Extra fields the vendor chose to show as table columns.
  const tableFields = (useLmsFields().data ?? []).filter((f) => f.showInTable);

  const leads = listQuery.data?.leads ?? [];
  const extraFilterCount = (['kind', 'source', 'agent', 'from', 'to', 'stale', 'hasTask', 'tag'] as const).filter((k) => filters[k]).length;
  const hasAnyFilter = LMS_FILTER_KEYS.some((k) => k !== 'sort' && k !== 'perPage' && filters[k]);

  const tabs: { id: string | undefined; label: string; count?: number }[] = [
    { id: undefined, label: 'All', count: countsQuery.data?.ALL },
    ...LMS_STAGES.map((stage) => ({ id: stage, label: me.stageLabels[stage], count: countsQuery.data?.[stage] })),
  ];

  const allOnPageSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const toggleAll = () => setSelected(allOnPageSelected ? new Set() : new Set(leads.map((l) => l.id)));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={filters.q ?? ''} onChange={(q) => setFilter('q', q || undefined)} />
        <LmsButton onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          <SlidersHorizontal size={15} />
          Filters{extraFilterCount ? ` (${extraFilterCount})` : ''}
        </LmsButton>
        <LmsSelect
          aria-label="Sort"
          className="!w-auto"
          value={filters.sort ?? 'recent'}
          onChange={(e) => setFilter('sort', e.target.value === 'recent' ? undefined : e.target.value)}
        >
          <option value="recent">Latest activity first</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </LmsSelect>
        <SavedViews filters={filters} onApply={(f) => setParams(() => new URLSearchParams(f as Record<string, string>))} />
        <div role="group" aria-label="Layout" className="ml-auto inline-flex rounded-md border border-lms-line bg-lms-surface p-0.5">
          {[
            { board: false, label: 'Table' },
            { board: true, label: 'Board' },
          ].map((v) => (
            <button
              key={v.label}
              type="button"
              aria-pressed={isBoard === v.board}
              onClick={() => setView(v.board)}
              className={`h-8 rounded px-3 text-sm font-medium ${isBoard === v.board ? 'bg-lms-ink text-white' : 'text-lms-muted hover:text-lms-ink'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <MoreFilters me={me} filters={filters} agents={agentsQuery.data ?? []} setFilter={setFilter} onClear={() => setParams(new URLSearchParams())} />
      )}

      {isBoard ? (
        <LeadsBoard me={me} filters={filters} onOpenLead={onOpenLead} />
      ) : (
        <>
      <div role="tablist" aria-label="Stages" className="mb-3 flex gap-5 overflow-x-auto border-b border-lms-line">
        {tabs.map((t) => {
          const active = filters.stage === t.id;
          return (
            <button
              key={t.id ?? 'ALL'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter('stage', t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm ${
                active ? 'border-lms-ink font-medium text-lms-ink' : 'border-transparent text-lms-muted hover:text-lms-ink'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 tabular-nums text-lms-muted">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <BulkBar
          me={me}
          ids={[...selected]}
          onDone={() => {
            setSelected(new Set());
            refresh();
          }}
          onClear={() => setSelected(new Set())}
        />
      )}

      <Panel className="!p-0 overflow-hidden">
        {listQuery.isPending ? (
          <p className="p-5 text-sm text-lms-muted">Loading…</p>
        ) : listQuery.isError ? (
          <p className="p-5 text-sm">{apiErrorMessage(listQuery.error, "Leads couldn't load. Refresh the page to try again.")}</p>
        ) : leads.length === 0 ? (
          <div className="px-5">
            {hasAnyFilter ? (
              <EmptyState title="No leads match" text="Try a different search or clear the filters." />
            ) : (
              <EmptyState
                title="No leads yet"
                text="New orders, abandoned checkouts and form requests will show up here by themselves. You can also add one by hand."
              />
            )}
            {!hasAnyFilter && (
              <LmsButton variant="primary" className="-mt-6 mb-8" onClick={onAdd}>
                Add lead
              </LmsButton>
            )}
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-lms-muted">
                  <Th className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-[var(--lms-ink)]"
                    />
                  </Th>
                  <Th>Stage</Th>
                  <Th>Name</Th>
                  <Th>Kind</Th>
                  <Th>Product</Th>
                  <Th className="text-right">Value</Th>
                  {me.isManager && <Th>Agent</Th>}
                  <Th className="text-right">Tries</Th>
                  <Th>Next task</Th>
                  <Th>Waiting or last activity</Th>
                  {tableFields.map((f) => (
                    <Th key={f.key}>{f.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    me={me}
                    selected={selected.has(lead.id)}
                    onToggle={() => toggleOne(lead.id)}
                    onOpen={() => onOpenLead(lead.id)}
                    onTag={(tag) => setFilter('tag', tag)}
                    extraFields={tableFields}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {listQuery.data && listQuery.data.total > 0 && (
        <Pagination
          total={listQuery.data.total}
          page={listQuery.data.page}
          perPage={listQuery.data.perPage}
          onPage={setPage}
          onPerPage={(n) => setFilter('perPage', n === 30 ? undefined : String(n))}
        />
      )}
        </>
      )}
    </>
  );
}

function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`sticky top-0 z-10 h-10 whitespace-nowrap border-b border-lms-line bg-lms-surface px-3 font-medium ${className}`}>
      {children}
    </th>
  );
}

function LeadRow({
  lead,
  me,
  selected,
  onToggle,
  onOpen,
  onTag,
  extraFields,
}: {
  lead: LmsLeadRow;
  me: LmsMe;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onTag: (tag: string) => void;
  extraFields: LmsFieldDef[];
}) {
  const waiting = lead.stage === 'NEW' ? minutesSince(lead.createdAt) : null;
  const waitingTone = waiting === null ? 'text-lms-muted' : waiting > 60 ? 'text-lms-alert font-medium' : waiting > 15 ? 'text-lms-stage-trying font-medium' : '';
  const td = 'h-9 border-b border-lms-line px-3 align-middle';

  return (
    <tr className={`cursor-pointer ${selected ? 'bg-lms-page' : 'hover:bg-lms-page'}`} onClick={onOpen}>
      {/* The stage's rule sits in the row's left margin, like a mark on a call sheet. */}
      <td className={`${td} relative w-10 pl-4`} onClick={(e) => e.stopPropagation()}>
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${STAGE_RULE[lead.stage]}`} />
        <input
          type="checkbox"
          aria-label={`Select ${lead.name}`}
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 accent-[var(--lms-ink)]"
        />
      </td>
      {/* The margin rule already carries the stage colour, so the word stands alone here. */}
      <td className={`${td} whitespace-nowrap`}>
        {me.stageLabels[lead.stage]}
        {lead.isStale && <span className="ml-2 font-medium text-lms-alert">stale</span>}
      </td>
      <td className={`${td} max-w-[220px]`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="block max-w-full truncate text-left font-medium hover:underline"
        >
          {lead.name}
        </button>
        <span className="block whitespace-nowrap tabular-nums text-lms-muted">
          {formatPhone(lead.phone)}
          {lead.doNotContact && <span className="ml-2 font-medium text-lms-alert">do not contact</span>}
        </span>
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {LMS_KIND_LABELS[lead.kind]}
        <span className="block text-lms-muted">{lead.order ? `Order #${lead.order.invoiceNumber}` : LMS_SOURCE_LABELS[lead.source]}</span>
      </td>
      <td className={`${td} max-w-[240px]`}>
        <span className="block truncate">
          {lead.productSummary ?? ''}
          {/* Order and checkout summaries already say "2 × Kurti"; only a hand-typed product needs the count. */}
          {lead.quantity && lead.kind === 'ENQUIRY' ? <span className="text-lms-muted"> × {lead.quantity}</span> : null}
        </span>
        {lead.tags.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTag(tag);
                }}
                className="rounded border border-lms-line px-1.5 text-xs text-lms-muted hover:text-lms-ink"
                title={`Show leads tagged ${tag}`}
              >
                {tag}
              </button>
            ))}
          </span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{lead.value !== null ? formatMoney(lead.value) : ''}</td>
      {me.isManager && <td className={`${td} whitespace-nowrap`}>{lead.assignedTo?.name ?? <span className="text-lms-muted">Nobody yet</span>}</td>}
      <td className={`${td} text-right tabular-nums`}>{lead.attemptCount || ''}</td>
      <td className={`${td} whitespace-nowrap tabular-nums`}>
        {lead.nextTaskAt ? formatDateTime(lead.nextTaskAt) : ''}
      </td>
      <td className={`${td} whitespace-nowrap tabular-nums ${waitingTone}`}>
        {waiting !== null ? `waiting ${timeAgo(lead.createdAt)}` : timeAgo(lead.lastActivityAt)}
      </td>
      {extraFields.map((f) => (
        <td key={f.key} className={`${td} max-w-[200px] truncate ${f.type === 'NUMBER' || f.type === 'PHONE' ? 'tabular-nums' : ''}`}>
          {formatExtraValue(f, lead.customFields?.[f.key])}
        </td>
      ))}
    </tr>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft.trim() === value) return;
    const t = setTimeout(() => onChange(draft.trim()), 350);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative w-full sm:w-72">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lms-muted" />
      <LmsInput
        type="search"
        aria-label="Search leads"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search name, phone, product or tag"
        className="pl-9"
      />
    </div>
  );
}

function MoreFilters({
  me,
  filters,
  agents,
  setFilter,
  onClear,
}: {
  me: LmsMe;
  filters: LmsLeadFilters;
  agents: { userId: string; name: string }[];
  setFilter: (key: keyof LmsLeadFilters, value: string | undefined) => void;
  onClear: () => void;
}) {
  return (
    <Panel className="mb-4 !p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Kind">
          <LmsSelect value={filters.kind ?? ''} onChange={(e) => setFilter('kind', e.target.value || undefined)}>
            <option value="">Any</option>
            {Object.entries(LMS_KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </LmsSelect>
        </Field>
        <Field label="Came from">
          <LmsSelect value={filters.source ?? ''} onChange={(e) => setFilter('source', e.target.value || undefined)}>
            <option value="">Anywhere</option>
            {Object.entries(LMS_SOURCE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </LmsSelect>
        </Field>
        {me.isManager && (
          <Field label="Agent">
            <LmsSelect value={filters.agent ?? ''} onChange={(e) => setFilter('agent', e.target.value || undefined)}>
              <option value="">Everyone</option>
              <option value="unassigned">Nobody yet</option>
              {agents.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.name}
                </option>
              ))}
            </LmsSelect>
          </Field>
        )}
        <Field label="Next task">
          <LmsSelect value={filters.hasTask ?? ''} onChange={(e) => setFilter('hasTask', e.target.value || undefined)}>
            <option value="">Any</option>
            <option value="true">Has a task</option>
            <option value="false">No task</option>
          </LmsSelect>
        </Field>
        <Field label="Added from">
          <LmsInput type="date" value={filters.from ?? ''} onChange={(e) => setFilter('from', e.target.value || undefined)} />
        </Field>
        <Field label="Added until">
          <LmsInput type="date" value={filters.to ?? ''} onChange={(e) => setFilter('to', e.target.value || undefined)} />
        </Field>
        <Field label="Tag">
          <LmsInput value={filters.tag ?? ''} onChange={(e) => setFilter('tag', e.target.value.trim().toLowerCase() || undefined)} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--lms-ink)]"
            checked={filters.stale === 'true'}
            onChange={(e) => setFilter('stale', e.target.checked ? 'true' : undefined)}
          />
          Stale only
        </label>
      </div>
      <LmsButton variant="quiet" className="-ml-3.5 mt-3" onClick={onClear}>
        Clear all filters
      </LmsButton>
    </Panel>
  );
}

function SavedViews({ filters, onApply }: { filters: LmsLeadFilters; onApply: (filters: LmsLeadFilters) => void }) {
  const queryClient = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const viewsQuery = useQuery({ queryKey: ['lms', 'views'], queryFn: lmsApi.views });
  const views = viewsQuery.data ?? [];

  const save = useMutation({
    mutationFn: () => lmsApi.saveView(name.trim(), filters),
    onSuccess: () => {
      toast.success('View saved');
      setSaveOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['lms', 'views'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The view wasn't saved. Try again.")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => lmsApi.deleteView(id),
    onSuccess: () => {
      toast.success('View deleted');
      queryClient.invalidateQueries({ queryKey: ['lms', 'views'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The view wasn't deleted. Try again.")),
  });

  const current = views.find((v) => JSON.stringify(v.filters) === JSON.stringify(filters));

  return (
    <div className="flex items-center gap-2">
      {views.length > 0 && (
        <LmsSelect
          aria-label="Saved views"
          className="!w-auto max-w-[12rem]"
          value={current?.id ?? ''}
          onChange={(e) => {
            const view = views.find((v) => v.id === e.target.value);
            if (view) onApply(view.filters);
          }}
        >
          <option value="" disabled>
            Saved views
          </option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </LmsSelect>
      )}
      {current ? (
        <LmsButton variant="quiet" disabled={remove.isPending} onClick={() => remove.mutate(current.id)}>
          Delete view
        </LmsButton>
      ) : (
        <LmsButton variant="quiet" onClick={() => setSaveOpen(true)}>
          Save view
        </LmsButton>
      )}
      <LmsDialog open={saveOpen} onOpenChange={setSaveOpen} title="Save this view" width="max-w-sm">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name" hint="Saves the current search, filters and sort. Only you see your views.">
            <LmsInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoFocus placeholder="e.g. Today's new orders" />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <LmsButton onClick={() => setSaveOpen(false)}>Cancel</LmsButton>
            <LmsButton type="submit" variant="primary" disabled={save.isPending || !name.trim()}>
              {save.isPending ? 'Saving…' : 'Save view'}
            </LmsButton>
          </div>
        </form>
      </LmsDialog>
    </div>
  );
}

type BulkDialog = 'none' | 'lost' | 'addTag' | 'removeTag' | 'delete';

function BulkBar({ me, ids, onDone, onClear }: { me: LmsMe; ids: string[]; onDone: () => void; onClear: () => void }) {
  const [dialog, setDialog] = useState<BulkDialog>('none');
  const [tag, setTag] = useState('');

  const run = useMutation({
    mutationFn: ({ action, reason, tag }: { action: LmsBulkAction; reason?: string; tag?: string }) => lmsApi.bulk(ids, action, { reason, tag }),
    onSuccess: ({ done, skipped }) => {
      setDialog('none');
      setTag('');
      const leadWord = (n: number) => `${n} lead${n === 1 ? '' : 's'}`;
      toast.success(skipped ? `Done for ${leadWord(done)}. ${leadWord(skipped)} skipped (already closed or part of an order).` : `Done for ${leadWord(done)}.`);
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That didn't work. Try again.")),
  });

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-lms-ink bg-lms-surface px-3 py-2">
      <span className="mr-2 text-sm font-medium tabular-nums">{ids.length} selected</span>
      <LmsButton onClick={() => run.mutate({ action: 'WON' })} disabled={run.isPending}>
        Mark as won
      </LmsButton>
      <LmsButton onClick={() => setDialog('lost')}>Mark as lost</LmsButton>
      <LmsButton onClick={() => setDialog('addTag')}>Add tag</LmsButton>
      <LmsButton onClick={() => setDialog('removeTag')}>Remove tag</LmsButton>
      {me.isManager && (
        <LmsButton variant="danger" onClick={() => setDialog('delete')}>
          Delete
        </LmsButton>
      )}
      <LmsButton variant="quiet" className="ml-auto" onClick={onClear}>
        Clear selection
      </LmsButton>

      <LmsDialog open={dialog === 'lost'} onOpenChange={(o) => !o && setDialog('none')} title={`Why were these ${ids.length} lost?`}>
        <div className="flex flex-wrap gap-2">
          {me.lostReasons.map((reason) => (
            <LmsButton key={reason} disabled={run.isPending} onClick={() => run.mutate({ action: 'LOST', reason })}>
              {reason}
            </LmsButton>
          ))}
        </div>
      </LmsDialog>

      <LmsDialog
        open={dialog === 'addTag' || dialog === 'removeTag'}
        onOpenChange={(o) => !o && setDialog('none')}
        title={dialog === 'addTag' ? 'Add a tag' : 'Remove a tag'}
        width="max-w-sm"
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            run.mutate({ action: dialog === 'addTag' ? 'ADD_TAG' : 'REMOVE_TAG', tag: tag.trim() });
          }}
        >
          <Field label="Tag">
            <LmsInput value={tag} onChange={(e) => setTag(e.target.value)} required maxLength={40} autoFocus />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <LmsButton onClick={() => setDialog('none')}>Cancel</LmsButton>
            <LmsButton type="submit" variant="primary" disabled={run.isPending || !tag.trim()}>
              {dialog === 'addTag' ? 'Add tag' : 'Remove tag'}
            </LmsButton>
          </div>
        </form>
      </LmsDialog>

      <LmsDialog open={dialog === 'delete'} onOpenChange={(o) => !o && setDialog('none')} title={`Delete ${ids.length} lead${ids.length === 1 ? '' : 's'}?`} width="max-w-sm">
        <p className="text-sm text-lms-muted">Their notes and history are deleted too. Orders they came from aren't touched. This can't be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <LmsButton onClick={() => setDialog('none')}>Cancel</LmsButton>
          <LmsButton variant="danger" disabled={run.isPending} onClick={() => run.mutate({ action: 'DELETE' })}>
            {run.isPending ? 'Deleting…' : 'Delete'}
          </LmsButton>
        </div>
      </LmsDialog>
    </div>
  );
}

function Pagination({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  total: number;
  page: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="tabular-nums text-lms-muted">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <LmsSelect aria-label="Leads per page" className="!w-auto" value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
          <option value={30}>30 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </LmsSelect>
        <LmsButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </LmsButton>
        <LmsButton disabled={page >= last} onClick={() => onPage(page + 1)}>
          Next
        </LmsButton>
      </div>
    </div>
  );
}
