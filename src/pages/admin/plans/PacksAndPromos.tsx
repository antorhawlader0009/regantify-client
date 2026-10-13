import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { adminCatalogApi, type AdminPack, type AdminPromo, type PackKind, type PromoInput } from '../../../lib/adminCatalogApi';
import type { PlanCode } from '../../../lib/plansApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatTaka } from '../../../components/analytics/format';
import { Dialog } from '../../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const label = 'mb-1.5 block text-sm font-medium text-regantify-text';
const PLANS: PlanCode[] = ['BASIC', 'STARTER', 'ADVANCE'];

/** Add or edit one pack. The amount of a pack that was already bought is locked (old payments and receipts depend on it). */
function PackDialog({ kind, pack, open, onClose, onDone }: { kind: PackKind; pack: AdminPack | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(pack?.name ?? '');
  const [amount, setAmount] = useState(String(pack?.amount ?? ''));
  const [price, setPrice] = useState(String(pack?.price ?? ''));
  const [badge, setBadge] = useState(pack?.badge ?? '');
  const unit = kind === 'sms' ? 'SMS' : 'AI credits';
  const locked = !!pack && pack.sold > 0;
  const m = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), amount: Number(amount), price: Number(price), badge: badge.trim() || null };
      return pack ? adminCatalogApi.updatePack(kind, pack.id, body) : adminCatalogApi.createPack(kind, body);
    },
    onSuccess: () => {
      toast.success(pack ? 'Pack saved.' : 'Pack added.');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the pack.')),
  });
  const ok = name.trim().length > 0 && Number(amount) >= 1 && Number.isInteger(Number(amount)) && Number(price) >= 1;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">{pack ? 'Edit pack' : `Add an ${kind === 'sms' ? 'SMS' : 'AI credit'} pack`}</h2>
        <div>
          <label className={label}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>How many {unit}</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} className={`${field} disabled:opacity-50`} />
          </div>
          <div>
            <label className={label}>Price (৳)</label>
            <input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
          </div>
        </div>
        {locked && <p className="text-xs text-amber-700">{pack!.sold} store{pack!.sold === 1 ? '' : 's'} already bought this pack, so its amount can’t change. Hide it and add a new pack for a different amount.</p>}
        <div>
          <label className={label}>Label (optional, up to 24 letters)</label>
          <input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} placeholder="Best value" className={field} />
        </div>
        <p className="text-xs text-regantify-text-muted">A new price applies to purchases started from now on. A payment already started keeps the price it began with.</p>
        <button type="button" disabled={!ok || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}

