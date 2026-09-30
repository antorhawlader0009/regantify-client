import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsSettings } from '../../lib/lmsApi';
import { Field, LmsButton, LmsInput, LmsSelect } from './ui';
import { formatPhone } from './format';

const RETENTION_CHOICES = [
  { value: '', label: 'Keep them' },
  { value: '6', label: 'Delete after 6 months' },
  { value: '12', label: 'Delete after 1 year' },
  { value: '24', label: 'Delete after 2 years' },
  { value: '36', label: 'Delete after 3 years' },
];

/**
 * LMS > Settings > Privacy (LMS-plan.md Step 14, PDPO 2025 hygiene): what
 * the LMS keeps and why, how long closed leads are kept, and erasing one
 * person's leads when they ask.
 */
export function PrivacySection({ settings }: { settings: LmsSettings }) {
  const queryClient = useQueryClient();
  const [retention, setRetention] = useState(settings.retentionMonths ? String(settings.retentionMonths) : '');
  const saveRetention = useMutation({
    mutationFn: () => lmsApi.updateSettings({ retentionMonths: retention ? Number(retention) : null }),
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-2 text-sm leading-6">
        <p>
          The LMS keeps what your team needs to call people back: their name, phone, address, what they asked for, and every call,
          message and note. It comes from your store&apos;s orders and forms, your imports and the API, and it&apos;s only for your
          team to contact them about their order or request.
        </p>
        <p className="text-lms-muted">
          Anyone can ask you to delete their details. Erase their number below: it removes their leads with the whole history. Orders
          they placed stay, since those are your sales records.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          saveRetention.mutate();
        }}
      >
        <Field label="Closed leads (won or lost)" hint="Checked every night. Open leads are never deleted this way.">
          <LmsSelect className="!w-60" value={retention} onChange={(e) => setRetention(e.target.value)}>
            {RETENTION_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </LmsSelect>
        </Field>
        <LmsButton type="submit" disabled={saveRetention.isPending || retention === (settings.retentionMonths ? String(settings.retentionMonths) : '')}>
          Save
        </LmsButton>
      </form>

      <EraseByPhone />
    </div>
  );
}

function EraseByPhone() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<{ phone: string; leads: number } | null>(null);
  const [confirm, setConfirm] = useState('');

  const lookup = useMutation({
    mutationFn: () => lmsApi.privacyLookup(phone.trim()),
    onSuccess: (r) => {
      setFound(r);
      setConfirm('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That number couldn't be checked. Try again.")),
  });
  const erase = useMutation({
    mutationFn: () => lmsApi.privacyErase(found!.phone, confirm.trim()),
    onSuccess: (r) => {
      toast.success(`Erased ${r.deleted} lead${r.deleted === 1 ? '' : 's'} for ${formatPhone(r.phone)}`);
      setFound(null);
      setPhone('');
      setConfirm('');
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Nothing was erased. Try again.")),
  });

  return (
    <div className="rounded-md border border-lms-line p-4">
      <p className="text-sm font-medium">Erase one person&apos;s leads</p>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          lookup.mutate();
        }}
      >
        <Field label="Their phone number">
          <LmsInput
            className="!w-48 tabular-nums"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFound(null);
            }}
          />
        </Field>
        <LmsButton type="submit" disabled={!phone.trim() || lookup.isPending}>
          {lookup.isPending ? 'Checking…' : 'Find'}
        </LmsButton>
      </form>

      {found &&
        (found.leads === 0 ? (
          <p className="mt-3 text-sm text-lms-muted">The LMS has nothing for {formatPhone(found.phone)}.</p>
        ) : (
          <form
            className="mt-3 space-y-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              erase.mutate();
            }}
          >
            <p className="text-sm">
              {formatPhone(found.phone)} has <b>{found.leads}</b> lead{found.leads === 1 ? '' : 's'}. Erasing deletes{' '}
              {found.leads === 1 ? 'it' : 'them'} with every call, message, note and task. This can&apos;t be undone.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Type the number again to confirm">
                <LmsInput className="!w-48 tabular-nums" inputMode="tel" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              <LmsButton type="submit" variant="danger" disabled={!confirm.trim() || erase.isPending}>
                {erase.isPending ? 'Erasing…' : 'Erase for good'}
              </LmsButton>
            </div>
          </form>
        ))}
    </div>
  );
}
