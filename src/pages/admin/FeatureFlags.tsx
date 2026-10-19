import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FlaskConical, Loader2, Plus, Search, ToggleRight, Trash2, X } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { featureFlagsApi, PLAN_CODES, type FeatureFlagDetail, type FeatureFlagRow, type FlagMode, type PlanCode } from '../../lib/featureFlagsApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

const MODE_LABEL: Record<FlagMode, string> = { OFF: 'Off', LIST: 'Listed stores', PERCENT: 'A share', PLANS: 'Plans', ALL: 'Everyone' };
const MODE_HINT: Record<FlagMode, string> = {
  OFF: 'Nobody has it, not even the listed stores.',
  LIST: 'Only the stores on the list below.',
  PERCENT: 'A fixed share of all stores. A store keeps its place when you raise the share, so nobody loses it on the way up.',
  PLANS: 'Every store on the plans you pick.',
  ALL: 'Every store. Once it has been on for everyone for a while, take the check out of the code and delete the flag.',
};
const PLAN_LABEL: Record<PlanCode, string> = { FREE: 'Free', BASIC: 'Basic', STARTER: 'Starter', ADVANCE: 'Advance' };

function summary(f: Pick<FeatureFlagRow, 'mode' | 'percent' | 'planCodes' | 'includeBeta'> & { listedStores: number }): string {
  if (f.mode === 'OFF') return 'Off';
  if (f.mode === 'ALL') return 'On for every store';
  const extra = [f.listedStores ? `${f.listedStores} listed store${f.listedStores === 1 ? '' : 's'}` : '', f.includeBeta ? 'beta stores' : ''].filter(Boolean);
  const main = f.mode === 'PERCENT' ? `${f.percent}% of stores` : f.mode === 'PLANS' ? f.planCodes.map((p) => PLAN_LABEL[p]).join(', ') : '';
  return [main, ...extra].filter(Boolean).join(' + ') || 'Nobody yet';
}

function modeTone(mode: FlagMode) {
  return mode === 'OFF' ? 'bg-neutral-100 text-neutral-600' : mode === 'ALL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800';
}

/**
 * Super Admin > Platform > Feature flags (super-admin-new.md Step 1): give a new or risky feature to a few stores first, then a share, then everyone.
 * A developer puts the check in the code (`features.isOn(vendorId, 'KEY')` on the server, `useFeature('KEY')` in the dashboard); this page decides who has it.
 */
