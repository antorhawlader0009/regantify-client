import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Eye, Loader2, Plus, Search, Store, Trash2 } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { dhakaInputToIso, isoToDhakaInput } from '../../lib/dhakaInput';
import {
  shopAdminApi,
  type ShopAdminProduct,
  type ShopAdminStore,
  type ShopBanner,
  type ShopBannerInput,
  type ShopCategoryInput,
  type ShopCategoryRow,
  type ShopCollection,
  type ShopCollectionInput,
  type ShopControlUpdate,
  type ShopOverview,
  type ShopRanking,
  type ShopRules,
  type ShopWeightKey,
} from '../../lib/shopAdminApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

// A box without a width, for the narrow number boxes and selects (`field` is full width; adding w-24 to it loses to w-full).
const fieldBox = 'rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const field = `w-full ${fieldBox}`;
const panel = 'rounded-xl border border-line bg-white';
const primary = 'rounded-lg bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50';
const secondary = 'rounded-lg border border-line px-3 py-1.5 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-50';

const TABS = [
  ['overview', 'Overview'],
  ['rules', 'Rules and ranking'],
  ['stores', 'Stores'],
  ['products', 'Products'],
  ['categories', 'Categories'],
  ['search', 'Search'],
  ['home', 'Home page'],
] as const;
type Tab = (typeof TABS)[number][0];

const JOB_LABEL: Record<string, string> = {
  'shop-index-changes': 'Product changes',
  'shop-index-prices': 'Price changes',
  'shop-store-pass': 'Store check',
  'shop-index-nightly': 'Nightly rebuild',
  'shop-ranking': 'Ranking',
};

const WEIGHT_LABEL: Record<ShopWeightKey, string> = {
  sales: 'Sales (recent sales count more)',
  quality: 'Quality (reviews, few returns)',
  completeness: 'Complete listing (photos, description)',
  storeTrust: 'Store trust',
  freshness: 'New products',
};

const onError = (err: unknown) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.'));
const when = (iso: string | null | undefined) => (iso ? formatDhakaDateTime(iso) : 'Never');

/**
 * Super Admin > Platform > Shop (SHOP-plan.md 4.7, Step 9): everything about Regantify Shop that the platform team decides. Who appears (rules,
 * blocked stores), how products are ordered (ranking, pins, featured), what search understands (synonyms, the words people search), the home page
 * (banners, collections) and the platform category list. Every change is in the admin action log. The Shop itself turns on with the SHOP kill
 * switch and the SHOP feature flag, which stay on their own pages.
 */
