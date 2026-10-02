import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, ToggleRow, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { discountsApi } from '../../../lib/discountsApi';
import type { DiscountType } from '../../../lib/couponsApi';
import { toast } from '../../../lib/toast';
import {
  CategoryPicker,
  DateField,
  DiscountTypePicker,
  FormHeader,
  LimitOption,
  OfferSummary,
  ProductPicker,
  UnitInput,
  offerSentence,
  scopeText,
  toLocalInput,
  type PickedItem,
} from './MarketingKit';

/**
 * Marketing > Discounts "+ Add New" (and Edit, via the :id param). An
 * automatic discount: name, what it takes off, the conditions a cart
 * must meet, and when it runs. The sentence at the bottom says what the
 * shopper gets as the form is filled in.
 */
export default function AddDiscount() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['discounts', id],
    queryFn: () => discountsApi.findOne(id!),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [amount, setAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [applyOnListPrice, setApplyOnListPrice] = useState(false);
  const [minCartAmount, setMinCartAmount] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [limitProducts, setLimitProducts] = useState(false);
  const [limitCategories, setLimitCategories] = useState(false);
  const [products, setProducts] = useState<PickedItem[]>([]);
  const [categories, setCategories] = useState<PickedItem[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // One-time fill once the saved discount arrives.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setActive(existing.active);
    setDiscountType(existing.discountType);
    setAmount(existing.amount ? String(Number(existing.amount)) : '');
    setMaxDiscount(existing.maxDiscount ? String(Number(existing.maxDiscount)) : '');
    setApplyOnListPrice(existing.applyOnListPrice);
    setMinCartAmount(existing.minCartAmount ? String(Number(existing.minCartAmount)) : '');
    setMinQuantity(existing.minQuantity ? String(existing.minQuantity) : '');
    setLimitProducts(existing.products.length > 0);
    setLimitCategories(existing.categories.length > 0);
    setProducts(existing.products.map((p) => ({ id: p.id, label: p.name, photoUrl: null })));
    setCategories(existing.categories.map((c) => ({ id: c.id, label: c.name })));
    setStartsAt(toLocalInput(existing.startsAt));
    setEndsAt(toLocalInput(existing.endsAt));
  }, [existing]);

  // Blank optional fields go out as null so an edit can clear them.
  const payload = {
    name: name.trim(),
    active,
    discountType,
    amount: discountType === 'FREE_SHIPPING' ? null : Number(amount),
    maxDiscount: discountType === 'PERCENT' && maxDiscount ? Number(maxDiscount) : null,
    applyOnListPrice: discountType === 'FREE_SHIPPING' ? false : applyOnListPrice,
    minCartAmount: minCartAmount ? Number(minCartAmount) : null,
    minQuantity: minQuantity ? Number(minQuantity) : null,
    productIds: limitProducts ? products.map((p) => p.id) : [],
    categoryIds: limitCategories ? categories.map((c) => c.id) : [],
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
  };

  const snapshot = JSON.stringify(payload);
  const initial = useRef<string | null>(null);
  useEffect(() => {
    if (initial.current == null && (!isEdit || existing)) initial.current = snapshot;
  }, [snapshot, isEdit, existing]);
  const dirty = !saved && initial.current != null && initial.current !== snapshot;
  useUnsavedChangesWarning(dirty);

  const errors = {
    name: !name.trim() ? 'Give it a name shoppers will see, e.g. Eid offer.' : null,
    amount:
      discountType === 'FREE_SHIPPING'
        ? null
        : !amount || Number(amount) <= 0
          ? 'Enter how much off.'
          : discountType === 'PERCENT' && Number(amount) > 100
            ? 'A percentage can be at most 100.'
            : null,
    products: limitProducts && products.length === 0 ? 'Pick at least one product, or untick this.' : null,
    categories: limitCategories && categories.length === 0 ? 'Pick at least one category, or untick this.' : null,
    endsAt: startsAt && endsAt && new Date(endsAt) <= new Date(startsAt) ? 'The end must be after the start.' : null,
  };
  const shown = (k: keyof typeof errors) => (submitted || (k === 'endsAt' && endsAt) ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) return discountsApi.update(id!, payload);
      // Create takes undefined, not null, for "not set".
      const createPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
      return discountsApi.create(createPayload as typeof payload);
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success(isEdit ? 'Discount saved' : 'Discount added');
      navigate('/vendor/marketing/discounts');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this discount. Check your connection and try again.');
    },
  });

  const sentence = offerSentence({
    type: discountType,
    amount,
    maxDiscount,
    minCart: minCartAmount,
    minQuantity,
    scope: scopeText(limitProducts ? products.length : 0, limitCategories ? categories.length : 0),
    startsAt,
    endsAt,
  });

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
        backTo="/vendor/marketing/discounts"
        backLabel="Discounts"
        title={isEdit ? `Edit ${existing?.name ?? 'discount'}` : 'New discount'}
        description="Taken off the cart by itself when the conditions are met. No code needed."
      />

      <div className="space-y-4">
        <SectionCard title="Name">
          <div className="space-y-4">
            <Field label="Name" required error={shown('name')} hint="Shoppers see it in the cart, e.g. “Eid offer”.">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid offer" className={productInputClass} />
            </Field>
            <ToggleRow checked={active} onChange={setActive} label="On" hint="Turn off to pause it without deleting." />
          </div>
        </SectionCard>

        <SectionCard title="Discount">
          <div className="space-y-4">
            <DiscountTypePicker<DiscountType>
              value={discountType}
              onChange={setDiscountType}
              options={[
                { id: 'PERCENT', label: '% off' },
                { id: 'FIXED', label: '৳ off' },
                { id: 'FREE_SHIPPING', label: 'Free delivery' },
              ]}
            />
            {discountType !== 'FREE_SHIPPING' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={discountType === 'PERCENT' ? 'Percent off' : 'Amount off'} required error={shown('amount')}>
                    <UnitInput unit={discountType === 'PERCENT' ? '%' : '৳'} value={amount} onChange={setAmount} placeholder={discountType === 'PERCENT' ? 'e.g. 10' : 'e.g. 200'} />
                  </Field>
                  {discountType === 'PERCENT' && (
                    <Field label="Most it can take off" hint="Leave empty for no limit.">
                      <UnitInput unit="৳" value={maxDiscount} onChange={setMaxDiscount} placeholder="e.g. 500" />
                    </Field>
                  )}
                </div>
                <ToggleRow
                  checked={applyOnListPrice}
                  onChange={setApplyOnListPrice}
                  label="Count from the regular price"
                  hint="On: the % is taken from the price before any sale price. Off: from the price the shopper sees."
                />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard title="When a cart gets it" description="Leave everything empty and every order gets it.">
          <div className="space-y-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum order amount">
                <UnitInput unit="৳" value={minCartAmount} onChange={setMinCartAmount} placeholder="No minimum" />
              </Field>
              <Field label="Minimum number of items">
                <UnitInput unit={null} integer value={minQuantity} onChange={setMinQuantity} placeholder="No minimum" />
              </Field>
            </div>
            <div className="pt-2">
              <LimitOption
                checked={limitProducts}
                onChange={(v) => {
                  setLimitProducts(v);
                  if (!v) setProducts([]);
                }}
                label="Only on these products"
              >
                <ProductPicker selected={products} onChange={setProducts} error={shown('products')} />
              </LimitOption>
              <LimitOption
                checked={limitCategories}
                onChange={(v) => {
                  setLimitCategories(v);
                  if (!v) setCategories([]);
                }}
                label="Only on these categories"
              >
                <CategoryPicker selected={categories} onChange={setCategories} error={shown('categories')} />
              </LimitOption>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="When it runs">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Starts" value={startsAt} onChange={setStartsAt} role="start" optional />
            <DateField label="Ends" value={endsAt} onChange={setEndsAt} role="end" optional error={shown('endsAt')} />
          </div>
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
        <Link to="/vendor/marketing/discounts" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save discount' : 'Add discount'}
        </button>
      </SaveBar>
    </form>
  );
}
