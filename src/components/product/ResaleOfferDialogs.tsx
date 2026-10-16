import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { RESALE_SUPPLY_KEY, resaleSupplyApi, type CommissionType, type ResaleOfferItem } from '../../lib/resaleSupplyApi';

const fieldClass =
  'block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-400';

export const dhakaDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' });

const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function CommissionInput({
  type,
  value,
  onType,
  onValue,
}: {
  type: CommissionType;
  value: string;
  onType: (t: CommissionType) => void;
  onValue: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm text-regantify-text">Reseller's commission</span>
      <div className="flex gap-2">
        <div className="flex shrink-0 rounded-lg border border-line p-0.5" role="radiogroup" aria-label="Commission in taka or percent">
          {(['FLAT', 'PERCENT'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => onType(t)}
              className={`h-9 rounded-md px-3 text-sm ${type === t ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              {t === 'FLAT' ? '৳ per piece' : '% of price'}
            </button>
          ))}
        </div>
        <input type="number" min={0} step="0.01" inputMode="decimal" value={value} onChange={(e) => onValue(e.target.value)} className={fieldClass} aria-label="Commission" />
      </div>
    </div>
  );
}

/** One product's offer: commission, optional price range, a note for resellers. */
export function ResaleOfferDialog({ item, onClose }: { item: ResaleOfferItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  // Start from the waiting change when there is one, so the supplier edits what it last asked for.
  const start = item.offer?.pending ?? item.offer?.terms ?? null;
  const [type, setType] = useState<CommissionType>(start?.commissionType ?? 'FLAT');
  const [value, setValue] = useState(start ? String(start.commissionValue) : '');
  const [useRange, setUseRange] = useState(start?.minPrice != null && start?.maxPrice != null);
  const [min, setMin] = useState(start?.minPrice != null ? String(start.minPrice) : '');
  const [max, setMax] = useState(start?.maxPrice != null ? String(start.maxPrice) : '');
  const [note, setNote] = useState(item.offer?.marketingNote ?? '');

  const commission = toNumber(value);
  const low = item.priceFrom;
  const perPiece = commission === null ? null : type === 'FLAT' ? commission : Math.round(low * commission) / 100;

  const save = useMutation({
    mutationFn: () =>
      resaleSupplyApi.saveOffer(item.productId, {
        commissionType: type,
        commissionValue: commission ?? 0,
        minPrice: useRange ? toNumber(min) : null,
        maxPrice: useRange ? toNumber(max) : null,
        marketingNote: note,
      }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: RESALE_SUPPLY_KEY });
      if (r.noticeFrom) toast.success(`Saved. This is less for resellers, so it starts on ${dhakaDate(r.noticeFrom)} (3 days' notice).`);
      else toast.success('Saved. Resellers can sell this product on these terms.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the offer.')),
  });

  const priceText = item.priceFrom === item.priceTo ? `৳${item.priceFrom.toLocaleString()}` : `৳${item.priceFrom.toLocaleString()} to ৳${item.priceTo.toLocaleString()}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={item.offer ? 'Change reseller offer' : 'Allow resellers'} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-regantify-text">{item.name}</span> · your price {priceText}
        </p>

        <CommissionInput type={type} value={value} onType={setType} onValue={setValue} />
        {perPiece !== null && perPiece >= 0 && (
          <p className="-mt-2 text-xs text-neutral-500">
            A reseller earns ৳{perPiece.toLocaleString()} per piece at your price{item.priceFrom !== item.priceTo ? ' (cheapest option)' : ''}; you get the rest. Regantify's small share (5% by default) comes out of the reseller's earning, not yours.
          </p>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={useRange} disabled={!item.samePriceForAll} onChange={(e) => setUseRange(e.target.checked)} className="h-4 w-4 accent-brand" />
            Let resellers choose their own price
          </label>
          {!item.samePriceForAll ? (
            <p className="mt-1 text-xs text-neutral-500">Only for products whose options all have the same price.</p>
          ) : useRange ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-neutral-600">
                Lowest price (৳)
                <input type="number" min={0} step="0.01" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-xs text-neutral-600">
                Highest price (৳)
                <input type="number" min={0} step="0.01" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <p className="col-span-2 text-xs text-neutral-500">What a reseller sells above your price is theirs too.</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-neutral-500">Off: resellers sell at your price.</p>
          )}
        </div>

        <label className="block text-sm text-regantify-text">
          Note for resellers <span className="text-neutral-400">(optional)</span>
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Best seller this winter" className={`${fieldClass} mt-1`} />
        </label>

        {item.offer && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            A lower commission, a higher price or a narrower price range reaches resellers only after 3 days' notice. Better terms apply at once.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={commission === null || save.isPending} onClick={() => save.mutate()} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** All Products > select > "Allow resellers": one commission for many products; each keeps its own price range. */
export function BulkResaleOfferDialog({ productIds, onClose }: { productIds: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<CommissionType>('PERCENT');
  const [value, setValue] = useState('');
  const commission = toNumber(value);

  const save = useMutation({
    mutationFn: () => resaleSupplyApi.bulk({ productIds, commissionType: type, commissionValue: commission ?? 0 }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: RESALE_SUPPLY_KEY });
      const parts = [`${r.saved} product${r.saved === 1 ? '' : 's'} offered to resellers.`];
      if (r.waiting) parts.push(`${r.waiting} were lower than before and start in 3 days.`);
      if (r.skipped.length) parts.push(`${r.skipped.length} skipped: ${r.skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join('; ')}${r.skipped.length > 3 ? '…' : ''}`);
      (r.saved ? toast.success : toast.error)(parts.join(' '));
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the offers.')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Allow resellers" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Offer {productIds.length} selected product{productIds.length === 1 ? '' : 's'} to resellers. Drafts, bundles, pre-orders and other products that can't be resold are skipped and listed.
        </p>
        <CommissionInput type={type} value={value} onType={setType} onValue={setValue} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={commission === null || save.isPending} onClick={() => save.mutate()} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
