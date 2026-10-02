import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Shuffle } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, ToggleRow, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { couponsApi, type DiscountType } from '../../../lib/couponsApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import {
  CategoryPicker,
  CustomerPicker,
  DateField,
  DiscountTypePicker,
  FormHeader,
  LimitOption,
  OfferSummary,
  ProductPicker,
  UnitInput,
  copyText,
  offerSentence,
  scopeText,
  type PickedItem,
} from './MarketingKit';

/** An easy-to-read code: no 0/O or 1/I. */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => chars[n % chars.length]).join('');
}

/**
 * Marketing > Coupons "+ Add New" (and Edit, via the :id param). Four
 * short sections: the code (and its share link), the discount, who can
 * use it, and when / how often. A live sentence at the bottom says what
 * the shopper gets; field errors show after the first Save.
 */
export default function AddCoupon() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['coupons', id],
    queryFn: () => couponsApi.findOne(id!),
    enabled: isEdit,
  });

  const [code, setCode] = useState('');
  const [validTill, setValidTill] = useState(''); // yyyy-mm-dd
  const [hasCustomLink, setHasCustomLink] = useState(false);
  const [customLink, setCustomLink] = useState('');

  const [discountType, setDiscountType] = useState<DiscountType>('FIXED');
  const [amount, setAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [applyOnListPrice, setApplyOnListPrice] = useState(false);
  const [resetOtherDiscounts, setResetOtherDiscounts] = useState(true);

  const [minCartAmount, setMinCartAmount] = useState('');
  const [newCustomerOnly, setNewCustomerOnly] = useState(false);
  const [limitCustomers, setLimitCustomers] = useState(false);
  const [limitProducts, setLimitProducts] = useState(false);
  const [limitCategories, setLimitCategories] = useState(false);
  const [customers, setCustomers] = useState<PickedItem[]>([]);
  const [products, setProducts] = useState<PickedItem[]>([]);
  const [categories, setCategories] = useState<PickedItem[]>([]);

  const [usageLimit, setUsageLimit] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // One-time fill once the existing coupon arrives.
  useEffect(() => {
    if (!existing) return;
    setCode(existing.code);
    setValidTill(existing.validTill ? new Date(new Date(existing.validTill).getTime() + 6 * 3600_000).toISOString().slice(0, 10) : '');
    setHasCustomLink(existing.hasCustomLink);
    setCustomLink(existing.customLink ?? '');
    setDiscountType(existing.discountType);
    setAmount(existing.amount ? String(Number(existing.amount)) : '');
    setMaxDiscount(existing.maxDiscount ? String(Number(existing.maxDiscount)) : '');
    setApplyOnListPrice(existing.applyOnListPrice);
    setResetOtherDiscounts(existing.resetOtherDiscounts);
    setMinCartAmount(existing.minCartAmount ? String(Number(existing.minCartAmount)) : '');
    setNewCustomerOnly(existing.newCustomerOnly);
    setLimitCustomers(existing.customerPhones.length > 0);
    setLimitProducts(existing.products.length > 0);
    setLimitCategories(existing.categories.length > 0);
    // Customers are stored as phone numbers only.
    setCustomers(existing.customerPhones.map((phone) => ({ id: phone, label: phone })));
    setProducts(existing.products.map((p) => ({ id: p.id, label: p.name, photoUrl: null })));
    setCategories(existing.categories.map((c) => ({ id: c.id, label: c.name })));
    setUsageLimit(existing.usageLimit ? String(existing.usageLimit) : '');
  }, [existing]);

  // On Edit an emptied field is sent as null so it's cleared; on create it's left out.
  const blank = isEdit ? null : undefined;
  const payload = {
    code: code.trim(),
    // The end of that day in Dhaka (a bare date would mean 6 AM, UTC midnight).
    validTill: validTill ? `${validTill}T23:59:59+06:00` : blank,
    hasCustomLink,
    customLink: hasCustomLink ? customLink.trim() || undefined : undefined,
    discountType,
    amount: discountType === 'FREE_SHIPPING' ? undefined : Number(amount),
    maxDiscount: discountType === 'PERCENT' && maxDiscount ? Number(maxDiscount) : blank,
    applyOnListPrice,
    resetOtherDiscounts,
    minCartAmount: minCartAmount ? Number(minCartAmount) : blank,
    newCustomerOnly,
    customerPhones: limitCustomers ? customers.map((c) => c.id) : [],
    productIds: limitProducts ? products.map((p) => p.id) : [],
    categoryIds: limitCategories ? categories.map((c) => c.id) : [],
    usageLimit: usageLimit ? Number(usageLimit) : blank,
  };

  // Unsaved-changes warning: compare with what was loaded (or the empty form).
  const snapshot = JSON.stringify(payload);
  const initial = useRef<string | null>(null);
  useEffect(() => {
    if (initial.current == null && (!isEdit || existing)) initial.current = snapshot;
  }, [snapshot, isEdit, existing]);
  const dirty = !saved && initial.current != null && initial.current !== snapshot;
  useUnsavedChangesWarning(dirty);

  const errors = {
    code: !code.trim() ? 'Type a code, or tap Generate.' : /\s/.test(code.trim()) ? 'Codes can’t have spaces.' : null,
    amount:
      discountType === 'FREE_SHIPPING'
        ? null
        : !amount || Number(amount) <= 0
          ? 'Enter how much off.'
          : discountType === 'PERCENT' && Number(amount) > 100
            ? 'A percentage can be at most 100.'
            : null,
    customLink: hasCustomLink && !customLink.trim() ? 'Type a link name, e.g. eid-sale.' : null,
    customers: limitCustomers && customers.length === 0 ? 'Pick at least one customer, or untick this.' : null,
    products: limitProducts && products.length === 0 ? 'Pick at least one product, or untick this.' : null,
    categories: limitCategories && categories.length === 0 ? 'Pick at least one category, or untick this.' : null,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? couponsApi.update(id!, payload) : couponsApi.create(payload)),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(isEdit ? 'Coupon saved' : 'Coupon added');
      navigate('/vendor/marketing/coupons');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this coupon. Check your connection and try again.');
    },
  });

  const sentence = useMemo(
    () =>
      offerSentence({
        type: discountType,
        amount,
        maxDiscount,
        minCart: minCartAmount,
        scope: limitProducts || limitCategories ? scopeText(limitProducts ? products.length : 0, limitCategories ? categories.length : 0) : undefined,
        who: newCustomerOnly ? 'for first-time customers' : limitCustomers && customers.length ? `for ${customers.length} chosen ${customers.length === 1 ? 'customer' : 'customers'}` : undefined,
        endsAt: validTill,
        usageLimit,
      }),
    [discountType, amount, maxDiscount, minCartAmount, limitProducts, limitCategories, products.length, categories.length, newCustomerOnly, limitCustomers, customers.length, validTill, usageLimit],
  );

  const shareUrl = subdomain && customLink.trim() ? `${storefrontStoreUrl(subdomain)}?coupon=${encodeURIComponent(customLink.trim())}` : null;

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
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
        backTo="/vendor/marketing/coupons"
        backLabel="Coupons"
        title={isEdit ? `Edit coupon ${existing?.code ?? ''}` : 'New coupon'}
        description="Shoppers type the code at checkout to get the discount."
      />

      <div className="space-y-4">
        <SectionCard title="Code">
          <div className="space-y-4">
            <Field label="Coupon code" required error={shown('code')} hint="Letters and numbers, no spaces. Shoppers can type it in small letters too.">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="e.g. EID100"
                  maxLength={40}
                  className={`${productInputClass} font-mono uppercase`}
                />
                <button type="button" onClick={() => setCode(generateCode())} className={`${outlineBtn} h-[42px] shrink-0`}>
                  <Shuffle size={14} aria-hidden />
                  Generate
                </button>
              </div>
            </Field>

            <ToggleRow
              checked={hasCustomLink}
              onChange={setHasCustomLink}
              label="Share link"
              hint="A link that opens your store with this coupon already applied, for Facebook posts and messages."
            />
            {hasCustomLink && (
              <Field label="Link name" required error={shown('customLink')}>
                <input type="text" value={customLink} onChange={(e) => setCustomLink(e.target.value.replace(/\s/g, '-'))} placeholder="e.g. eid-sale" className={productInputClass} />
                {shareUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-neutral-50 py-1 pl-3 pr-1">
                    <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">{shareUrl}</span>
                    <button type="button" onClick={() => copyText(shareUrl, 'Link')} className={`${outlineBtn} h-8 shrink-0`}>
                      <Copy size={13} aria-hidden />
                      Copy
                    </button>
                  </div>
                )}
              </Field>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Discount">
          <div className="space-y-4">
            <DiscountTypePicker<DiscountType>
              value={discountType}
              onChange={setDiscountType}
              options={[
                { id: 'FIXED', label: '৳ off' },
                { id: 'PERCENT', label: '% off' },
                { id: 'FREE_SHIPPING', label: 'Free delivery' },
              ]}
            />
            {discountType !== 'FREE_SHIPPING' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={discountType === 'PERCENT' ? 'Percent off' : 'Amount off'} required error={shown('amount')}>
                  <UnitInput unit={discountType === 'PERCENT' ? '%' : '৳'} value={amount} onChange={setAmount} placeholder={discountType === 'PERCENT' ? 'e.g. 10' : 'e.g. 100'} />
                </Field>
                {discountType === 'PERCENT' && (
                  <Field label="Most it can take off" hint="Leave empty for no limit.">
                    <UnitInput unit="৳" value={maxDiscount} onChange={setMaxDiscount} placeholder="e.g. 500" />
                  </Field>
                )}
              </div>
            )}
            {discountType !== 'FREE_SHIPPING' && (
              <div className="space-y-3 border-t border-line pt-4">
                <ToggleRow
                  checked={applyOnListPrice}
                  onChange={setApplyOnListPrice}
                  label="Count from the regular price"
                  hint="On: the % is taken from the price before any sale price. Off: from the price the shopper sees."
                />
                <ToggleRow
                  checked={resetOtherDiscounts}
                  onChange={setResetOtherDiscounts}
                  label="Replace other automatic discounts"
                  hint="On: with this coupon, store discounts on the cart don’t also apply."
                />
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Who can use it" description="Leave everything off and anyone can use it on any order.">
          <div className="space-y-2">
            <Field label="Minimum order amount" hint="The cart must be at least this much.">
              <UnitInput unit="৳" value={minCartAmount} onChange={setMinCartAmount} placeholder="No minimum" />
            </Field>
            <div className="pt-2">
              <LimitOption checked={newCustomerOnly} onChange={setNewCustomerOnly} label="First-time customers only" hint="Phones that never ordered from your store before." />
              <LimitOption
                checked={limitCustomers}
                onChange={(v) => {
                  setLimitCustomers(v);
                  if (!v) setCustomers([]);
                }}
                label="Only these customers"
              >
                <CustomerPicker selected={customers} onChange={setCustomers} error={shown('customers')} />
              </LimitOption>
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

        <SectionCard title="When and how often">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Last day" value={validTill} onChange={setValidTill} role="end" kind="date" optional hint="Works until the end of this day." />
            <Field label="How many times in total" hint={existing ? `Used ${existing.usageCount} so far. Empty means no limit.` : 'Empty means no limit.'}>
              <UnitInput unit={null} integer value={usageLimit} onChange={setUsageLimit} placeholder="No limit" />
            </Field>
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
        <Link to="/vendor/marketing/coupons" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save coupon' : 'Add coupon'}
        </button>
      </SaveBar>
    </form>
  );
}
