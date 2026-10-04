import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, LockOpen, Plus } from 'lucide-react';
import { PosPage } from '../../../components/pos/PosLayout';
import { useCashierUnlock } from '../../../components/pos/CashierUnlock';
import { Field, Panel, PosButton, PosDialog, PosInput, PosTextarea, taka } from '../../../components/pos/ui';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { posApi, type PosClosedSession, type PosMe, type PosRegister } from '../../../lib/posApi';

const REGISTERS_KEY = ['pos', 'registers'] as const;
const SESSIONS_KEY = ['pos', 'sessions'] as const;

const dhakaTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** POS > Registers: each counter, its shift (open with a float, close with a cash count), and past shifts. */
export default function PosRegistersPage() {
  return <PosPage title="Registers">{(me) => <RegistersBody me={me} />}</PosPage>;
}

function RegistersBody({ me }: { me: PosMe }) {
  const query = useQuery({ queryKey: REGISTERS_KEY, queryFn: posApi.registers });
  const [opening, setOpening] = useState<PosRegister | null>(null);
  const [closing, setClosing] = useState<PosRegister | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<PosRegister | null>(null);

  if (query.isPending) return <p className="text-sm text-pos-muted">Loading…</p>;
  if (query.isError) return <p className="text-sm">{apiErrorMessage(query.error, "Registers couldn't load. Refresh the page to try again.")}</p>;

  const active = query.data.filter((r) => r.active);
  const off = query.data.filter((r) => !r.active);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-pos-muted">Open a counter with the cash in the drawer, close it with a cash count.</p>
          {me.isManager && (
            <PosButton onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden />
              Add register
            </PosButton>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((r) => (
            <RegisterCard key={r.id} register={r} me={me} onOpen={() => setOpening(r)} onClose={() => setClosing(r)} onRename={() => setRenaming(r)} />
          ))}
        </div>
        {off.length > 0 && <TurnedOff registers={off} me={me} />}
      </section>

      <SessionHistory />

      {opening && <OpenDialog register={opening} onDone={() => setOpening(null)} />}
      {closing?.openSession && <CloseDialog register={closing} onDone={() => setClosing(null)} />}
      {adding && <NameDialog title="Add register" onDone={() => setAdding(false)} save={(name) => posApi.addRegister(name)} />}
      {renaming && (
        <NameDialog
          title="Rename register"
          initial={renaming.name}
          onDone={() => setRenaming(null)}
          save={(name) => posApi.updateRegister(renaming.id, { name })}
        />
      )}
    </div>
  );
}