export default function AdminShop() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (TABS.some(([k]) => k === params.get('tab')) ? (params.get('tab') as Tab) : 'overview'));
  const linkedQ = params.get('q') ?? '';
  const overview = useQuery({ queryKey: ['admin-shop-overview'], queryFn: shopAdminApi.overview });

  return (
    <div className="max-w-6xl space-y-5">
      <header className="flex items-start gap-3">
        <Store className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Regantify Shop</h1>
          <p className="max-w-2xl text-sm text-regantify-text-muted">
            The public marketplace with every store's products. Stores join from their own dashboard; here you set who qualifies, how products are ordered and
            what the home page shows. Buying always happens on each store's own page.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === key ? 'border-regantify-cta font-medium text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {overview.isLoading || !overview.data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab data={overview.data} />}
          {tab === 'rules' && <RulesTab data={overview.data} />}
          {tab === 'stores' && <StoresTab />}
          {tab === 'products' && <ProductsTab initialQ={linkedQ} />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'search' && <SearchTab data={overview.data} />}
          {tab === 'home' && <HomeTab />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- overview

function OverviewTab({ data }: { data: ShopOverview }) {
  const qc = useQueryClient();
  const recompute = useMutation({
    mutationFn: shopAdminApi.recomputeRanking,
    onSuccess: (r) => {
      if ('skipped' in r) toast.success('The ranking is already being worked out. Try again in a minute.');
      else toast.success(`Scored ${r.products} products from ${r.stores} stores.`);
      qc.invalidateQueries({ queryKey: ['admin-shop-overview'] });
    },
    onError,
  });
  const eligible = data.index.stores.filter((s) => s.eligible).reduce((n, s) => n + s.count, 0);
  const refused = data.index.stores.filter((s) => !s.eligible);
  const flagText = !data.flag ? 'No flag yet (off)' : data.flag.mode === 'OFF' ? 'Off' : data.flag.mode === 'ALL' ? 'Everyone' : data.flag.mode === 'PERCENT' ? `${data.flag.percent}% of stores` : data.flag.mode === 'PLANS' ? `Plans: ${data.flag.planCodes.join(', ')}` : `${data.flag.listedStores} listed stores`;
  const live = data.switchOn && !!data.flag && data.flag.mode !== 'OFF';

  return (
    <div className="space-y-5">
      {!live && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800">
          The Shop is not live. It needs the SHOP switch on (Settings &gt; Kill switches) and the SHOP feature flag given to some stores (Feature flags).
        </p>
      )}
      <GoLiveChecklist items={data.goLive} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kill switch" value={data.switchOn ? 'On' : 'Paused'} />
        <Stat label="Feature flag" value={flagText} />
        <Stat label="Products in the Shop" value={data.index.products.toLocaleString('en-US')} hint={data.index.size ? `Index size ${data.index.size}` : undefined} />
        <Stat label="Stores that qualify" value={eligible.toLocaleString('en-US')} />
      </div>

      <section className={panel}>
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">Stores left out, and why</h2>
        {refused.length === 0 ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">No opted-in store is left out.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Reason</th>
                <th className="px-4 text-right">Stores</th>
              </tr>
            </thead>
            <tbody>
              {refused.map((s) => (
                <tr key={s.refusal ?? 'none'}>
                  <td className="px-4">{s.text ?? s.refusal ?? 'Unknown'}</td>
                  <td className="px-4 text-right tabular-nums">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-regantify-text">Background jobs</h2>
          <button type="button" className={secondary} disabled={recompute.isPending} onClick={() => recompute.mutate()}>
            {recompute.isPending ? 'Working…' : 'Recompute ranking now'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4">Job</th>
              <th className="px-4">Last run</th>
              <th className="px-4">Last error</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((j) => (
              <tr key={j.name}>
                <td className="px-4">{JOB_LABEL[j.name] ?? j.name}</td>
                <td className="px-4">{when(j.lastRunAt)}</td>
                <td className="px-4 text-xs text-red-700">{j.lastError ? `${j.lastError} (${when(j.lastErrorAt)})` : <span className="text-regantify-text-muted">None</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-xs text-regantify-text-muted">
          Last store check {when(data.index.lastStorePassAt)} · last full rebuild {when(data.index.lastFullPassAt)}
        </p>
      </section>
    </div>
  );
}

const GO_LIVE_STATE = {
  DONE: { icon: CheckCircle2, cls: 'text-emerald-700', text: 'Done' },
  TODO: { icon: CircleDashed, cls: 'text-red-700', text: 'To do' },
  CHECK: { icon: Eye, cls: 'text-regantify-text-muted', text: 'Check by hand' },
} as const;

/** Step 13: what is left before the Shop goes public, worked out by the server (DONE / TODO), plus what only a person can confirm (CHECK). */
function GoLiveChecklist({ items }: { items: ShopOverview['goLive'] }) {
  const todo = items.filter((i) => i.state === 'TODO').length;
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-regantify-text">Go-live checklist</h2>
        <span className={`text-xs ${todo ? 'text-red-700' : 'text-emerald-700'}`}>{todo ? `${todo} to do` : 'Nothing left to do here'}</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((i, n) => {
          const s = GO_LIVE_STATE[i.state];
          const Icon = s.icon;
          return (
            <li key={i.key} className="flex gap-3 px-4 py-2.5">
              <Icon size={18} className={`mt-0.5 shrink-0 ${s.cls}`} aria-label={s.text} />
              <div className="min-w-0">
                <p className="text-sm text-regantify-text">
                  {n + 1}. {i.label} <span className={`ml-1 text-xs ${s.cls}`}>{s.text}</span>
                </p>
                <p className="text-xs text-regantify-text-muted">{i.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${panel} px-4 py-3`}>
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-regantify-text">{value}</p>
      {hint && <p className="text-xs text-regantify-text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------- rules and ranking

function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shopAdminApi.updateSettings,
    onSuccess: (d) => {
      qc.setQueryData(['admin-shop-overview'], d);
      toast.success('Saved. Every server uses it within a minute.');
    },
    onError,
  });
}

function RulesTab({ data }: { data: ShopOverview }) {
  const save = useSaveSettings();
  const [rules, setRules] = useState<ShopRules>(data.rules);
  const [ranking, setRanking] = useState<ShopRanking>(data.ranking);
  useEffect(() => setRules(data.rules), [data.rules]);
  useEffect(() => setRanking(data.ranking), [data.ranking]);
  const num = (k: keyof ShopRules) => (e: React.ChangeEvent<HTMLInputElement>) => setRules({ ...rules, [k]: Number(e.target.value) || 0 });
  const total = Object.values(ranking.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={`${panel} space-y-4 p-4`}>
        <h2 className="text-sm font-semibold text-regantify-text">Who can be in the Shop</h2>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={rules.verifiedStoresOnly} onChange={(e) => setRules({ ...rules, verifiedStoresOnly: e.target.checked })} />
          Verified stores only
        </label>
        <NumberRow label="At least this many public products" value={rules.minPublicProducts} onChange={num('minPublicProducts')} min={0} max={1000} />
        <NumberRow label="At least this many delivered orders" value={rules.minDeliveredOrders} onChange={num('minDeliveredOrders')} min={0} max={100000} />
        <div>
          <label className="mb-1.5 block text-sm text-regantify-text">Sold-out products</label>
          <select className={field} value={rules.soldOut} onChange={(e) => setRules({ ...rules, soldOut: e.target.value as ShopRules['soldOut'] })}>
            <option value="LAST">Show them last</option>
            <option value="HIDE">Leave them out</option>
          </select>
        </div>
        <NumberRow label="Most results from one store on a search page" value={rules.perStoreCap} onChange={num('perStoreCap')} min={1} max={24} />
        <NumberRow label="Most products from one store in the home page's top products" value={rules.topPerStore} onChange={num('topPerStore')} min={1} max={10} />
        <button type="button" className={primary} disabled={save.isPending} onClick={() => save.mutate(rules)}>
          Save rules
        </button>
      </section>

      <section className={`${panel} space-y-4 p-4`}>
        <h2 className="text-sm font-semibold text-regantify-text">Ranking</h2>
        <p className="text-xs text-regantify-text-muted">The five parts are scaled so they add up to 100%. Products are scored again every night, or with "Recompute ranking now".</p>
        {(Object.keys(WEIGHT_LABEL) as ShopWeightKey[]).map((k) => (
          <div key={k} className="flex items-center gap-3">
            <label className="flex-1 text-sm text-regantify-text">{WEIGHT_LABEL[k]}</label>
            <input
              type="number"
              min={0}
              max={100}
              className={`${fieldBox} w-24`}
              value={Math.round(ranking.weights[k] * 100)}
              onChange={(e) => setRanking({ ...ranking, weights: { ...ranking.weights, [k]: Math.max(0, Number(e.target.value) || 0) / 100 } })}
            />
            <span className="w-12 text-right text-xs tabular-nums text-regantify-text-muted">{total > 0 ? `${Math.round((ranking.weights[k] / total) * 100)}%` : '–'}</span>
          </div>
        ))}
        <NumberRow
          label="A sale counts half as much after (days)"
          value={ranking.halfLifeDays}
          onChange={(e) => setRanking({ ...ranking, halfLifeDays: Number(e.target.value) || 1 })}
          min={1}
          max={90}
        />
        <div>
          <label className="mb-1.5 block text-sm text-regantify-text">In search, the score counts {Math.round(ranking.scoreShare * 100)}% and the text match the rest</label>
          <input type="range" min={0} max={100} value={Math.round(ranking.scoreShare * 100)} onChange={(e) => setRanking({ ...ranking, scoreShare: Number(e.target.value) / 100 })} className="w-full" />
        </div>
        <button type="button" className={primary} disabled={save.isPending} onClick={() => save.mutate({ ranking })}>
          Save ranking
        </button>
      </section>
    </div>
  );
}

function NumberRow({ label, value, onChange, min, max }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex-1 text-sm text-regantify-text">{label}</label>
      <input type="number" min={min} max={max} className={`${fieldBox} w-28`} value={value} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------- stores

function StoresTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [blocking, setBlocking] = useState<ShopAdminStore | null>(null);
  const [reason, setReason] = useState('');
  const list = useQuery({ queryKey: ['admin-shop-stores', term], queryFn: () => shopAdminApi.stores(term) });
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-shop-stores'] });
    qc.invalidateQueries({ queryKey: ['admin-shop-overview'] });
  };
  const block = useMutation({
    mutationFn: () => shopAdminApi.blockStore(blocking!.id, reason.trim()),
    onSuccess: () => {
      toast.success(`${blocking!.storeName} is out of the Shop.`);
      setBlocking(null);
      setReason('');
      done();
    },
    onError,
  });
  const unblock = useMutation({ mutationFn: shopAdminApi.unblockStore, onSuccess: () => (toast.success('The store can be in the Shop again.'), done()), onError });

  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} onSubmit={() => setTerm(q.trim())} placeholder="Store name or address" />
      <section className={`${panel} overflow-x-auto`}>
        {list.isLoading ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">Loading…</p>
        ) : !list.data?.length ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">No store has joined the Shop yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Store</th>
                <th className="px-4">In the Shop</th>
                <th className="px-4 text-right">Products shown</th>
                <th className="px-4 text-right">Delivered orders</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody>
              {list.data.map((s) => (
                <tr key={s.id}>
                  <td className="px-4">
                    <p className="font-medium text-regantify-text">{s.storeName}</p>
                    <p className="console-id text-xs text-regantify-text-muted">{s.subdomain}</p>
                  </td>
                  <td className="px-4">
                    {s.shopBlockedAt ? (
                      <span className="text-red-700">Removed by Super Admin: {s.shopBlockReason}</span>
                    ) : !s.shopListed ? (
                      <span className="text-regantify-text-muted">Owner turned it off</span>
                    ) : s.shopStore?.eligible ? (
                      <span className="text-emerald-700">Yes</span>
                    ) : (
                      <span className="text-regantify-text-muted">{s.refusalText ?? 'Waiting for the next store check'}</span>
                    )}
                  </td>
                  <td className="px-4 text-right tabular-nums">{s.shopStore ? `${s.shopStore.indexedProducts} of ${s.shopStore.publicProducts}` : '–'}</td>
                  <td className="px-4 text-right tabular-nums">{s.shopStore?.deliveredOrders ?? '–'}</td>
                  <td className="px-4 text-right">
                    {s.shopBlockedAt ? (
                      <button type="button" className={secondary} disabled={unblock.isPending} onClick={() => unblock.mutate(s.id)}>
                        Let back in
                      </button>
                    ) : (
                      <button type="button" className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700" onClick={() => setBlocking(s)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Dialog open={blocking !== null} onOpenChange={(o) => !o && setBlocking(null)} maxWidth="max-w-md">
        {blocking && (
          <div className="space-y-4 p-6">
            <h2 className="font-semibold text-regantify-text">Remove {blocking.storeName} from the Shop</h2>
            <p className="text-sm text-regantify-text-muted">Its products leave the Shop now. Its own store keeps working. The owner sees the reason on their dashboard.</p>
            <textarea className={field} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why (the owner will see this)" />
            <button type="button" className={`${primary} w-full`} disabled={reason.trim().length < 3 || block.isPending} onClick={() => block.mutate()}>
              {block.isPending ? 'Working…' : 'Remove from the Shop'}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function SearchBox({ value, onChange, onSubmit, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string }) {
  return (
    <form
      className="flex max-w-lg gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
        <input className={`${field} pl-9`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
      <button type="submit" className={primary}>
        Search
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------- products

function controlText(c: { hiddenAt: string | null; hiddenReason: string | null; pinRank: number | null; pinUntil: string | null; featuredUntil: string | null } | null): string {
  if (!c) return '';
  const parts: string[] = [];
  if (c.hiddenAt) parts.push(`Hidden${c.hiddenReason ? `: ${c.hiddenReason}` : ''}`);
  if (c.pinRank != null) parts.push(`Pinned #${c.pinRank}${c.pinUntil ? ` until ${formatDhakaDateTime(c.pinUntil)}` : ''}`);
  if (c.featuredUntil) parts.push(`Featured until ${formatDhakaDateTime(c.featuredUntil)}`);
  return parts.join(' · ');
}

function ProductsTab({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ);
  const [term, setTerm] = useState(initialQ.trim());
  const [editing, setEditing] = useState<{ productId: string; name: string; control: ShopAdminProduct['control'] } | null>(null);
  const found = useQuery({ queryKey: ['admin-shop-products', term], queryFn: () => shopAdminApi.products(term), enabled: term.length >= 2 });
  const controls = useQuery({ queryKey: ['admin-shop-controls'], queryFn: shopAdminApi.controls });

  return (
    <div className="space-y-5">
      <SearchBox value={q} onChange={setQ} onSubmit={() => setTerm(q.trim())} placeholder="Product name or product id" />
      {term.length >= 2 && (
        <section className={`${panel} overflow-x-auto`}>
          {found.isLoading ? (
            <p className="px-4 py-3 text-sm text-regantify-text-muted">Searching…</p>
          ) : !found.data?.length ? (
            <p className="px-4 py-3 text-sm text-regantify-text-muted">No product in the Shop matches.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-4">Product</th>
                  <th className="px-4">Store</th>
                  <th className="px-4 text-right">Price</th>
                  <th className="px-4 text-right">Score</th>
                  <th className="px-4" />
                </tr>
              </thead>
              <tbody>
                {found.data.map((p) => (
                  <tr key={p.productId}>
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        {p.photoUrl && <img src={p.photoUrl} alt="" className="h-9 w-9 rounded object-cover" />}
                        <div>
                          <p className="text-regantify-text">{p.name}</p>
                          {p.control && <p className="text-xs text-regantify-text-muted">{controlText(p.control)}</p>}
                          {!p.inStock && <p className="text-xs text-regantify-text-muted">Sold out</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4">{p.storeName}</td>
                    <td className="px-4 text-right tabular-nums">৳{p.price.toLocaleString('en-US')}</td>
                    <td className="px-4 text-right tabular-nums">{p.score.toFixed(2)}</td>
                    <td className="px-4 text-right">
                      <button type="button" className={secondary} onClick={() => setEditing({ productId: p.productId, name: p.name, control: p.control })}>
                        Change
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className={`${panel} overflow-x-auto`}>
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">Hidden, pinned and featured products</h2>
        {!controls.data?.length ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">None yet. Search for a product above to hide, pin or feature it.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Product</th>
                <th className="px-4">Store</th>
                <th className="px-4">What</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody>
              {controls.data.map((c) => (
                <tr key={c.productId}>
                  <td className="px-4">{c.name}</td>
                  <td className="px-4">{c.storeName}</td>
                  <td className="px-4 text-xs">{controlText(c)}</td>
                  <td className="px-4 text-right">
                    <button type="button" className={secondary} onClick={() => setEditing({ productId: c.productId, name: c.name, control: c })}>
                      Change
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing && <ControlDialog target={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ControlDialog({ target, onClose }: { target: { productId: string; name: string; control: ShopAdminProduct['control'] }; onClose: () => void }) {
  const qc = useQueryClient();
  const c = target.control;
  const [hidden, setHidden] = useState(!!c?.hiddenAt);
  const [hiddenReason, setHiddenReason] = useState(c?.hiddenReason ?? '');
  const [pinRank, setPinRank] = useState(c?.pinRank != null ? String(c.pinRank) : '');
  const [pinUntil, setPinUntil] = useState(isoToDhakaInput(c?.pinUntil));
  const [featuredUntil, setFeaturedUntil] = useState(isoToDhakaInput(c?.featuredUntil));
  const save = useMutation({
    mutationFn: () => {
      const body: ShopControlUpdate = {
        hidden,
        hiddenReason: hidden ? hiddenReason.trim() || null : null,
        pinRank: pinRank.trim() ? Math.max(1, Math.min(1000, Number(pinRank) || 1)) : null,
        pinUntil: pinRank.trim() && pinUntil ? dhakaInputToIso(pinUntil) : null,
        featuredUntil: featuredUntil ? dhakaInputToIso(featuredUntil) : null,
      };
      return shopAdminApi.setControl(target.productId, body);
    },
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-shop-controls'] });
      qc.invalidateQueries({ queryKey: ['admin-shop-products'] });
      onClose();
    },
    onError,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">{target.name}</h2>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Hide from the Shop (the store's own page keeps it)
        </label>
        {hidden && <input className={field} maxLength={300} value={hiddenReason} onChange={(e) => setHiddenReason(e.target.value)} placeholder="Why (for the admin log)" />}
        <div>
          <label className="mb-1.5 block text-sm text-regantify-text">Pin to place (1 = first; empty = not pinned)</label>
          <input type="number" min={1} max={1000} className={field} value={pinRank} onChange={(e) => setPinRank(e.target.value)} />
        </div>
        {pinRank.trim() && (
          <div>
            <label className="mb-1.5 block text-sm text-regantify-text">Pinned until (empty = until you remove it)</label>
            <input type="datetime-local" className={field} value={pinUntil} onChange={(e) => setPinUntil(e.target.value)} />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm text-regantify-text">Featured on the home page until (empty = not featured)</label>
          <input type="datetime-local" className={field} value={featuredUntil} onChange={(e) => setFeaturedUntil(e.target.value)} />
        </div>
        <button type="button" className={`${primary} w-full`} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------- categories

function CategoriesTab() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ['admin-shop-categories'], queryFn: shopAdminApi.categories });
  const unmapped = useQuery({ queryKey: ['admin-shop-unmapped'], queryFn: shopAdminApi.unmapped });
  const aliases = useQuery({ queryKey: ['admin-shop-aliases'], queryFn: shopAdminApi.aliases });
  const [editing, setEditing] = useState<ShopCategoryRow | 'new' | null>(null);
  const [mapTo, setMapTo] = useState<Record<string, string>>({});
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-shop-categories'] });
    qc.invalidateQueries({ queryKey: ['admin-shop-unmapped'] });
    qc.invalidateQueries({ queryKey: ['admin-shop-aliases'] });
  };
  const recat = useMutation({ mutationFn: shopAdminApi.recategorize, onSuccess: (r) => (toast.success(`Checked ${r.checked} products, ${r.changed} moved.`), refresh()), onError });
  const setAlias = useMutation({
    mutationFn: ({ text, id }: { text: string; id: string }) => shopAdminApi.setAlias(text, id),
    onSuccess: () => (toast.success('Mapped. Its products move within a few seconds.'), refresh()),
    onError,
  });
  const removeAlias = useMutation({ mutationFn: shopAdminApi.removeAlias, onSuccess: refresh, onError });
  const flat = (cats.data?.categories ?? []).flatMap((c) => [c, ...c.children]);

  return (
    <div className="space-y-5">
      <section className={`${panel} overflow-x-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-regantify-text">Shop categories</h2>
          <div className="flex gap-2">
            <button type="button" className={secondary} disabled={recat.isPending} onClick={() => recat.mutate()}>
              Sort products again
            </button>
            <button type="button" className={`${primary} flex items-center gap-1`} onClick={() => setEditing('new')}>
              <Plus size={15} /> New category
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4">Category</th>
              <th className="px-4">Keywords</th>
              <th className="px-4 text-right">Products</th>
              <th className="px-4" />
            </tr>
          </thead>
          <tbody>
            {(cats.data?.categories ?? []).flatMap((c) => [
              <CategoryRow key={c.id} c={c} onEdit={() => setEditing(c)} />,
              ...c.children.map((ch) => <CategoryRow key={ch.id} c={ch} child onEdit={() => setEditing(ch)} />),
            ])}
            <tr>
              <td className="px-4 text-regantify-text-muted">Other (no category matched)</td>
              <td className="px-4" />
              <td className="px-4 text-right tabular-nums">{cats.data?.otherCount ?? 0}</td>
              <td className="px-4" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className={`${panel} overflow-x-auto`}>
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">Store categories that landed in "Other"</h2>
        {!unmapped.data?.texts.length ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">None.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Store's category</th>
                <th className="px-4 text-right">Products</th>
                <th className="px-4 text-right">Stores</th>
                <th className="px-4">Map to</th>
              </tr>
            </thead>
            <tbody>
              {unmapped.data.texts.map((t) => (
                <tr key={t.text}>
                  <td className="px-4">
                    <p className="text-regantify-text">{t.text}</p>
                    <p className="text-xs text-regantify-text-muted">{t.examples?.join(', ')}</p>
                  </td>
                  <td className="px-4 text-right tabular-nums">{t.products}</td>
                  <td className="px-4 text-right tabular-nums">{t.stores}</td>
                  <td className="px-4">
                    <div className="flex gap-2">
                      <select className={`${fieldBox} min-w-40`} value={mapTo[t.text] ?? ''} onChange={(e) => setMapTo({ ...mapTo, [t.text]: e.target.value })}>
                        <option value="">Pick a category</option>
                        {flat.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.parentId ? '- ' : ''}
                            {c.nameEn}
                          </option>
                        ))}
                      </select>
                      <button type="button" className={secondary} disabled={!mapTo[t.text] || setAlias.isPending} onClick={() => setAlias.mutate({ text: t.text, id: mapTo[t.text] })}>
                        Map
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(unmapped.data?.withoutCategoryText ?? 0) > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-xs text-regantify-text-muted">{unmapped.data!.withoutCategoryText} products have no category text at all; they are sorted by their name.</p>
        )}
      </section>

      {!!aliases.data?.length && (
        <section className={`${panel} overflow-x-auto`}>
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">Your mappings</h2>
          <table className="w-full text-sm">
            <tbody>
              {aliases.data.map((a) => (
                <tr key={a.aliasText}>
                  <td className="px-4">{a.aliasText}</td>
                  <td className="px-4">{a.shopCategory.nameEn}</td>
                  <td className="px-4 text-right">
                    <button type="button" aria-label="Remove mapping" className="text-red-700" onClick={() => removeAlias.mutate(a.aliasText)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {editing && <CategoryDialog target={editing} parents={cats.data?.categories ?? []} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function CategoryRow({ c, child, onEdit }: { c: ShopCategoryRow; child?: boolean; onEdit: () => void }) {
  return (
    <tr>
      <td className={`px-4 ${child ? 'pl-10' : ''}`}>
        <span className={c.active ? 'text-regantify-text' : 'text-regantify-text-muted line-through'}>{c.nameEn}</span>
        {c.nameBn && <span className="ml-2 text-regantify-text-muted">{c.nameBn}</span>}
      </td>
      <td className="max-w-xs truncate px-4 text-xs text-regantify-text-muted">{c.keywords.join(', ')}</td>
      <td className="px-4 text-right tabular-nums">{c.productCount}</td>
      <td className="px-4 text-right">
        <button type="button" className={secondary} onClick={onEdit}>
          Edit
        </button>
      </td>
    </tr>
  );
}

function CategoryDialog({ target, parents, onClose, onSaved }: { target: ShopCategoryRow | 'new'; parents: ShopCategoryRow[]; onClose: () => void; onSaved: () => void }) {
  const row = target === 'new' ? null : target;
  const [f, setF] = useState({
    nameEn: row?.nameEn ?? '',
    nameBn: row?.nameBn ?? '',
    parentId: row?.parentId ?? '',
    position: row?.position ?? 0,
    keywords: row?.keywords.join(', ') ?? '',
    active: row?.active ?? true,
  });
  const body = (): ShopCategoryInput => ({
    nameEn: f.nameEn.trim(),
    nameBn: f.nameBn.trim() || null,
    parentId: f.parentId || null,
    position: f.position,
    keywords: f.keywords.split(/[,\n]/).map((k) => k.trim()).filter(Boolean),
    active: f.active,
  });
  const save = useMutation({
    mutationFn: () => (row ? shopAdminApi.updateCategory(row.id, body()) : shopAdminApi.createCategory(body())),
    onSuccess: () => (toast.success('Saved. Products are sorted again within a few seconds.'), onSaved(), onClose()),
    onError,
  });
  const remove = useMutation({ mutationFn: () => shopAdminApi.deleteCategory(row!.id), onSuccess: () => (toast.success('Deleted.'), onSaved(), onClose()), onError });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-3 p-6">
        <h2 className="font-semibold text-regantify-text">{row ? `Edit ${row.nameEn}` : 'New Shop category'}</h2>
        <input className={field} maxLength={60} value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} placeholder="Name in English" />
        <input className={field} maxLength={60} value={f.nameBn} onChange={(e) => setF({ ...f, nameBn: e.target.value })} placeholder="Name in Bangla (optional)" />
        <select className={field} value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
          <option value="">Top level</option>
          {parents
            .filter((p) => p.id !== row?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                Inside {p.nameEn}
              </option>
            ))}
        </select>
        <textarea className={field} rows={3} value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} placeholder="Keywords, comma separated (English, Banglish, Bangla)" />
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm text-regantify-text">Order</label>
          <input type="number" className={`${fieldBox} w-24`} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) || 0 })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Shown in the Shop
        </label>
        <div className="flex gap-2">
          <button type="button" className={`${primary} flex-1`} disabled={!f.nameEn.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </button>
          {row && (
            <button type="button" className="rounded-lg border border-red-300 px-3 text-sm text-red-700" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------- search

function SearchTab({ data }: { data: ShopOverview }) {
  const save = useSaveSettings();
  const [days, setDays] = useState(7);
  const words = useQuery({ queryKey: ['admin-shop-words', days], queryFn: () => shopAdminApi.searchWords(days) });
  const [text, setText] = useState(() => data.synonyms.map((g) => g.join(', ')).join('\n'));
  useEffect(() => setText(data.synonyms.map((g) => g.join(', ')).join('\n')), [data.synonyms]);
  const groups = () =>
    text
      .split('\n')
      .map((l) => l.split(',').map((w) => w.trim()).filter(Boolean))
      .filter((g) => g.length >= 2);

  return (
    <div className="space-y-5">
      <section className={`${panel} space-y-3 p-4`}>
        <h2 className="text-sm font-semibold text-regantify-text">Words that mean the same</h2>
        <p className="text-xs text-regantify-text-muted">One group per line, words separated by commas. A search for any word in a group also finds the others. Example: panjabi, পাঞ্জাবি, kurta</p>
        <textarea className={`${field} font-mono`} rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" className={primary} disabled={save.isPending} onClick={() => save.mutate({ synonyms: groups() })}>
          Save words
        </button>
      </section>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-regantify-text-muted">Searches of the last</span>
        <select className={`${fieldBox} w-32`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d === 1 ? '1 day' : `${d} days`}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <WordTable title="Most searched" rows={words.data?.top} />
        <WordTable title="Searched but not found" rows={words.data?.missing} missing />
      </div>
    </div>
  );
}

function WordTable({ title, rows, missing }: { title: string; rows?: Array<{ term: string; searches: number; noResults: number }>; missing?: boolean }) {
  return (
    <section className={`${panel} overflow-x-auto`}>
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-regantify-text">{title}</h2>
      {!rows?.length ? (
        <p className="px-4 py-3 text-sm text-regantify-text-muted">No searches yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4">Word</th>
              <th className="px-4 text-right">Searches</th>
              <th className="px-4 text-right">Found nothing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.term}>
                <td className="px-4">{r.term}</td>
                <td className="px-4 text-right tabular-nums">{r.searches}</td>
                <td className={`px-4 text-right tabular-nums ${missing && r.noResults > 0 ? 'text-red-700' : ''}`}>{r.noResults}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------- home page

function HomeTab() {
  const banners = useQuery({ queryKey: ['admin-shop-banners'], queryFn: shopAdminApi.banners });
  const collections = useQuery({ queryKey: ['admin-shop-collections'], queryFn: shopAdminApi.collections });
  const [banner, setBanner] = useState<ShopBanner | 'new' | null>(null);
  const [collection, setCollection] = useState<ShopCollection | 'new' | null>(null);
  const span = (from: string | null, to: string | null) => (from || to ? `${from ? formatDhakaDateTime(from) : 'now'} to ${to ? formatDhakaDateTime(to) : 'no end'}` : 'Always');

  return (
    <div className="space-y-5">
      <section className={`${panel} overflow-x-auto`}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-regantify-text">Banners</h2>
          <button type="button" className={`${primary} flex items-center gap-1`} onClick={() => setBanner('new')}>
            <Plus size={15} /> New banner
          </button>
        </div>
        {!banners.data?.length ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">No banners. The Shop home starts with the search box.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Banner</th>
                <th className="px-4">Shown</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody>
              {banners.data.map((b) => (
                <tr key={b.id}>
                  <td className="px-4">
                    <p className="text-regantify-text">{b.title}</p>
                    {b.text && <p className="text-xs text-regantify-text-muted">{b.text}</p>}
                  </td>
                  <td className="px-4 text-xs">{b.active ? span(b.startsAt, b.endsAt) : <span className="text-regantify-text-muted">Off</span>}</td>
                  <td className="px-4 text-right">
                    <button type="button" className={secondary} onClick={() => setBanner(b)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${panel} overflow-x-auto`}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-regantify-text">Collections</h2>
          <button type="button" className={`${primary} flex items-center gap-1`} onClick={() => setCollection('new')}>
            <Plus size={15} /> New collection
          </button>
        </div>
        {!collections.data?.length ? (
          <p className="px-4 py-3 text-sm text-regantify-text-muted">No collections yet. A collection is a hand-picked list of products on its own Shop page.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4">Collection</th>
                <th className="px-4 text-right">Products</th>
                <th className="px-4">Where</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody>
              {collections.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4">
                    <p className="text-regantify-text">{c.title}</p>
                    <p className="console-id text-xs text-regantify-text-muted">/shop/collections/{c.slug}</p>
                  </td>
                  <td className="px-4 text-right tabular-nums">{c.productIds.length}</td>
                  <td className="px-4 text-xs">
                    {!c.active ? 'Off' : c.showOnHome ? 'Own page and home page' : 'Own page'}
                    {c.endsAt && ` · until ${formatDhakaDateTime(c.endsAt)}`}
                  </td>
                  <td className="px-4 text-right">
                    <button type="button" className={secondary} onClick={() => setCollection(c)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {banner && <BannerDialog target={banner} onClose={() => setBanner(null)} />}
      {collection && <CollectionDialog target={collection} onClose={() => setCollection(null)} />}
    </div>
  );
}

function BannerDialog({ target, onClose }: { target: ShopBanner | 'new'; onClose: () => void }) {
  const qc = useQueryClient();
  const row = target === 'new' ? null : target;
  const [f, setF] = useState({
    title: row?.title ?? '',
    text: row?.text ?? '',
    linkUrl: row?.linkUrl ?? '',
    tone: row?.tone ?? 'GREEN',
    startsAt: isoToDhakaInput(row?.startsAt),
    endsAt: isoToDhakaInput(row?.endsAt),
    position: row?.position ?? 0,
    active: row?.active ?? true,
  });
  const done = () => (qc.invalidateQueries({ queryKey: ['admin-shop-banners'] }), onClose());
  const body = (): ShopBannerInput => ({
    title: f.title.trim(),
    text: f.text.trim() || null,
    linkUrl: f.linkUrl.trim() || null,
    tone: f.tone,
    startsAt: f.startsAt ? dhakaInputToIso(f.startsAt) : null,
    endsAt: f.endsAt ? dhakaInputToIso(f.endsAt) : null,
    position: f.position,
    active: f.active,
  });
  const save = useMutation({ mutationFn: () => (row ? shopAdminApi.updateBanner(row.id, body()) : shopAdminApi.createBanner(body())), onSuccess: () => (toast.success('Saved.'), done()), onError });
  const remove = useMutation({ mutationFn: () => shopAdminApi.deleteBanner(row!.id), onSuccess: () => (toast.success('Deleted.'), done()), onError });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-3 p-6">
        <h2 className="font-semibold text-regantify-text">{row ? 'Edit banner' : 'New banner'}</h2>
        <input className={field} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" />
        <textarea className={field} rows={2} maxLength={300} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="One line under it (optional)" />
        <input className={field} maxLength={500} value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value })} placeholder="Link: /shop/... or https://... (optional)" />
        <select className={field} value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value as ShopBanner['tone'] })}>
          <option value="GREEN">Green</option>
          <option value="DARK">Dark</option>
          <option value="AMBER">Amber</option>
        </select>
        <label className="block text-sm text-regantify-text">
          From (Dhaka time, empty = now)
          <input type="datetime-local" className={`${field} mt-1`} value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
        </label>
        <label className="block text-sm text-regantify-text">
          Until (empty = no end)
          <input type="datetime-local" className={`${field} mt-1`} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm text-regantify-text">Order (lower comes first)</label>
          <input type="number" min={0} className={`${fieldBox} w-24`} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) || 0 })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> On
        </label>
        <div className="flex gap-2">
          <button type="button" className={`${primary} flex-1`} disabled={!f.title.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </button>
          {row && (
            <button type="button" className="rounded-lg border border-red-300 px-3 text-sm text-red-700" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function CollectionDialog({ target, onClose }: { target: ShopCollection | 'new'; onClose: () => void }) {
  const qc = useQueryClient();
  const row = target === 'new' ? null : target;
  const [f, setF] = useState({
    title: row?.title ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    active: row?.active ?? true,
    showOnHome: row?.showOnHome ?? false,
    endsAt: isoToDhakaInput(row?.endsAt),
    position: row?.position ?? 0,
  });
  const [ids, setIds] = useState<string[]>(row?.productIds ?? []);
  const [names, setNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const found = useQuery({ queryKey: ['admin-shop-products', term], queryFn: () => shopAdminApi.products(term), enabled: term.length >= 2 });
  const done = () => (qc.invalidateQueries({ queryKey: ['admin-shop-collections'] }), onClose());
  const body = (): ShopCollectionInput => ({
    title: f.title.trim(),
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    description: f.description.trim() || null,
    productIds: ids,
    active: f.active,
    showOnHome: f.showOnHome,
    endsAt: f.endsAt ? dhakaInputToIso(f.endsAt) : null,
    position: f.position,
  });
  const save = useMutation({
    mutationFn: () => (row ? shopAdminApi.updateCollection(row.id, body()) : shopAdminApi.createCollection(body())),
    onSuccess: () => (toast.success('Saved.'), done()),
    onError,
  });
  const remove = useMutation({ mutationFn: () => shopAdminApi.deleteCollection(row!.id), onSuccess: () => (toast.success('Deleted.'), done()), onError });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} maxWidth="max-w-xl">
      <div className="max-h-[85vh] space-y-3 overflow-y-auto p-6">
        <h2 className="font-semibold text-regantify-text">{row ? 'Edit collection' : 'New collection'}</h2>
        <input className={field} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" />
        <input className={field} maxLength={60} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="Web address (empty = made from the title)" />
        <textarea className={field} rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="A short line (optional)" />

        <div className="rounded-xl border border-line p-3">
          <p className="mb-2 text-sm font-medium text-regantify-text">Products ({ids.length} of 60)</p>
          <div className="mb-2 flex gap-2">
            <input
              className={field}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTerm(q.trim());
                }
              }}
              placeholder="Find a Shop product by name"
            />
            <button type="button" className={secondary} onClick={() => setTerm(q.trim())}>
              Find
            </button>
          </div>
          {term.length >= 2 && (
            <ul className="mb-2 max-h-40 overflow-y-auto text-sm">
              {(found.data ?? []).map((p) => (
                <li key={p.productId} className="flex items-center justify-between gap-2 py-1">
                  <span className="truncate">
                    {p.name} <span className="text-regantify-text-muted">· {p.storeName}</span>
                  </span>
                  <button
                    type="button"
                    className={secondary}
                    disabled={ids.includes(p.productId) || ids.length >= 60}
                    onClick={() => {
                      setIds([...ids, p.productId]);
                      setNames({ ...names, [p.productId]: p.name });
                    }}
                  >
                    {ids.includes(p.productId) ? 'Added' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ol className="space-y-1 text-sm">
            {ids.map((id, i) => (
              <li key={id} className="flex items-center gap-2">
                <span className="w-6 text-right text-regantify-text-muted">{i + 1}.</span>
                <span className="flex-1 truncate">{names[id] ?? <span className="console-id text-xs">{id}</span>}</span>
                <button type="button" className="px-1 text-regantify-text-muted" onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className="px-1 text-regantify-text-muted" onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className="text-red-700" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label="Remove">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-regantify-text-muted">A product that leaves the Shop simply stops showing in the collection.</p>
        </div>

        <label className="block text-sm text-regantify-text">
          Ends (empty = no end)
          <input type="datetime-local" className={`${field} mt-1`} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm text-regantify-text">Order on the home page (lower comes first)</label>
          <input type="number" min={0} className={`${fieldBox} w-24`} value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) || 0 })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={f.showOnHome} onChange={(e) => setF({ ...f, showOnHome: e.target.checked })} /> Show as a row on the Shop home
        </label>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> On
        </label>
        <div className="flex gap-2">
          <button type="button" className={`${primary} flex-1`} disabled={!f.title.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </button>
          {row && (
            <button type="button" className="rounded-lg border border-red-300 px-3 text-sm text-red-700" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
