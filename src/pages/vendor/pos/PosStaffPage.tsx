import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { PosPage } from '../../../components/pos/PosLayout';
import { POS_CASHIERS_KEY } from '../../../components/pos/CashierUnlock';
import { Field, Panel, PosButton, PosDialog, PosInput, PosSelect, SwitchRow } from '../../../components/pos/ui';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { posApi, type PosMe, type PosStaffFields, type PosStaffMember, type PosStaffRole } from '../../../lib/posApi';

const STAFF_KEY = ['pos', 'staff'] as const;

const ROLE_LABEL: Record<PosStaffRole, string> = { CASHIER: 'Cashier', MANAGER: 'Manager' };

/** POS > Staff: who can work the counter, as cashier or manager, and their PINs. */
export default function PosStaffPage() {
  return <PosPage title="Staff">{(me) => (me.isManager ? <StaffBody /> : <OwnPinOnly me={me} />)}</PosPage>;
}

/** A cashier logged in as themselves can only set their own PIN here. */
function OwnPinOnly({ me }: { me: PosMe }) {
  const [settingPin, setSettingPin] = useState(false);
  return (
    <Panel className="max-w-xl">
      <p className="text-sm text-pos-muted">Only the store owner or a POS manager can manage POS staff.</p>
      {me.myStaffId && (
        <PosButton className="mt-4" onClick={() => setSettingPin(true)}>
          <KeyRound size={16} aria-hidden />
          Set my PIN
        </PosButton>
      )}
      {settingPin && me.myStaffId && <PinDialog staffId={me.myStaffId} name="your" onDone={() => setSettingPin(false)} />}
    </Panel>
  );
}

function StaffBody() {
  const query = useQuery({ queryKey: STAFF_KEY, queryFn: posApi.staff });
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PosStaffMember | null>(null);
  const [pinFor, setPinFor] = useState<PosStaffMember | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => posApi.removeStaff(id),
    onSuccess: () => {
      toast.success('Removed from the POS');
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't remove. Try again.")),
  });

  if (query.isPending) return <p className="text-sm text-pos-muted">Loading…</p>;
  if (query.isError) return <p className="text-sm">{apiErrorMessage(query.error, "Staff couldn't load. Refresh the page to try again.")}</p>;
  const { staff, candidates } = query.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-pos-muted">
          Everyone who works the counter unlocks it with their own PIN, so every sale and every cash count shows who did it.
          Managers can do everything; cashiers only what you allow.
        </p>
        <PosButton onClick={() => setAdding(true)}>
          <Plus size={16} aria-hidden />
          Add person
        </PosButton>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-pos-line bg-pos-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-pos-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">PIN</th>
              <th className="px-4 py-2.5 font-medium">Allowed</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-pos-line align-top">
                <td className="px-4 py-3">
                  <span className="font-medium">{s.displayName}</span>
                  {s.isOwner && <span className="ml-2 text-xs text-pos-muted">Owner</span>}
                  {s.phone && <span className="block text-xs text-pos-muted">{s.phone}</span>}
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[s.role]}</td>
                <td className="px-4 py-3">
                  {s.pinLocked ? (
                    <span className="text-pos-alert">Locked for now</span>
                  ) : s.hasPin ? (
                    'Set'
                  ) : (
                    <span className="text-pos-muted">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-pos-muted">{allowedText(s)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => setPinFor(s)}>
                      {s.hasPin ? 'Change PIN' : 'Set PIN'}
                    </PosButton>
                    <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => setEditing(s)}>
                      Edit
                    </PosButton>
                    {!s.isOwner && (
                      <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => remove.mutate(s.id)} disabled={remove.isPending}>
                        Remove
                      </PosButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddDialog candidates={candidates} onDone={() => setAdding(false)} />}
      {editing && <EditDialog member={editing} onDone={() => setEditing(null)} />}
      {pinFor && <PinDialog staffId={pinFor.id} name={`${pinFor.displayName}'s`} onDone={() => setPinFor(null)} />}
    </div>
  );
}

function allowedText(s: PosStaffMember): string {
  if (s.role === 'MANAGER') return 'Everything';
  const parts = [
    s.maxDiscountPercent > 0 ? `Discount up to ${s.maxDiscountPercent}%` : 'No discounts',
    s.canRefund && 'refunds',
    s.canOverridePrice && 'change prices',
    s.canOpenDrawer && 'open the drawer',
    s.canVoid && 'void sales',
  ].filter(Boolean);
  return parts.join(', ');
}

