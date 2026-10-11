import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Pencil, Plus, Trash2 } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { ToggleRow } from '../../../components/product/ProductFormKit';
import { Can } from '../../../lib/useStaffAccess';
import { giftOffersApi, type GiftOffer, type GiftOfferPayload } from '../../../lib/discountsApi';
import { toast } from '../../../lib/toast';
import {
  DateField,
  DiscountTypePicker,
  PromoStatusBadge,
  ProductPicker,
  UnitInput,
  promoStatus,
  scheduleText,
  taka,
  toLocalInput,
  type PickedItem,
} from './MarketingKit';

type Mode = 'BUY_PRODUCT' | 'CART_AMOUNT';

/** "Buy 2 Panjabi, get 1 Belt free" / "Orders over ৳3,000 get a Mug free". */
function offerText(o: GiftOffer): string {
  const gift = `${o.giftQuantity > 1 ? `${o.giftQuantity} × ` : ''}${o.giftProduct.name}`;
  return o.mode === 'BUY_PRODUCT'
    ? `Buy ${o.buyQuantity} ${o.buyProduct?.name ?? 'product'}, get ${gift} free`
    : `Orders over ${taka(o.minCartAmount)} get ${gift} free`;
}

/**
 * Marketing > Discounts > Free gifts (TellMe idea 43): "buy 2, get 1 free" or "spend ৳3000, get a free gift". The gift
 * is added to the order by itself as a ৳0 line (it still comes out of stock), once per order.
 */
