import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, PackageOpen, Truck } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, PillTabs, SearchBox, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ResaleOfferDialog, dhakaDate } from '../../../components/product/ResaleOfferDialogs';
import { ResellerPartnersPanel } from '../../../components/product/ResellerPartnersPanel';
import { ResaleProblemsList } from '../../../components/resale/ResaleProblems';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { FeatureGate } from '../../../lib/features';
import {
  RESALE_SUPPLY_KEY,
  commissionLabel,
  resaleSupplyApi,
  type ResaleApproval,
  type ResaleOfferItem,
  type ResaleSupplierSettings,
} from '../../../lib/resaleSupplyApi';

const fieldClass =
  'block w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand';

const APPROVAL_CHOICES: Array<{ id: ResaleApproval; label: string; hint: string }> = [
  { id: 'APPROVAL', label: 'I approve each reseller', hint: 'A store asks, you say yes or no.' },
  { id: 'OPEN', label: 'Any allowed store', hint: 'Stores Regantify allows can start at once.' },
  { id: 'INVITE', label: 'Only stores I invite', hint: 'Nobody can ask; you invite stores yourself.' },
];

const money = (n: number) => `৳${n.toLocaleString()}`;

/**
 * Products > Sell through resellers (RESELLER-plan.md Step 2): the supplier side of the reseller system. The store turns it on, says how
 * resellers join and writes its terms, then picks which products resellers may sell and for what commission. Shown only to stores the
 * RESALE_SUPPLY flag is on for; the server decides the rest (verified, not blocked) and its sentence is shown here when it says no.
 */
export default function ResellerSupply() {
  return (
    <FeatureGate
      flag="RESALE_SUPPLY"
      fallback={
        <PageSection>
          <EmptyState icon={Handshake} title="Selling through resellers is not open for your store yet" hint="Regantify opens it for stores step by step." />
        </PageSection>
      }
    >
      <ResellerSupplyPage />
    </FeatureGate>
  );
}

function ResellerSupplyPage() {
  const settingsQuery = useQuery({ queryKey: [...RESALE_SUPPLY_KEY, 'settings'], queryFn: resaleSupplyApi.settings, retry: false });
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'resellers' ? 'resellers' : params.get('tab') === 'problems' ? 'problems' : 'products';

  if (settingsQuery.isLoading) return <PageSection><p className="py-6 text-center text-sm text-neutral-500">Loading…</p></PageSection>;
  if (settingsQuery.isError || !settingsQuery.data)
    return (
      <PageSection>
        <EmptyState icon={Handshake} title="You can't offer products to resellers right now" hint={apiErrorMessage(settingsQuery.error, 'Please try again later.')} />
      </PageSection>
    );

  const data = settingsQuery.data;
  return (
    <div className="space-y-3">
      <PillTabs
        className=""
        tabs={[
          { id: 'products', label: 'Settings and products' },
          { id: 'resellers', label: 'Resellers' },
          { id: 'problems', label: 'Problems' },
        ]}
        value={tab}
        onChange={(t) => setParams(t === 'products' ? {} : { tab: t }, { replace: true })}
      />
      {tab === 'problems' ? (
        <PageSection>
          <PageHeader title="Problems with your parcels" description="What resellers reported about delivered or returned orders. Answer with your packing photos; Regantify decides." />
          <ResaleProblemsList side="supplier" />
        </PageSection>
      ) : tab === 'resellers' ? (
        <PageSection>
          <PageHeader title="Resellers" description="Stores that sell your products, requests waiting for you, and invitations you sent." />
          <ResellerPartnersPanel />
        </PageSection>
      ) : (
        <>
          <SettingsCard data={data} />
          <OffersCard enabled={data.settings.enabled} />
        </>
      )}
    </div>
  );
}