/** Role and limits, the same fields when adding and editing. */
function LimitFields({ value, onChange, ownerRow }: { value: PosStaffFields; onChange: (v: PosStaffFields) => void; ownerRow?: boolean }) {
  const set = (patch: PosStaffFields) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <Field label="Role">
        <PosSelect value={value.role ?? 'CASHIER'} onChange={(e) => set({ role: e.target.value as PosStaffRole })} disabled={ownerRow}>
          <option value="CASHIER">Cashier: sells, with the limits below</option>
          <option value="MANAGER">Manager: everything, and approves cashiers</option>
        </PosSelect>
      </Field>
      {value.role !== 'MANAGER' && (
        <>
          <Field label="Largest discount they can give (%)" hint="Bigger discounts will need a manager's PIN.">
            <PosInput
              inputMode="decimal"
              value={String(value.maxDiscountPercent ?? 0)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value === '' || (Number.isFinite(n) && n >= 0 && n <= 100)) set({ maxDiscountPercent: e.target.value === '' ? 0 : n });
              }}
            />
          </Field>
          <div className="divide-y divide-pos-line border-t border-pos-line">
            <SwitchRow label="Give refunds" checked={!!value.canRefund} onChange={(v) => set({ canRefund: v })} />
            <SwitchRow label="Change an item's price" checked={!!value.canOverridePrice} onChange={(v) => set({ canOverridePrice: v })} />
            <SwitchRow label="Open the cash drawer without a sale" checked={!!value.canOpenDrawer} onChange={(v) => set({ canOpenDrawer: v })} />
            <SwitchRow label="Void a sale" checked={!!value.canVoid} onChange={(v) => set({ canVoid: v })} />
          </div>
        </>
      )}
    </div>
  );
}

function AddDialog({ candidates, onDone }: { candidates: Array<{ userId: string; name: string; staffRole: string }>; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [fields, setFields] = useState<PosStaffFields>({ role: 'CASHIER', maxDiscountPercent: 0 });
  const add = useMutation({
    mutationFn: () => posApi.addStaff({ userId, ...fields }),
    onSuccess: () => {
      toast.success('Added. Now set their PIN.');
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't add. Try again.")),
  });

  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title="Add person to the POS">
      {candidates.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-pos-muted">
            Everyone on your staff is already here. To add someone new, create their account under{' '}
            <Link to="/vendor/staff" className="font-medium text-pos-ink underline">
              Staff
            </Link>{' '}
            first.
          </p>
          <div className="flex justify-end">
            <PosButton onClick={onDone}>Close</PosButton>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (userId) add.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Staff account">
            <PosSelect value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Choose</option>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name} ({c.staffRole})
                </option>
              ))}
            </PosSelect>
          </Field>
          <LimitFields value={fields} onChange={setFields} />
          <div className="flex justify-end gap-2">
            <PosButton onClick={onDone}>Cancel</PosButton>
            <PosButton type="submit" variant="primary" disabled={!userId || add.isPending}>
              Add
            </PosButton>
          </div>
        </form>
      )}
    </PosDialog>
  );
}

function EditDialog({ member, onDone }: { member: PosStaffMember; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<PosStaffFields>({
    displayName: member.displayName,
    role: member.role,
    maxDiscountPercent: member.maxDiscountPercent,
    canRefund: member.canRefund,
    canOverridePrice: member.canOverridePrice,
    canOpenDrawer: member.canOpenDrawer,
    canVoid: member.canVoid,
  });
  const save = useMutation({
    mutationFn: () => posApi.updateStaff(member.id, fields),
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't save. Try again.")),
  });
  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title={`Edit ${member.displayName}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Name on the counter and receipts">
          <PosInput value={fields.displayName ?? ''} maxLength={40} onChange={(e) => setFields({ ...fields, displayName: e.target.value })} />
        </Field>
        <LimitFields value={fields} onChange={setFields} ownerRow={member.isOwner} />
        <div className="flex justify-end gap-2">
          <PosButton onClick={onDone}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!fields.displayName?.trim() || save.isPending}>
            Save
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

function PinDialog({ staffId, name, onDone }: { staffId: string; name: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const valid = /^\d{4,6}$/.test(pin);
  const save = useMutation({
    mutationFn: () => posApi.setPin(staffId, pin),
    onSuccess: () => {
      toast.success('PIN saved');
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      queryClient.invalidateQueries({ queryKey: POS_CASHIERS_KEY });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't save the PIN. Try again.")),
  });
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title={`Set ${name} PIN`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && pin === again) save.mutate();
        }}
        className="space-y-4"
      >
        <p className="text-sm text-pos-muted">4 to 6 digits, not easy to guess (no 1111 or 1234). The old PIN stops working straight away.</p>
        <Field label="New PIN">
          <PosInput type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="font-mono tracking-[0.3em]" />
        </Field>
        <Field label="Type it again">
          <PosInput type="password" inputMode="numeric" autoComplete="new-password" value={again} onChange={(e) => setAgain(digits(e.target.value))} className="font-mono tracking-[0.3em]" />
        </Field>
        {again.length > 0 && pin !== again && <p className="text-sm text-pos-alert">The two PINs are different.</p>}
        <div className="flex justify-end gap-2">
          <PosButton onClick={onDone}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!valid || pin !== again || save.isPending}>
            Save PIN
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}