export default function GiftOffers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['gift-offers'], queryFn: giftOffersApi.list });
  const [editing, setEditing] = useState<GiftOffer | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => giftOffersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-offers'] });
      toast.success('Offer deleted');
    },
    onError: () => toast.error('Could not delete this offer.'),
  });
  const toggle = useMutation({
    mutationFn: (o: GiftOffer) => giftOffersApi.update(o.id, { active: !o.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gift-offers'] }),
    onError: () => toast.error('Could not change this offer.'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/vendor/marketing/discounts" className="text-xs text-neutral-500 hover:underline">
            Discounts
          </Link>
          <h1 className="text-xl font-semibold">Free gifts</h1>
          <p className="text-sm text-neutral-600">A free product is added to the cart by itself when the shopper qualifies. It comes out of stock like any item.</p>
        </div>
        <Can perm="marketing.edit">
          <button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white">
            <Plus size={15} /> New free gift
          </button>
        </Can>
      </div>

      {editing && <GiftOfferForm key={editing === 'new' ? 'new' : editing.id} offer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading && <p className="p-6 text-sm text-neutral-500">Loading…</p>}
        {data && data.length === 0 && (
          <div className="p-8 text-center">
            <Gift className="mx-auto mb-2 text-neutral-400" size={26} />
            <p className="text-sm font-medium">No free gifts yet</p>
            <p className="text-sm text-neutral-500">For example: buy 2 shirts, get a belt free. Or orders over ৳3,000 get a mug free.</p>
          </div>
        )}
        {data?.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 first:border-t-0">
            <div className="min-w-0">
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-neutral-600">{offerText(o)}</p>
              <p className="text-xs text-neutral-500">
                Given {o.usageCount} {o.usageCount === 1 ? 'time' : 'times'} · {scheduleText(o.startsAt, o.endsAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PromoStatusBadge status={promoStatus({ active: o.active, startsAt: o.startsAt, endsAt: o.endsAt })} />
              <Can perm="marketing.edit">
                <button type="button" onClick={() => toggle.mutate(o)} className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50">
                  {o.active ? 'Turn off' : 'Turn on'}
                </button>
                <button type="button" aria-label="Edit" onClick={() => setEditing(o)} className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100">
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => window.confirm(`Delete “${o.name}”? Orders that already got the gift keep it.`) && remove.mutate(o.id)}
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </Can>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GiftOfferForm({ offer, onClose }: { offer: GiftOffer | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(offer?.name ?? '');
  const [mode, setMode] = useState<Mode>(offer?.mode ?? 'BUY_PRODUCT');
  const [buy, setBuy] = useState<PickedItem[]>(offer?.buyProduct ? [{ id: offer.buyProduct.id, label: offer.buyProduct.name }] : []);
  const [buyQuantity, setBuyQuantity] = useState(offer?.buyQuantity ? String(offer.buyQuantity) : '2');
  const [minCart, setMinCart] = useState(offer?.minCartAmount ? String(Number(offer.minCartAmount)) : '');
  const [gift, setGift] = useState<PickedItem[]>(offer ? [{ id: offer.giftProduct.id, label: offer.giftProduct.name }] : []);
  const [giftQuantity, setGiftQuantity] = useState(String(offer?.giftQuantity ?? 1));
  const [startsAt, setStartsAt] = useState(toLocalInput(offer?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(offer?.endsAt));
  const [active, setActive] = useState(offer?.active ?? true);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = {
    name: !name.trim() ? 'Give it a name, e.g. Buy 2 get 1 free.' : null,
    buy: mode === 'BUY_PRODUCT' && buy.length === 0 ? 'Pick the product the shopper has to buy.' : null,
    buyQuantity: mode === 'BUY_PRODUCT' && !(Number(buyQuantity) >= 1) ? 'Enter how many.' : null,
    minCart: mode === 'CART_AMOUNT' && !(Number(minCart) >= 1) ? 'Enter the cart amount.' : null,
    gift: gift.length === 0 ? 'Pick the free product.' : null,
    giftQuantity: !(Number(giftQuantity) >= 1) ? 'Enter how many.' : null,
    endsAt: startsAt && endsAt && new Date(endsAt) <= new Date(startsAt) ? 'The end must be after the start.' : null,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const save = useMutation({
    mutationFn: () => {
      const payload: GiftOfferPayload = {
        name: name.trim(),
        mode,
        giftProductId: gift[0].id,
        giftQuantity: Number(giftQuantity),
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        active,
        ...(mode === 'BUY_PRODUCT' ? { buyProductId: buy[0].id, buyQuantity: Number(buyQuantity) } : { minCartAmount: Number(minCart) }),
      };
      return offer ? giftOffersApi.update(offer.id, payload) : giftOffersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-offers'] });
      toast.success(offer ? 'Offer saved' : 'Offer added');
      onClose();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Could not save this offer. Try again.');
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) save.mutate();
      }}
    >
      <SectionCard title={offer ? 'Edit free gift' : 'New free gift'}>
        <div className="space-y-4">
          <Field label="Name" required error={shown('name')} hint="Shoppers see this in the cart.">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Buy 2 get 1 free" className={productInputClass} />
          </Field>

          <DiscountTypePicker<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { id: 'BUY_PRODUCT', label: 'Buy a product' },
              { id: 'CART_AMOUNT', label: 'Spend an amount' },
            ]}
          />

          {mode === 'BUY_PRODUCT' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductPicker label="Product to buy" selected={buy} onChange={(items) => setBuy(items.slice(-1))} error={shown('buy')} />
              <Field label="How many to buy" required error={shown('buyQuantity')}>
                <UnitInput unit={null} integer value={buyQuantity} onChange={setBuyQuantity} placeholder="e.g. 2" />
              </Field>
            </div>
          ) : (
            <Field label="Cart total needed" required error={shown('minCart')} hint="The products' total before any discount.">
              <UnitInput unit="৳" value={minCart} onChange={setMinCart} placeholder="e.g. 3000" />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <ProductPicker label="Free product" selected={gift} onChange={(items) => setGift(items.slice(-1))} error={shown('gift')} />
            <Field label="How many free" required error={shown('giftQuantity')} hint="Given once per order. The product must have no size or colour options.">
              <UnitInput unit={null} integer value={giftQuantity} onChange={setGiftQuantity} placeholder="e.g. 1" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Starts" value={startsAt} onChange={setStartsAt} role="start" optional />
            <DateField label="Ends" value={endsAt} onChange={setEndsAt} role="end" optional error={shown('endsAt')} />
          </div>
          <ToggleRow checked={active} onChange={setActive} label="On" hint="If the free product runs out of stock, the offer stops by itself." />

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={save.isPending} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