function SettingsCard({ data }: { data: Awaited<ReturnType<typeof resaleSupplyApi.settings>> }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ResaleSupplierSettings>(data.settings);
  useEffect(() => setForm(data.settings), [data.settings]);
  const set = <K extends keyof ResaleSupplierSettings>(k: K, v: ResaleSupplierSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: (next: ResaleSupplierSettings) => {
      const { saved: _saved, ...body } = next;
      return resaleSupplyApi.saveSettings(body);
    },
    onSuccess: (r) => {
      queryClient.setQueryData([...RESALE_SUPPLY_KEY, 'settings'], r);
      toast.success(r.settings.enabled ? 'Saved. Resellers can find your offered products.' : 'Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the settings.')),
  });

  return (
    <PageSection>
      <PageHeader
        title="Sell through resellers"
        description="Let other Regantify stores sell your products. You ship every order with your courier; the reseller earns the commission you set when the parcel is delivered."
      />

      {data.paused && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Your offers are paused until {dhakaDate(data.paused.until)}: {data.paused.reason ?? 'too many resale orders were cancelled.'} Resellers’ listings of your products are hidden meanwhile.
        </div>
      )}
      {!data.courierConnected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Truck size={16} aria-hidden />
          <span className="mr-auto">Connect a courier first. Resale orders go only through a connected courier (Pathao, SteadFast, RedX or CarryBee).</span>
          <Link to="/vendor/courier/pathao" className="font-medium underline">
            Connect a courier
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-start gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
          <span>
            <span className="font-medium">Offer my products to resellers</span>
            <span className="block text-xs text-neutral-500">
              {data.offers.active} product{data.offers.active === 1 ? '' : 's'} offered{data.offers.stopped ? `, ${data.offers.stopped} stopped` : ''}.
            </span>
          </span>
        </label>

        <fieldset>
          <legend className="mb-1 text-sm text-regantify-text">Who may sell your products</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {APPROVAL_CHOICES.map((c) => (
              <label key={c.id} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${form.approval === c.id ? 'border-brand bg-brand-lime/30' : 'border-line'}`}>
                <input type="radio" name="approval" className="sr-only" checked={form.approval === c.id} onChange={() => set('approval', c.id)} />
                <span className="font-medium text-regantify-text">{c.label}</span>
                <span className="block text-xs text-neutral-500">{c.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-regantify-text">
            I hand orders to the courier within (days)
            <input type="number" min={1} max={5} value={form.shipWithinDays} onChange={(e) => set('shipWithinDays', Number(e.target.value))} className={`${fieldClass} mt-1 h-10`} />
          </label>
          <label className="text-sm text-regantify-text">
            I take returns within (days after delivery, 0 = none)
            <input type="number" min={0} max={30} value={form.returnWindowDays} onChange={(e) => set('returnWindowDays', Number(e.target.value))} className={`${fieldClass} mt-1 h-10`} />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="text-sm text-regantify-text">
            Terms for resellers in Bangla <span className="text-neutral-400">(required)</span>
            <textarea rows={7} maxLength={3000} value={form.termsBn} onChange={(e) => set('termsBn', e.target.value)} className={`${fieldClass} mt-1 py-2`} lang="bn" />
          </label>
          <label className="text-sm text-regantify-text">
            Terms in English
            <textarea rows={7} maxLength={3000} value={form.termsEn} onChange={(e) => set('termsEn', e.target.value)} className={`${fieldClass} mt-1 py-2`} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">
          Filled in from your warranty and return settings. Say clearly what happens with returns and damaged items, so there is no argument later.{' '}
          <button type="button" className="underline" onClick={() => setForm((f) => ({ ...f, termsBn: data.suggested.termsBn, termsEn: data.suggested.termsEn }))}>
            Use the ready text again
          </button>
        </p>

        <label className="block text-sm text-regantify-text">
          Note for resellers about pickup and packing <span className="text-neutral-400">(optional)</span>
          <input value={form.pickupNote} maxLength={300} onChange={(e) => set('pickupNote', e.target.value)} className={`${fieldClass} mt-1 h-10`} />
        </label>

        <div className="flex justify-end">
          <button type="button" disabled={save.isPending} onClick={() => save.mutate(form)} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </PageSection>
  );
}

function OffersCard({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState<'all' | 'offered'>('offered');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ResaleOfferItem | null>(null);
  const [stopping, setStopping] = useState<ResaleOfferItem | null>(null);

  useEffect(() => setPage(1), [show, search]);
  const { data, isLoading } = useQuery({
    queryKey: [...RESALE_SUPPLY_KEY, 'offers', show, search, page],
    queryFn: () => resaleSupplyApi.offers({ show, q: search || undefined, page }),
    placeholderData: (prev) => prev,
  });

  const stop = useMutation({
    mutationFn: (productId: string) => resaleSupplyApi.stopOffer(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_SUPPLY_KEY });
      toast.success('Stopped. Resellers can no longer sell this product.');
      setStopping(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not stop the offer.')),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <PageSection>
      <PageHeader
        title="Products for resellers"
        description={enabled ? 'Pick the products resellers may sell, and their commission.' : 'Turn on "Offer my products to resellers" above first.'}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PillTabs
          className=""
          tabs={[
            { id: 'offered', label: 'Offered' },
            { id: 'all', label: 'All products' },
          ]}
          value={show}
          onChange={setShow}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search products" />
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={show === 'offered' ? 'No products offered yet' : 'No products found'}
          hint={show === 'offered' ? 'Open "All products" and press "Allow resellers" on a product, or select many in All Products.' : undefined}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {data.items.map((item) => (
            <OfferRow key={item.productId} item={item} enabled={enabled} onEdit={() => setEditing(item)} onStop={() => setStopping(item)} />
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-neutral-600">
          <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" className={outlineBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      {editing && <ResaleOfferDialog item={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={stopping !== null}
        onOpenChange={(o) => !o && setStopping(null)}
        title="Stop offering this product?"
        message={`Resellers can no longer sell “${stopping?.name ?? ''}”. Orders already placed carry on.`}
        confirmLabel="Stop offering"
        danger
        busy={stop.isPending}
        onConfirm={() => stopping && stop.mutate(stopping.productId)}
      />
    </PageSection>
  );
}

function OfferRow({ item, enabled, onEdit, onStop }: { item: ResaleOfferItem; enabled: boolean; onEdit: () => void; onStop: () => void }) {
  const price = item.priceFrom === item.priceTo ? money(item.priceFrom) : `${money(item.priceFrom)} to ${money(item.priceTo)}`;
  const offer = item.offer;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      {item.photoUrl ? (
        <img src={item.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-md border border-line object-cover" loading="lazy" />
      ) : (
        <div className="h-11 w-11 shrink-0 rounded-md border border-line bg-neutral-50" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-regantify-text">{item.name}</p>
        <p className="text-xs text-neutral-500">Your price {price}</p>
        {offer ? (
          <p className="mt-0.5 text-xs text-neutral-700">
            {offer.active ? (
              <span className="mr-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Offered</span>
            ) : (
              <span className="mr-1 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">Stopped</span>
            )}
            Commission {commissionLabel(offer.terms)} · reseller earns {money(offer.terms.earningPerPiece)} a piece
            {offer.terms.minPrice != null && offer.terms.maxPrice != null ? ` · may sell ${money(offer.terms.minPrice)} to ${money(offer.terms.maxPrice)}` : ''}
          </p>
        ) : null}
        {offer?.pending && (
          <p className="mt-0.5 text-xs text-amber-700">
            From {dhakaDate(offer.pending.from)}: commission {commissionLabel(offer.pending)}
            {offer.pending.minPrice != null && offer.pending.maxPrice != null ? `, ${money(offer.pending.minPrice)} to ${money(offer.pending.maxPrice)}` : ', your price only'} (3 days' notice)
          </p>
        )}
        {item.refusal && <p className="mt-0.5 text-xs text-neutral-500">{item.refusal}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {!item.refusal && enabled && (
          <button type="button" onClick={onEdit} className={offer?.active ? outlineBtn : primaryBtn}>
            {offer?.active ? 'Change' : 'Allow resellers'}
          </button>
        )}
        {offer?.active && (
          <button type="button" onClick={onStop} className={outlineBtn}>
            Stop
          </button>
        )}
      </div>
    </li>
  );
}
