import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, X } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { discountsApi } from '../../../lib/discountsApi';
import type { DiscountType } from '../../../lib/couponsApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { toast } from '../../../lib/toast';

/** Same visual pattern as AddCoupon's switches. */
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

/** ISO string -> the local "yyyy-MM-ddTHH:mm" a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Restriction = 'product' | 'category';

/**
 * Marketing > Discounts "+ Add New" (and Edit, via the :id param — same
 * page, same shape as AddCoupon.tsx). Sections: General, Discount,
 * Conditions, Schedule.
 */
export default function AddDiscount() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['discounts', id],
    queryFn: () => discountsApi.findOne(id!),
    enabled: isEdit,
  });

  // -- General --
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);

  // -- Discount --
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [amount, setAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [applyOnListPrice, setApplyOnListPrice] = useState(false);

  // -- Conditions --
  const [minCartAmount, setMinCartAmount] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [restrictions, setRestrictions] = useState<Set<Restriction>>(new Set());

  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // -- Schedule --
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // One-time fill once the saved discount arrives (same as AddCoupon.tsx).
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setActive(existing.active);
    setDiscountType(existing.discountType);
    setAmount(existing.amount ?? '');
    setMaxDiscount(existing.maxDiscount ?? '');
    setApplyOnListPrice(existing.applyOnListPrice);
    setMinCartAmount(existing.minCartAmount ?? '');
    setMinQuantity(existing.minQuantity ? String(existing.minQuantity) : '');
    const next = new Set<Restriction>();
    if (existing.products.length > 0) next.add('product');
    if (existing.categories.length > 0) next.add('category');
    setRestrictions(next);
    setSelectedProducts(existing.products.map((p) => ({ id: p.id, name: p.name }) as Product));
    setSelectedCategories(existing.categories.map((c) => ({ id: c.id, name: c.name }) as Category));
    setStartsAt(toLocalInput(existing.startsAt));
    setEndsAt(toLocalInput(existing.endsAt));
  }, [existing]);

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

  const toggleRestriction = (kind: Restriction) => {
    setRestrictions((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
        if (kind === 'product') setSelectedProducts([]);
        if (kind === 'category') setSelectedCategories([]);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  // Blank optional fields go out as null so an edit can clear them.
  const buildPayload = () => ({
    name: name.trim(),
    active,
    discountType,
    amount: discountType === 'FREE_SHIPPING' ? null : Number(amount),
    maxDiscount: discountType === 'PERCENT' && maxDiscount ? Number(maxDiscount) : null,
    applyOnListPrice: discountType === 'FREE_SHIPPING' ? false : applyOnListPrice,
    minCartAmount: minCartAmount ? Number(minCartAmount) : null,
    minQuantity: minQuantity ? Number(minQuantity) : null,
    productIds: restrictions.has('product') ? selectedProducts.map((p) => p.id) : [],
    categoryIds: restrictions.has('category') ? selectedCategories.map((c) => c.id) : [],
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      if (isEdit) return discountsApi.update(id!, payload);
      // Create takes undefined, not null, for "not set".
      const createPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
      return discountsApi.create(createPayload as typeof payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success(isEdit ? 'Discount updated.' : 'Discount created.');
      navigate('/vendor/marketing/discounts');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError(
        (Array.isArray(message) ? message[0] : message) ?? 'Could not save this discount. Please try again.',
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Discount name is required.');
      return;
    }
    if (discountType !== 'FREE_SHIPPING' && (!amount.trim() || Number(amount) <= 0)) {
      setFormError('Enter a discount amount.');
      return;
    }
    if (discountType === 'PERCENT' && Number(amount) > 100) {
      setFormError('A percentage discount can be at most 100%.');
      return;
    }
    if (restrictions.has('product') && selectedProducts.length === 0) {
      setFormError('Pick at least one product, or untick Product.');
      return;
    }
    if (restrictions.has('category') && selectedCategories.length === 0) {
      setFormError('Pick at least one category, or untick Category.');
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setFormError('The end date must be after the start date.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/marketing/discounts')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Discounts
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">{isEdit ? 'Edit Discount' : 'New Discount'}</h1>

      <div className="space-y-6">
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Name" required hint="Shoppers see this at checkout, e.g. “Eid Offer”.">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Discount name"
                className={inputClass}
              />
            </Field>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-regantify-text">Active</p>
                <p className="text-xs text-regantify-text-muted mt-0.5">Turn off to pause without deleting it.</p>
              </div>
              <Toggle checked={active} onChange={setActive} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Discount Information">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-regantify-text mb-2.5">Discount Type</p>
              <div className="flex flex-wrap gap-5">
                {(
                  [
                    ['PERCENT', 'Percentage Discount'],
                    ['FIXED', 'Fixed Discount'],
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
                    max={discountType === 'PERCENT' ? 100 : undefined}
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

            {discountType === 'PERCENT' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-regantify-text">Apply on list price</p>
                  <p className="text-xs text-regantify-text-muted mt-0.5">
                    Calculate discount on original price instead of discounted price
                  </p>
                </div>
                <Toggle checked={applyOnListPrice} onChange={setApplyOnListPrice} />
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Conditions">
          <div className="space-y-5">
            <p className="text-xs text-regantify-text-muted -mt-1">
              Leave everything blank to give the discount on every order. When limited to products or categories,
              the minimums count only those items and only they are discounted.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Minimum Purchase Amount">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted text-sm">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={minCartAmount}
                    onChange={(e) => setMinCartAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </Field>
              <Field label="Minimum Quantity">
                <input
                  type="number"
                  min={1}
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  placeholder="e.g. 3 items"
                  className={inputClass}
                />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-2.5">Limit this discount to Products or Categories</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.has('product')}
                    onChange={() => toggleRestriction('product')}
                  />
                  Product
                </label>
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.has('category')}
                    onChange={() => toggleRestriction('category')}
                  />
                  Category
                </label>
              </div>
            </div>

            {restrictions.has('product') && (
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

            {restrictions.has('category') && (
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

        <SectionCard title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Starts" hint="Leave blank to start right away.">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Ends" hint="Leave blank to never end.">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Discount' : 'Add Discount'}
        </button>
      </div>
    </div>
  );
}
