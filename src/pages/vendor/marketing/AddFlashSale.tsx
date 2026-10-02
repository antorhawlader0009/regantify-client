import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, ToggleRow, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { flashSalesApi, type FlashSaleDiscountType } from '../../../lib/flashSalesApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { DateField, DiscountTypePicker, FormHeader, OfferSummary, ProductPicker, UnitInput, taka, toLocalInput, type PickedItem } from './MarketingKit';

/** Same rule as the server's flash-sale-pricing.ts, used only for the preview next to each product. */
function salePrice(listPrice: number, type: FlashSaleDiscountType, amount: number): number {
  const raw = type === 'PERCENT' ? listPrice * (1 - amount / 100) : listPrice - amount;
  return Math.max(0, Math.round(raw * 100) / 100);
}

/**
 * Marketing > Flash Sale "+ Add New" (and Edit, via the :id param). A
 * name, the discount, when it runs and the products, each showing its
 * regular and sale price as you type. The sentence at the bottom says
 * what shoppers get.
 */
export default function AddFlashSale() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['flash-sales', id],
    queryFn: () => flashSalesApi.findOne(id!),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [discountType, setDiscountType] = useState<FlashSaleDiscountType>('PERCENT');
  const [amount, setAmount] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [products, setProducts] = useState<PickedItem[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setActive(existing.active);
    setDiscountType(existing.discountType);
    setAmount(String(Number(existing.amount)));
    setStartsAt(toLocalInput(existing.startsAt));
    setEndsAt(toLocalInput(existing.endsAt));
    setProducts(existing.products.map((p) => ({ id: p.id, label: p.name, sub: taka(p.price), price: Number(p.price), photoUrl: p.photoUrls[0] ?? null })));
  }, [existing]);

  const snapshot = JSON.stringify({ name, active, discountType, amount, startsAt, endsAt, ids: products.map((p) => p.id) });
  const initial = useRef<string | null>(null);
  useEffect(() => {
    if (initial.current == null && (!isEdit || existing)) initial.current = snapshot;
  }, [snapshot, isEdit, existing]);
  const dirty = !saved && initial.current != null && initial.current !== snapshot;
  useUnsavedChangesWarning(dirty);

  const amountNumber = Number(amount) || 0;
  const errors = {
    name: !name.trim() ? 'Give it a name, e.g. Eid midnight sale.' : null,
    amount: !amount || amountNumber <= 0 ? 'Enter how much off.' : discountType === 'PERCENT' && amountNumber > 100 ? 'A percentage can be at most 100.' : null,
    startsAt: !startsAt ? 'Pick when it starts, or tap Start now.' : null,
    endsAt: !endsAt ? 'Pick when it ends.' : startsAt && new Date(endsAt) <= new Date(startsAt) ? 'The end must be after the start.' : null,
    products: products.length === 0 ? 'Add at least one product.' : null,
  };
  const shown = (k: keyof typeof errors) => (submitted || (k === 'endsAt' && endsAt) ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        active,
        discountType,
        amount: amountNumber,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        productIds: products.map((p) => p.id),
      };
      return isEdit ? flashSalesApi.update(id!, payload) : flashSalesApi.create(payload);
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      toast.success(isEdit ? 'Flash sale saved' : 'Flash sale added');
      navigate('/vendor/marketing/flash-sale');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this flash sale. Check your connection and try again.');
    },
  });

  const sentence =
    amountNumber > 0
      ? `${discountType === 'PERCENT' ? `${amountNumber}%` : taka(amountNumber)} off ${products.length || 'the'} ${products.length === 1 ? 'product' : 'products'}${
          startsAt ? `, ${new Date(startsAt).getTime() > Date.now() ? `from ${formatDhakaDateTime(new Date(startsAt).toISOString())}` : 'from now'}` : ''
        }${endsAt ? ` until ${formatDhakaDateTime(new Date(endsAt).toISOString())}` : ''}. If a product already costs less, shoppers keep the lower price.`
      : 'Fill in the discount to see what shoppers get.';

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) saveMutation.mutate();
      }}
    >
      <FormHeader
        backTo="/vendor/marketing/flash-sale"
        backLabel="Flash sales"
        title={isEdit ? `Edit ${existing?.name ?? 'flash sale'}` : 'New flash sale'}
        description="A lower price on chosen products for a set time. It starts and stops by itself."
      />

      <div className="space-y-4">
        <SectionCard title="Name">
          <div className="space-y-4">
            <Field label="Name" required error={shown('name')} hint="Only you see this.">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid midnight sale" className={productInputClass} />
            </Field>
            <ToggleRow checked={active} onChange={setActive} label="On" hint="Turn off to pause it without deleting." />
          </div>
        </SectionCard>

        <SectionCard title="Discount">
          <div className="space-y-4">
            <DiscountTypePicker<FlashSaleDiscountType>
              value={discountType}
              onChange={setDiscountType}
              options={[
                { id: 'PERCENT', label: '% off' },
                { id: 'FIXED', label: '৳ off' },
              ]}
            />
            <div className="sm:w-1/2 sm:pr-2">
              <Field label={discountType === 'PERCENT' ? 'Percent off' : 'Amount off each product'} required error={shown('amount')} hint="Taken off each product’s regular price.">
                <UnitInput unit={discountType === 'PERCENT' ? '%' : '৳'} value={amount} onChange={setAmount} placeholder={discountType === 'PERCENT' ? 'e.g. 20' : 'e.g. 200'} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="When it runs">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Starts" required value={startsAt} onChange={setStartsAt} role="start" error={shown('startsAt')} />
            <DateField label="Ends" required value={endsAt} onChange={setEndsAt} role="end" error={shown('endsAt')} hint="It stops by itself at this time." />
          </div>
        </SectionCard>

        <SectionCard title="Products" description="Each one shows its regular price and its sale price.">
          <ProductPicker
            label="Products in the sale"
            selected={products}
            onChange={setProducts}
            error={shown('products')}
            renderExtra={(p) =>
              amountNumber > 0 && p.price != null ? (
                <span className="shrink-0 whitespace-nowrap text-xs text-neutral-500">
                  <s>{taka(p.price)}</s> <span className="font-medium text-emerald-700">{taka(salePrice(p.price, discountType, amountNumber))}</span>
                </span>
              ) : null
            }
          />
        </SectionCard>
      </div>

      <SaveBar
        message={
          formError ? (
            <span className="text-red-600">{formError}</span>
          ) : submitted && !valid ? (
            <span className="text-red-600">Fix the fields marked in red.</span>
          ) : (
            <OfferSummary>{sentence}</OfferSummary>
          )
        }
      >
        <Link to="/vendor/marketing/flash-sale" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save flash sale' : 'Add flash sale'}
        </button>
      </SaveBar>
    </form>
  );
}
