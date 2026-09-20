import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, X, Copy } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { couponsApi, type DiscountType } from '../../../lib/couponsApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { customersApi, type VendorCustomer } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';

/** Same visual pattern as the pin/unpin switches on Orders > Customize Tabs. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-regantify-cta' : 'bg-black/15'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

type RestrictionKind = 'newCustomer' | 'customer' | 'product' | 'category';

/**
 * Marketing > Coupons "+ Add New" (and Edit, via the :id param — same
 * page, same shape as AddReview.tsx) — matches the reference "New
 * Coupon" form's four sections field-for-field: General Information,
 * Discount Information, Coupon Restrictions, Usage Information.
 */
export default function AddCoupon() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  const { data: existing } = useQuery({
    queryKey: ['coupons', id],
    queryFn: () => couponsApi.findOne(id!),
    enabled: isEdit,
  });

  // -- General Information --
  const [code, setCode] = useState('');
  const [validTill, setValidTill] = useState(''); // yyyy-mm-dd
  const [hasCustomLink, setHasCustomLink] = useState(false);
  const [customLink, setCustomLink] = useState('');

  // -- Discount Information --
  const [discountType, setDiscountType] = useState<DiscountType>('FIXED');
  const [amount, setAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [applyOnListPrice, setApplyOnListPrice] = useState(false);
  const [resetOtherDiscounts, setResetOtherDiscounts] = useState(true);

  // -- Coupon Restrictions --
  const [minCartAmount, setMinCartAmount] = useState('');
  const [activeRestrictions, setActiveRestrictions] = useState<Set<RestrictionKind>>(new Set());

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerFocused, setCustomerFocused] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<VendorCustomer[]>([]);

  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // -- Usage Information --
  const [usageLimit, setUsageLimit] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Fills the form once the existing coupon arrives — a plain one-time
  // fill, not a controlled sync (same pattern as AddReview.tsx).
  useEffect(() => {
    if (!existing) return;
    setCode(existing.code);
    setValidTill(existing.validTill ? existing.validTill.slice(0, 10) : '');
    setHasCustomLink(existing.hasCustomLink);
    setCustomLink(existing.customLink ?? '');
    setDiscountType(existing.discountType);
    setAmount(existing.amount ?? '');
    setMaxDiscount(existing.maxDiscount ?? '');
    setApplyOnListPrice(existing.applyOnListPrice);
    setResetOtherDiscounts(existing.resetOtherDiscounts);
    setMinCartAmount(existing.minCartAmount ?? '');
    const restrictions = new Set<RestrictionKind>();
    if (existing.newCustomerOnly) restrictions.add('newCustomer');
    if (existing.customerPhones.length > 0) restrictions.add('customer');
    if (existing.products.length > 0) restrictions.add('product');
    if (existing.categories.length > 0) restrictions.add('category');
    setActiveRestrictions(restrictions);
    setSelectedProducts(existing.products.map((p) => ({ id: p.id, name: p.name }) as Product));
    setSelectedCategories(existing.categories.map((c) => ({ id: c.id, name: c.name }) as Category));
    setUsageLimit(existing.usageLimit ? String(existing.usageLimit) : '');
    // Customer restriction is stored as plain phone numbers, not full
    // VendorCustomer records — shown as minimal stand-in rows (phone
    // only) since the form only needs the phone to submit anyway.
    setSelectedCustomers(
      existing.customerPhones.map((phone) => ({ phone, name: phone }) as VendorCustomer),
    );
  }, [existing]);

  const { data: customerSearchResults } = useQuery({
    queryKey: ['customers-search', customerQuery],
    queryFn: () => customersApi.list({ search: customerQuery.trim(), perPage: 8 }),
    enabled: customerQuery.trim().length > 0,
  });
  const customerMatches = (customerSearchResults?.customers ?? []).filter(
    (c) => !selectedCustomers.some((sc) => sc.phone === c.phone),
  );

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productQuery],
    queryFn: () => productsApi.list({ search: productQuery.trim(), perPage: 8 }),
    enabled: productQuery.trim().length > 0,
  });
  const productMatches = (productSearchResults?.products ?? []).filter(
    (p) => !selectedProducts.some((sp) => sp.id === p.id),
  );

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });
  const categoryMatches = (allCategories ?? []).filter(
    (c) =>
      !selectedCategories.some((sc) => sc.id === c.id) &&
      (categoryQuery.trim() ? c.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()) : true),
  );

  const toggleRestriction = (kind: RestrictionKind) => {
    setActiveRestrictions((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
        if (kind === 'customer') setSelectedCustomers([]);
        if (kind === 'product') setSelectedProducts([]);
        if (kind === 'category') setSelectedCategories([]);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  const buildPayload = () => ({
    code: code.trim(),
    validTill: validTill || undefined,
    hasCustomLink,
    customLink: hasCustomLink ? customLink.trim() || undefined : undefined,
    discountType,
    amount: discountType === 'FREE_SHIPPING' ? undefined : Number(amount),
    maxDiscount: discountType === 'PERCENT' && maxDiscount ? Number(maxDiscount) : undefined,
    applyOnListPrice,
    resetOtherDiscounts,
    minCartAmount: minCartAmount ? Number(minCartAmount) : undefined,
    newCustomerOnly: activeRestrictions.has('newCustomer'),
    customerPhones: activeRestrictions.has('customer') ? selectedCustomers.map((c) => c.phone) : [],
    productIds: activeRestrictions.has('product') ? selectedProducts.map((p) => p.id) : [],
    categoryIds: activeRestrictions.has('category') ? selectedCategories.map((c) => c.id) : [],
    usageLimit: usageLimit ? Number(usageLimit) : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? couponsApi.update(id!, buildPayload()) : couponsApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(isEdit ? 'Coupon updated.' : 'Coupon created.');
      navigate('/vendor/marketing/coupons');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save this coupon. Please try again.');
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (discountType !== 'FREE_SHIPPING' && (!amount.trim() || Number(amount) < 0)) {
      setFormError('Enter a discount amount.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/marketing/coupons')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Coupons
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">{isEdit ? 'Edit Coupon' : 'New Coupon'}</h1>

      <div className="space-y-6">
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Code" required>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="######"
                className={inputClass}
              />
            </Field>

            <Field label="Valid till">
              <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className={inputClass} />
              {validTill && (
                <button
                  type="button"
                  onClick={() => setValidTill('')}
                  className="mt-1.5 text-xs text-regantify-cta hover:text-regantify-cta-dark"
                >
                  Reset Expiry Date
                </button>
              )}
            </Field>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-regantify-text">Create custom link for this coupon</span>
              <Toggle checked={hasCustomLink} onChange={setHasCustomLink} />
            </div>
            {hasCustomLink && (
              <Field label="Custom Link" hint="Shoppers who open this link have the coupon applied automatically.">
                <input
                  type="text"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  placeholder="e.g. spring-sale"
                  className={inputClass}
                />
                {customLink.trim() && subdomain && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-regantify-content px-3 py-2">
                    <span className="flex-1 truncate text-xs text-regantify-text-muted">
                      {`${storefrontStoreUrl(subdomain)}?coupon=${encodeURIComponent(customLink.trim())}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${storefrontStoreUrl(subdomain)}?coupon=${encodeURIComponent(customLink.trim())}`;
                        navigator.clipboard.writeText(url).then(() => toast.success('Link copied.'));
                      }}
                      className="shrink-0 text-regantify-text-muted hover:text-regantify-cta"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </Field>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Discount Information">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-regantify-text mb-2.5">Discount Type</p>
              <div className="flex flex-wrap gap-5">
                {(
                  [
                    ['FIXED', 'Fixed Discount'],
                    ['PERCENT', 'Percentage Discount'],
                    ['FREE_SHIPPING', 'Free Shipping'],
                  ] as [DiscountType, string][]
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === value}
                      onChange={() => setDiscountType(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {discountType !== 'FREE_SHIPPING' && (
              <Field label="Amount" required>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted text-sm">
                    {discountType === 'PERCENT' ? '%' : '৳'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </Field>
            )}

            {discountType === 'PERCENT' && (
              <Field label="Max Discount" hint="Leave blank for no cap.">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted text-sm">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </Field>
            )}

            {discountType !== 'FREE_SHIPPING' && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-regantify-text">Apply on list price</p>
                    <p className="text-xs text-regantify-text-muted mt-0.5">
                      Calculate discount on original price instead of discounted price
                    </p>
                  </div>
                  <Toggle checked={applyOnListPrice} onChange={setApplyOnListPrice} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-regantify-text">Reset other conditional discounts</p>
                    <p className="text-xs text-regantify-text-muted mt-0.5">
                      When this coupon is applied other discounts will be reset.
                    </p>
                  </div>
                  <Toggle checked={resetOtherDiscounts} onChange={setResetOtherDiscounts} />
                </div>
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Coupon Restrictions">
          <div className="space-y-5">
            <Field label="Minimum Cart Amount">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted text-sm">৳</span>
                <input
                  type="number"
                  min={0}
                  value={minCartAmount}
                  onChange={(e) => setMinCartAmount(e.target.value)}
                  placeholder="Minimum cart amount for this coupon to work"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </Field>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-2.5">
                Limit this coupon to Customer, Product or Categories
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRestrictions.has('newCustomer')}
                    onChange={() => toggleRestriction('newCustomer')}
                  />
                  New Customer
                </label>
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRestrictions.has('customer')}
                    onChange={() => toggleRestriction('customer')}
                  />
                  Customer
                </label>
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRestrictions.has('product')}
                    onChange={() => toggleRestriction('product')}
                  />
                  Product
                </label>
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeRestrictions.has('category')}
                    onChange={() => toggleRestriction('category')}
                  />
                  Category
                </label>
              </div>
            </div>

            {activeRestrictions.has('customer') && (
              <div>
                <p className="text-sm font-medium text-regantify-text mb-2">Customers</p>
                <div className="space-y-2 mb-3">
                  {selectedCustomers.map((c) => (
                    <div key={c.phone} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                      <div className="min-w-0">
                        <span className="text-sm text-regantify-text truncate block">{c.name}</span>
                        {c.name !== c.phone && <span className="text-xs text-regantify-text-muted">{c.phone}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomers((prev) => prev.filter((sc) => sc.phone !== c.phone))}
                        className="text-regantify-text-muted hover:text-red-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onFocus={() => setCustomerFocused(true)}
                    onBlur={() => setTimeout(() => setCustomerFocused(false), 150)}
                    placeholder="Search customers by name or phone"
                    className={`${inputClass} pl-10`}
                  />
                  {customerFocused && customerMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-56 overflow-y-auto py-1">
                      {customerMatches.map((c) => (
                        <button
                          key={c.phone}
                          type="button"
                          onMouseDown={() => {
                            setSelectedCustomers((prev) => [...prev, c]);
                            setCustomerQuery('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content flex items-center justify-between gap-2"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-regantify-text-muted">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeRestrictions.has('product') && (
              <div>
                <p className="text-sm font-medium text-regantify-text mb-2">Products</p>
                <div className="space-y-2 mb-3">
                  {selectedProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                      <span className="text-sm text-regantify-text truncate">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProducts((prev) => prev.filter((sp) => sp.id !== p.id))}
                        className="text-regantify-text-muted hover:text-red-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onFocus={() => setProductFocused(true)}
                    onBlur={() => setTimeout(() => setProductFocused(false), 150)}
                    placeholder="Search products to add"
                    className={`${inputClass} pl-10`}
                  />
                  {productFocused && productMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-56 overflow-y-auto py-1">
                      {productMatches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedProducts((prev) => [...prev, p]);
                            setProductQuery('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content flex items-center gap-2.5"
                        >
                          <img src={p.photoUrls[0] ?? ''} alt="" className="w-6 h-6 rounded object-cover bg-regantify-content" />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeRestrictions.has('category') && (
              <div>
                <p className="text-sm font-medium text-regantify-text mb-2">Categories</p>
                <div className="space-y-2 mb-3">
                  {selectedCategories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                      <span className="text-sm text-regantify-text truncate">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategories((prev) => prev.filter((sc) => sc.id !== c.id))}
                        className="text-regantify-text-muted hover:text-red-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
                  <input
                    type="text"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    onFocus={() => setCategoryFocused(true)}
                    onBlur={() => setTimeout(() => setCategoryFocused(false), 150)}
                    placeholder="Search categories to add"
                    className={`${inputClass} pl-10`}
                  />
                  {categoryFocused && categoryMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-56 overflow-y-auto py-1">
                      {categoryMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedCategories((prev) => [...prev, c]);
                            setCategoryQuery('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Usage Information">
          <Field label="Usage Limit" hint="Leave blank for unlimited use.">
            <input
              type="number"
              min={1}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Number of times this coupon can be used"
              className={inputClass}
            />
          </Field>
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Coupon' : 'Add Coupon'}
        </button>
      </div>
    </div>
  );
}