function Packs({ kind, rows }: { kind: PackKind; rows: AdminPack[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminPack | null>(null);
  const [adding, setAdding] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-packs'] });
  const toggle = useMutation({
    mutationFn: (p: AdminPack) => adminCatalogApi.updatePack(kind, p.id, { active: !p.active }),
    onSuccess: refresh,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')),
  });
  const move = useMutation({
    mutationFn: ({ i, dir }: { i: number; dir: -1 | 1 }) => {
      const ids = rows.map((r) => r.id);
      [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
      return adminCatalogApi.reorderPacks(kind, ids);
    },
    onSuccess: refresh,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not reorder.')),
  });
  const unit = kind === 'sms' ? 'SMS' : 'credits';
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-regantify-text-muted">Stores see the shown packs in this order. A pack that was bought can be hidden, never deleted, so old receipts stay right.</p>
        <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white">Add a pack</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Pack</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Per 1,000</th>
              <th className="px-4 py-3 text-right">Bought</th>
              <th className="px-4 py-3">Shown to stores</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className={`border-t border-black/5 ${p.active ? '' : 'opacity-60'}`}>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ i, dir: -1 })} className="rounded border border-black/10 p-1 disabled:opacity-30"><ArrowUp size={12} /></button>
                    <button type="button" aria-label="Move down" disabled={i === rows.length - 1 || move.isPending} onClick={() => move.mutate({ i, dir: 1 })} className="rounded border border-black/10 p-1 disabled:opacity-30"><ArrowDown size={12} /></button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-regantify-text">{p.name}{p.badge && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">{p.badge}</span>}</p>
                  <p className="text-xs text-regantify-text-muted">{p.amount.toLocaleString('en-US')} {unit} · {p.id}</p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatTaka(p.price)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-regantify-text-muted">{formatTaka((p.price / p.amount) * 1000)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.sold}</td>
                <td className="px-4 py-2.5">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={p.active} onChange={() => toggle.mutate(p)} disabled={toggle.isPending} /> {p.active ? 'Shown' : 'Hidden'}
                  </label>
                </td>
                <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => setEditing(p)} className="rounded-lg border border-black/10 px-3 py-1 text-xs hover:bg-regantify-content">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <PackDialog key={editing.id} kind={kind} pack={editing} open onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />}
      {adding && <PackDialog kind={kind} pack={null} open onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

function PromoDialog({ promo, open, onClose, onDone }: { promo: AdminPromo | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(promo?.code ?? '');
  const [type, setType] = useState<'percent' | 'amount'>(promo?.amountOff ? 'amount' : 'percent');
  const [value, setValue] = useState(String(promo?.percentOff ?? promo?.amountOff ?? ''));
  const [plans, setPlans] = useState<PlanCode[]>(promo?.planCodes ?? []);
  const [maxUses, setMaxUses] = useState(promo?.maxUses ? String(promo.maxUses) : '');
  const [once, setOnce] = useState(promo?.oncePerStore ?? true);
  const [expires, setExpires] = useState(promo?.expiresAt ? promo.expiresAt.slice(0, 10) : '');
  const [note, setNote] = useState(promo?.note ?? '');
  const used = (promo?.usedCount ?? 0) > 0;
  const m = useMutation({
    mutationFn: () => {
      const n = Number(value);
      const body: PromoInput = {
        planCodes: plans,
        maxUses: maxUses ? Number(maxUses) : null,
        oncePerStore: once,
        expiresAt: expires ? new Date(`${expires}T23:59:59+06:00`).toISOString() : null,
        note: note.trim() || null,
        ...(used ? {} : type === 'percent' ? { percentOff: n, amountOff: null } : { amountOff: n, percentOff: null }),
      };
      return promo ? adminCatalogApi.updatePromo(promo.id, body) : adminCatalogApi.createPromo({ ...body, code: code.trim() });
    },
    onSuccess: () => {
      toast.success(promo ? 'Promo code saved.' : 'Promo code made.');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the promo code.')),
  });
  const ok = (promo || /^[A-Za-z0-9_-]{3,24}$/.test(code.trim())) && (used || Number(value) > 0);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">{promo ? `Edit ${promo.code}` : 'Make a promo code'}</h2>
        {!promo && (
          <div>
            <label className={label}>Code (3 to 24 letters or numbers)</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={24} placeholder="WELCOME20" className={field} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Takes off</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'percent' | 'amount')} disabled={used} className={`${field} disabled:opacity-50`}>
              <option value="percent">A percent</option>
              <option value="amount">A taka amount</option>
            </select>
          </div>
          <div>
            <label className={label}>{type === 'percent' ? 'Percent (1 to 90)' : 'Taka'}</label>
            <input type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} disabled={used} className={`${field} disabled:opacity-50`} />
          </div>
        </div>
        {used && <p className="text-xs text-amber-700">This code was already used, so its discount can’t change. Switch it off and make a new one.</p>}
        <div>
          <label className={label}>Works for</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {PLANS.map((p) => (
              <label key={p} className="flex items-center gap-1.5">
                <input type="checkbox" checked={plans.includes(p)} onChange={() => setPlans((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))} /> {p.charAt(0) + p.slice(1).toLowerCase()}
              </label>
            ))}
            <span className="text-xs text-regantify-text-muted">{plans.length === 0 ? 'none ticked = every paid plan' : ''}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Most uses (empty = no limit)</label>
            <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Last day (empty = no end)</label>
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={field} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={once} onChange={(e) => setOnce(e.target.checked)} /> Each store can use it once
        </label>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note for the team (optional)" className={field} />
        <p className="text-xs text-regantify-text-muted">The discount comes off the plan’s monthly price before PayStation is asked for the amount. A plan payment is never less than ৳10.</p>
        <button type="button" disabled={!ok || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}

function Promos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-promos'], queryFn: adminCatalogApi.promos });
  const [editing, setEditing] = useState<AdminPromo | null>(null);
  const [adding, setAdding] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-promos'] });
  const toggle = useMutation({ mutationFn: (p: AdminPromo) => adminCatalogApi.updatePromo(p.id, { active: !p.active }), onSuccess: refresh, onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')) });
  if (isLoading) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-regantify-text-muted">A code is counted as used only when a payment with it goes through. Codes are switched off, not deleted.</p>
        <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white">Make a code</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Takes off</th>
              <th className="px-4 py-3">Plans</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3">Ends</th>
              <th className="px-4 py-3">On</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!data?.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-regantify-text-muted">No promo codes yet.</td></tr>}
            {data?.map((p) => (
              <tr key={p.id} className={`border-t border-black/5 ${p.active ? '' : 'opacity-60'}`}>
                <td className="px-4 py-2.5 font-mono font-medium">{p.code}{p.note && <p className="font-sans text-xs font-normal text-regantify-text-muted">{p.note}</p>}</td>
                <td className="px-4 py-2.5">{p.percentOff ? `${p.percentOff}%` : formatTaka(p.amountOff ?? 0)}</td>
                <td className="px-4 py-2.5">{p.planCodes.length ? p.planCodes.map((c) => c.toLowerCase()).join(', ') : 'every paid plan'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                <td className="px-4 py-2.5">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-4 py-2.5"><input type="checkbox" checked={p.active} onChange={() => toggle.mutate(p)} disabled={toggle.isPending} aria-label={`${p.code} on`} /></td>
                <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => setEditing(p)} className="rounded-lg border border-black/10 px-3 py-1 text-xs hover:bg-regantify-content">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <PromoDialog key={editing.id} promo={editing} open onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />}
      {adding && <PromoDialog promo={null} open onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

/** Super Admin > Plans > Packs & promos (super-admin-plan.md Step 10): prices of SMS and AI Credit packs, and plan promo codes, changed without a deploy. */
export default function PacksAndPromos() {
  const [tab, setTab] = useState<'sms' | 'ai' | 'promos'>('sms');
  const { data, isLoading } = useQuery({ queryKey: ['admin-packs'], queryFn: adminCatalogApi.packs });
  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Packs and promo codes</h1>
      <p className="mb-4 text-sm text-regantify-text-muted">What stores can buy, and what it costs. “Most popular” and hiding a plan are on each plan’s edit page (Manage Plans).</p>
      <div className="mb-5 flex gap-1 border-b border-black/5">
        {(
          [
            ['sms', 'SMS packs'],
            ['ai', 'AI Credit packs'],
            ['promos', 'Plan promo codes'],
          ] as const
        ).map(([id, text]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium ${tab === id ? 'border-b-2 border-regantify-cta text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}>
            {text}
          </button>
        ))}
      </div>
      {tab === 'promos' ? <Promos /> : isLoading || !data ? <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" /> : <Packs key={tab} kind={tab} rows={data[tab]} />}
    </div>
  );
}