export default function FeatureFlags() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-feature-flags'], queryFn: featureFlagsApi.list });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showBeta, setShowBeta] = useState(false);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ToggleRight className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Feature flags</h1>
            <p className="max-w-2xl text-sm text-regantify-text-muted">
              Give a new feature to a few stores first, then a share of stores, then everyone. A flag that doesn't exist, or is off, means nobody has the feature. A
              change reaches every server within a minute.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white">
          <Plus size={16} /> New flag
        </button>
      </div>

      {data && (
        <button
          type="button"
          onClick={() => setShowBeta(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-left text-sm hover:bg-neutral-50"
        >
          <FlaskConical size={18} className="shrink-0 text-violet-600" />
          <span className="text-regantify-text">
            <span className="font-medium">{data.betaStores}</span> {data.betaStores === 1 ? 'store is' : 'stores are'} in the beta program
            <span className="text-regantify-text-muted"> (owners join in Settings). A flag can include them with one switch.</span>
          </span>
        </button>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : error || !data ? (
        <p className="py-10 text-center text-sm text-red-600">Could not load the flags.</p>
      ) : data.flags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-regantify-text">No flags yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-regantify-text-muted">
            Create one with the same key the code checks, for example <span className="font-mono text-xs">NEW_CHECKOUT</span>. It starts off.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
          {data.flags.map((f) => (
            <button key={f.key} type="button" onClick={() => setOpenKey(f.key)} className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-neutral-50">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-regantify-text">
                  {f.label}
                  <span className="font-mono text-[11px] font-normal text-regantify-text-muted">{f.key}</span>
                </p>
                {f.description && <p className="mt-0.5 line-clamp-2 text-xs text-regantify-text-muted">{f.description}</p>}
                <p className="mt-1 text-xs text-regantify-text">{summary(f)}</p>
                {f.stale && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-800">
                    <AlertTriangle size={12} /> On for everyone for over 30 days. Remove the check from the code, then delete this flag.
                  </p>
                )}
                <p className="mt-1 text-[11px] text-regantify-text-muted">
                  Changed by {f.updatedBy}, {formatDhakaDateTime(f.updatedAt)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${modeTone(f.mode)}`}>{MODE_LABEL[f.mode]}</span>
            </button>
          ))}
        </div>
      )}

      <CreateFlagDialog open={creating} onClose={() => setCreating(false)} onCreated={(key) => setOpenKey(key)} />
      <FlagDialog flagKey={openKey} onClose={() => setOpenKey(null)} />
      <BetaStoresDialog open={showBeta} onClose={() => setShowBeta(false)} />
    </div>
  );
}

function CreateFlagDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (key: string) => void }) {
  const qc = useQueryClient();
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const close = () => {
    setKey('');
    setLabel('');
    setDescription('');
    onClose();
  };
  const m = useMutation({
    mutationFn: () => featureFlagsApi.create({ key, label: label.trim(), description: description.trim() || undefined }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success(`${f.key} created. It is off until you turn it on.`);
      close();
      onCreated(f.key);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create the flag.')),
  });
  const keyOk = /^[A-Z][A-Z0-9_]{2,59}$/.test(key);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title="New feature flag" maxWidth="max-w-md">
      <div className="space-y-4 p-6 pt-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 60))}
            placeholder="NEW_CHECKOUT"
            className={`${field} font-mono`}
          />
          <p className="mt-1 text-xs text-regantify-text-muted">Exactly what the code checks. It can't be changed later.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Name</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="New checkout page" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">What it does (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} className={field} />
        </div>
        <button
          type="button"
          disabled={!keyOk || label.trim().length < 3 || m.isPending}
          onClick={() => m.mutate()}
          className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {m.isPending ? 'Creating...' : 'Create (off)'}
        </button>
      </div>
    </Dialog>
  );
}

function FlagDialog({ flagKey, onClose }: { flagKey: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: flag, isLoading } = useQuery({ queryKey: ['admin-feature-flag', flagKey], queryFn: () => featureFlagsApi.get(flagKey!), enabled: flagKey !== null });

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<FlagMode>('OFF');
  const [percent, setPercent] = useState(10);
  const [plans, setPlans] = useState<PlanCode[]>([]);
  const [includeBeta, setIncludeBeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => {
    if (!flag) return;
    setLabel(flag.label);
    setDescription(flag.description ?? '');
    setMode(flag.mode);
    setPercent(flag.percent || 10);
    setPlans(flag.planCodes);
    setIncludeBeta(flag.includeBeta);
    setConfirmDelete('');
  }, [flag]);

  const fresh = (f: FeatureFlagDetail) => {
    qc.setQueryData(['admin-feature-flag', f.key], f);
    qc.invalidateQueries({ queryKey: ['admin-feature-flags'] });
  };
  const save = useMutation({
    mutationFn: () => featureFlagsApi.update(flagKey!, { label: label.trim(), description: description.trim(), mode, percent: mode === 'PERCENT' ? percent : undefined, planCodes: plans, includeBeta }),
    onSuccess: (f) => {
      fresh(f);
      toast.success(`Saved. ${f.reach.on} of ${f.reach.total} stores have it now.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the flag.')),
  });
  const remove = useMutation({
    mutationFn: () => featureFlagsApi.remove(flagKey!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Flag deleted. The feature is off for every store.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the flag.')),
  });

  const dirty =
    flag &&
    (label.trim() !== flag.label ||
      description.trim() !== (flag.description ?? '') ||
      mode !== flag.mode ||
      (mode === 'PERCENT' && percent !== flag.percent) ||
      plans.slice().sort().join() !== flag.planCodes.slice().sort().join() ||
      includeBeta !== flag.includeBeta);
  const valid = label.trim().length >= 3 && (mode !== 'PLANS' || plans.length > 0) && (mode !== 'PERCENT' || (percent >= 1 && percent <= 100));

  return (
    <Dialog open={flagKey !== null} onOpenChange={(o) => !o && onClose()} title={flag ? flag.label : 'Feature flag'} maxWidth="max-w-2xl">
      {isLoading || !flag ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-6 p-6 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-regantify-text-muted">
            <span className="font-mono text-regantify-text">{flag.key}</span>
            <span>
              On for <span className="font-medium text-regantify-text">{flag.reach.on}</span> of {flag.reach.total} stores now
            </span>
            <span>Created by {flag.createdBy}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Name</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">What it does</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className={field} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-regantify-text">Who has it</p>
            <div className="flex flex-wrap gap-1 rounded-xl bg-regantify-search p-1">
              {(Object.keys(MODE_LABEL) as FlagMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${mode === m ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-regantify-text-muted">{MODE_HINT[mode]}</p>

            {mode === 'PERCENT' && (
              <div className="mt-3 flex items-center gap-3">
                <input type="range" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="flex-1 accent-regantify-cta" />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className={`${field} w-20 text-right`}
                />
                <span className="text-sm text-regantify-text-muted">%</span>
              </div>
            )}

            {mode === 'PLANS' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {PLAN_CODES.map((p) => {
                  const on = plans.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlans((cur) => (on ? cur.filter((x) => x !== p) : [...cur, p]))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${on ? 'border-regantify-cta bg-regantify-cta/10 font-medium text-regantify-text' : 'border-black/10 text-regantify-text-muted'}`}
                    >
                      {PLAN_LABEL[p]}
                    </button>
                  );
                })}
              </div>
            )}

            {(mode === 'LIST' || mode === 'PERCENT' || mode === 'PLANS') && (
              <label className="mt-3 flex items-center gap-2 text-sm text-regantify-text">
                <input type="checkbox" checked={includeBeta} onChange={(e) => setIncludeBeta(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
                Also every store in the beta program
              </label>
            )}
          </div>

          <button
            type="button"
            disabled={!dirty || !valid || save.isPending}
            onClick={() => save.mutate()}
            className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {save.isPending ? 'Saving...' : 'Save'}
          </button>

          <StoreList flag={flag} onChange={fresh} />

          <div className="rounded-xl border border-red-200 p-4">
            <p className="text-sm font-medium text-red-700">Delete this flag</p>
            <p className="mt-0.5 text-xs text-regantify-text-muted">
              The feature turns off for every store, because a flag that doesn't exist is off. Do this only after the check is gone from the code. Type{' '}
              <span className="font-mono">{flag.key}</span> to confirm.
            </p>
            <div className="mt-2 flex gap-2">
              <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className={`${field} font-mono`} />
              <button
                type="button"
                disabled={confirmDelete !== flag.key || remove.isPending}
                onClick={() => remove.mutate()}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-300 px-3 text-sm font-medium text-red-700 disabled:opacity-40"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** The flag's own store list: stores that always get it in Listed / Share / Plans mode. */
function StoreList({ flag, onChange }: { flag: FeatureFlagDetail; onChange: (f: FeatureFlagDetail) => void }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: found, isFetching } = useQuery({
    queryKey: ['admin-flag-store-search', term],
    queryFn: () => adminApi.listVendors({ search: term, perPage: 8 }),
    enabled: term.length >= 2,
  });
  const add = useMutation({
    mutationFn: (vendorId: string) => featureFlagsApi.addStores(flag.key, [vendorId]),
    onSuccess: (f) => {
      onChange(f);
      setSearch('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add the store.')),
  });
  const drop = useMutation({
    mutationFn: (vendorId: string) => featureFlagsApi.removeStore(flag.key, vendorId),
    onSuccess: onChange,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove the store.')),
  });
  const listed = new Set(flag.stores.map((s) => s.id));

  return (
    <div>
      <p className="text-sm font-medium text-regantify-text">Listed stores ({flag.stores.length})</p>
      <p className="mb-2 text-xs text-regantify-text-muted">
        {flag.mode === 'OFF' ? 'Kept for when you turn the flag on.' : flag.mode === 'ALL' ? 'Everyone has it now, so the list makes no difference.' : 'These always get it, on top of the rule above.'}
      </p>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Add a store: name, subdomain or phone" className={`${field} pl-9`} />
        {term.length >= 2 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
            {isFetching && !found ? (
              <p className="px-3 py-2 text-xs text-regantify-text-muted">Searching...</p>
            ) : !found || found.vendors.length === 0 ? (
              <p className="px-3 py-2 text-xs text-regantify-text-muted">No store found.</p>
            ) : (
              found.vendors.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={listed.has(v.id) || add.isPending}
                  onClick={() => add.mutate(v.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  <span className="min-w-0 truncate">
                    {v.storeName} <span className="text-xs text-regantify-text-muted">{v.subdomain}</span>
                  </span>
                  <span className="shrink-0 text-xs text-regantify-text-muted">{listed.has(v.id) ? 'Listed' : 'Add'}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {flag.stores.length > 0 && (
        <ul className="mt-2 divide-y divide-black/5 rounded-xl border border-black/5">
          {flag.stores.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {s.storeName} <span className="text-xs text-regantify-text-muted">{s.subdomain}</span>
                {s.betaOptIn && <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">Beta</span>}
              </span>
              <button type="button" onClick={() => drop.mutate(s.id)} disabled={drop.isPending} aria-label={`Remove ${s.storeName}`} className="text-regantify-text-muted hover:text-red-600">
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BetaStoresDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-beta-stores'], queryFn: featureFlagsApi.betaStores, enabled: open });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Stores in the beta program" maxWidth="max-w-md">
      <div className="p-6 pt-3">
        <p className="mb-3 text-xs text-regantify-text-muted">The owners asked to get new features early. A flag with "Also every store in the beta program" is on for them.</p>
        {isLoading ? (
          <Loader2 className="mx-auto animate-spin text-neutral-400" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No store has joined yet.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm">
            {data.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {s.storeName} <span className="text-xs text-regantify-text-muted">{s.subdomain}</span>
                </span>
                {s.betaOptInAt && <span className="shrink-0 text-xs text-regantify-text-muted">{formatDhakaDateTime(s.betaOptInAt)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