function RegisterCard({
  register,
  me,
  onOpen,
  onClose,
  onRename,
}: {
  register: PosRegister;
  me: PosMe;
  onOpen: () => void;
  onClose: () => void;
  onRename: () => void;
}) {
  const queryClient = useQueryClient();
  const turnOff = useMutation({
    mutationFn: () => posApi.updateRegister(register.id, { active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REGISTERS_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't turn this register off.")),
  });
  const s = register.openSession;

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{register.name}</h2>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-sm ${s ? 'text-pos-go' : 'text-pos-muted'}`}>
            {s ? <LockOpen size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
            {s ? `Open since ${dhakaTime(s.openedAt)}` : 'Closed'}
          </p>
        </div>
        {me.isManager && (
          <div className="flex gap-1">
            <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={onRename}>
              Rename
            </PosButton>
            {!s && (
              <PosButton variant="quiet" className="h-8 px-2 text-xs" onClick={() => turnOff.mutate()} disabled={turnOff.isPending}>
                Turn off
              </PosButton>
            )}
          </div>
        )}
      </div>

      {s && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-pos-muted">Opened by</dt>
          <dd className="text-right">{s.openedByName}</dd>
          <dt className="text-pos-muted">Float</dt>
          <dd className="text-right tabular-nums">{taka(s.openingFloat)}</dd>
          <dt className="text-pos-muted">Sales</dt>
          <dd className="text-right tabular-nums">
            {s.salesCount} · {taka(s.salesTotal)}
          </dd>
          <dt className="text-pos-muted">Cash expected</dt>
          <dd className="text-right font-medium tabular-nums">{taka(s.expectedCash)}</dd>
        </dl>
      )}

      <div className="mt-auto">
        {s ? (
          <PosButton className="w-full" onClick={onClose}>
            Close register
          </PosButton>
        ) : (
          <PosButton variant="primary" className="w-full" onClick={onOpen}>
            Open register
          </PosButton>
        )}
      </div>
    </Panel>
  );
}

function TurnedOff({ registers, me }: { registers: PosRegister[]; me: PosMe }) {
  const queryClient = useQueryClient();
  const turnOn = useMutation({
    mutationFn: (id: string) => posApi.updateRegister(id, { active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REGISTERS_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't turn this register on.")),
  });
  return (
    <div className="mt-4 text-sm text-pos-muted">
      Turned off:{' '}
      {registers.map((r, i) => (
        <span key={r.id}>
          {i > 0 && ', '}
          {r.name}
          {me.isManager && (
            <button type="button" className="ml-1 font-medium text-pos-ink underline" onClick={() => turnOn.mutate(r.id)}>
              turn on
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/** A money field that keeps what's typed as text and reports a number (or null when not a valid amount). */
function parseMoney(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? Math.round(n * 100) / 100 : null;
}

function OpenDialog({ register, onDone }: { register: PosRegister; onDone: () => void }) {
  const queryClient = useQueryClient();
  const unlock = useCashierUnlock();
  const [float, setFloat] = useState('');
  const amount = parseMoney(float);

  const open = useMutation({
    mutationFn: async () => {
      const { token } = await unlock.unlock();
      return posApi.openSession(register.id, amount ?? 0, token);
    },
    onSuccess: () => {
      toast.success(`${register.name} is open`);
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      onDone();
    },
    onError: (err) => {
      unlock.clearPin();
      toast.error(apiErrorMessage(err, "Couldn't open the register. Try again."));
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (unlock.ready && amount !== null) open.mutate();
  }

  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title={`Open ${register.name}`}>
      <form onSubmit={submit} className="space-y-4">
        {unlock.fields}
        <Field label="Cash in the drawer now (float)" hint="Count the notes and coins you're starting with. Type 0 for an empty drawer.">
          <PosInput inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} placeholder="e.g. 2000" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <PosButton onClick={onDone}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!unlock.ready || amount === null || open.isPending}>
            {open.isPending ? 'Opening…' : 'Open register'}
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

function CloseDialog({ register, onDone }: { register: PosRegister; onDone: () => void }) {
  const queryClient = useQueryClient();
  const unlock = useCashierUnlock();
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<PosClosedSession | null>(null);
  const amount = parseMoney(counted);
  const session = register.openSession!;

  const close = useMutation({
    mutationFn: async () => {
      const { token } = await unlock.unlock();
      return posApi.closeSession(session.id, amount ?? 0, note, token);
    },
    onSuccess: (closed) => {
      setResult(closed);
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
    onError: (err) => {
      unlock.clearPin();
      toast.error(apiErrorMessage(err, "Couldn't close the register. Try again."));
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (unlock.ready && amount !== null) close.mutate();
  }

  if (result) {
    const variance = Number(result.variance);
    return (
      <PosDialog open onOpenChange={(o) => !o && onDone()} title={`${register.name} is closed`}>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-pos-muted">Sales</dt>
          <dd className="text-right tabular-nums">
            {result.zReport?.salesCount ?? 0} · {taka(result.zReport?.salesTotal ?? 0)}
          </dd>
          <dt className="text-pos-muted">Cash expected</dt>
          <dd className="text-right tabular-nums">{taka(result.expectedCash)}</dd>
          <dt className="text-pos-muted">Cash counted</dt>
          <dd className="text-right tabular-nums">{taka(result.countedCash)}</dd>
          <dt className="font-medium">{variance === 0 ? 'Difference' : variance < 0 ? 'Short' : 'Over'}</dt>
          <dd className={`text-right font-semibold tabular-nums ${variance < 0 ? 'text-pos-alert' : ''}`}>{taka(Math.abs(variance))}</dd>
        </dl>
        <div className="mt-5 flex justify-end">
          <PosButton variant="primary" onClick={onDone}>
            Done
          </PosButton>
        </div>
      </PosDialog>
    );
  }

  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title={`Close ${register.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-pos-muted">
          Count all the cash in the drawer, then enter it. The difference from what's expected is saved with the shift.
        </p>
        {unlock.fields}
        <Field label="Cash counted">
          <PosInput inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="e.g. 7450" />
        </Field>
        <Field label="Note (optional)" hint="For example why the cash is short or over.">
          <PosTextarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <PosButton onClick={onDone}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!unlock.ready || amount === null || close.isPending}>
            {close.isPending ? 'Closing…' : 'Close register'}
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

function NameDialog({ title, initial = '', save, onDone }: { title: string; initial?: string; save: (name: string) => Promise<unknown>; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial);
  const mutation = useMutation({
    mutationFn: () => save(name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REGISTERS_KEY });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Couldn't save. Try again.")),
  });
  return (
    <PosDialog open onOpenChange={(o) => !o && onDone()} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Name" hint="For example Counter 2 or Upstairs.">
          <PosInput value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <PosButton onClick={onDone}>Cancel</PosButton>
          <PosButton type="submit" variant="primary" disabled={!name.trim() || mutation.isPending}>
            Save
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

function SessionHistory() {
  const query = useQuery({ queryKey: [...SESSIONS_KEY, 1], queryFn: () => posApi.sessions({ page: 1, perPage: 20 }) });
  if (!query.isSuccess || query.data.sessions.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Recent shifts</h2>
      <div className="overflow-x-auto rounded-[10px] border border-pos-line bg-pos-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-pos-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Register</th>
              <th className="px-4 py-2.5 font-medium">Opened</th>
              <th className="px-4 py-2.5 font-medium">Closed</th>
              <th className="px-4 py-2.5 text-right font-medium">Float</th>
              <th className="px-4 py-2.5 text-right font-medium">Expected</th>
              <th className="px-4 py-2.5 text-right font-medium">Counted</th>
              <th className="px-4 py-2.5 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {query.data.sessions.map((s) => {
              const variance = s.variance === null ? null : Number(s.variance);
              return (
                <tr key={s.id} className="border-t border-pos-line">
                  <td className="px-4 py-2.5">{s.register.name}</td>
                  <td className="px-4 py-2.5">
                    {dhakaTime(s.openedAt)} <span className="text-pos-muted">· {s.openedByName}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.closedAt ? (
                      <>
                        {dhakaTime(s.closedAt)} <span className="text-pos-muted">· {s.closedByName}</span>
                      </>
                    ) : (
                      <span className="text-pos-go">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{taka(s.openingFloat)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.expectedCash === null ? '' : taka(s.expectedCash)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.countedCash === null ? '' : taka(s.countedCash)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${variance !== null && variance < 0 ? 'text-pos-alert' : ''}`}>
                    {variance === null ? '' : variance === 0 ? taka(0) : `${variance < 0 ? 'Short ' : 'Over '}${taka(Math.abs(variance))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
