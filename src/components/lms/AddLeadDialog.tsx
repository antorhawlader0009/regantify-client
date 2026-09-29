import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type CreateLmsLead, type LmsMe } from '../../lib/lmsApi';
import { BD_DISTRICTS, divisionOf } from '../../lib/bdDistricts';
import { Field, LmsButton, LmsDialog, LmsInput, LmsSelect, LmsTextarea } from './ui';
import { ExtraFieldInputs, useLmsFields, type ExtraValues } from './ExtraFields';
import { AgentSelect } from './Team';

const EMPTY = { name: '', phone: '', productSummary: '', quantity: '', value: '', address: '', district: '', note: '' };

/**
 * LMS > Leads > Add lead. Only name and phone are needed. A phone that
 * already has an open lead isn't added twice: the server adds this to the
 * existing lead's history instead, and we open that lead.
 */
export function AddLeadDialog({
  me,
  open,
  onOpenChange,
  onOpenLead,
}: {
  me: LmsMe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  // Managers pick who works it; agents always keep what they add (the server enforces this too).
  const [assignTo, setAssignTo] = useState(me.autoAssign === 'ROUND_ROBIN' ? 'AUTO' : 'ME');
  const [extra, setExtra] = useState<ExtraValues>({});
  const fieldsQuery = useLmsFields();
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const create = useMutation({
    mutationFn: (body: CreateLmsLead) => lmsApi.createLead(body),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });
      setForm(EMPTY);
      setExtra({});
      onOpenChange(false);
      if (!result.merged) {
        toast.success('Lead added');
      } else if (result.leadId) {
        toast.info('This number already has an open lead. We added this to its history.');
      } else {
        toast.info('This number already has an open lead with another agent. We added this to its history.');
      }
      if (result.leadId) onOpenLead(result.leadId);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The lead couldn't be added. Try again.")),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    create.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      productSummary: form.productSummary.trim() || undefined,
      quantity: num(form.quantity),
      value: num(form.value),
      address: form.address.trim() || undefined,
      district: form.district || undefined,
      note: form.note.trim() || undefined,
      customFields: Object.fromEntries(Object.entries(extra).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])),
      ...(me.isManager ? { assignTo } : {}),
    });
  };

  const division = divisionOf(form.district);

  return (
    <LmsDialog open={open} onOpenChange={onOpenChange} title="Add lead">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <LmsInput value={form.name} onChange={set('name')} required maxLength={120} autoFocus />
          </Field>
          <Field label="Phone">
            <LmsInput
              value={form.phone}
              onChange={set('phone')}
              required
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              className="tabular-nums"
            />
          </Field>
        </div>

        <Field label="Product or interest">
          <LmsInput value={form.productSummary} onChange={set('productSummary')} maxLength={500} placeholder="What they asked about" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity">
            <LmsInput type="number" min={1} value={form.quantity} onChange={set('quantity')} className="tabular-nums" />
          </Field>
          <Field label="Value (৳)">
            <LmsInput type="number" min={0} step="0.01" value={form.value} onChange={set('value')} className="tabular-nums" />
          </Field>
        </div>

        <Field label="Address">
          <LmsInput value={form.address} onChange={set('address')} maxLength={1000} />
        </Field>

        <Field label="District" hint={division ? `${division} division` : undefined}>
          <LmsSelect value={form.district} onChange={set('district')}>
            <option value="">Not known yet</option>
            {BD_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </LmsSelect>
        </Field>

        <ExtraFieldInputs defs={fieldsQuery.data ?? []} values={extra} onChange={(key, value) => setExtra((x) => ({ ...x, [key]: value }))} />

        <Field label="Note">
          <LmsTextarea rows={3} value={form.note} onChange={set('note')} maxLength={2000} placeholder="Anything the team should know" />
        </Field>

        {me.isManager && (
          <Field label="Who calls them" hint={assignTo === 'AUTO' ? 'Goes to the next person on shift, in turn.' : undefined}>
            <AgentSelect me={me} extra={['AUTO', 'ME']} value={assignTo} onChange={(e) => setAssignTo(e.target.value)} />
          </Field>
        )}

        <div className="flex justify-end gap-2 border-t border-lms-line pt-4">
          <LmsButton onClick={() => onOpenChange(false)}>Cancel</LmsButton>
          <LmsButton type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add lead'}
          </LmsButton>
        </div>
      </form>
    </LmsDialog>
  );
}
