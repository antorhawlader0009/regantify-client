import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, X } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { flashSalesApi, type FlashSaleDiscountType } from '../../../lib/flashSalesApi';
import { productsApi } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';

/** Same visual pattern as AddDiscount's switches. */
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
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Same rule as the server's flash-sale-pricing.ts, used only for the preview next to each product. */
function salePrice(listPrice: number, type: FlashSaleDiscountType, amount: number): number {
  const raw = type === 'PERCENT' ? listPrice * (1 - amount / 100) : listPrice - amount;
  return Math.max(0, Math.round(raw * 100) / 100);
}

interface PickedProduct {
  id: string;
  name: string;
  price: number;
  photoUrl: string | null;
}

/**
 * Marketing > Flash Sale "+ Add New" (and Edit, via the :id param — same
 * page, same shape as AddDiscount.tsx). Sections: General, Discount,
 * Schedule, Products.
 */
export default function AddFlashSale() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
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

  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<PickedProduct[]>([]);

  const [formError, setFormError] = useState<string | null>(null);

  // One-time fill once the saved flash sale arrives (same as AddDiscount.tsx).
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setActive(existing.active);
    setDiscountType(existing.discountType);
    setAmount(String(Number(existing.amount)));
    setStartsAt(toLocalInput(existing.startsAt));
    setEndsAt(toLocalInput(existing.endsAt));
    setSelectedProducts(
      existing.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        photoUrl: p.photoUrls[0] ?? null,
      })),
    );
  }, [existing]);

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productQuery],
    queryFn: () => productsApi.list({ search: productQuery.trim(), perPage: 8 }),
    enabled: productQuery.trim().length > 0,
  });
  const productMatches = (productSearchResults?.products ?? []).filter(
    (p) => !selectedProducts.some((sp) => sp.id === p.id),
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        active,
        discountType,
        amount: Number(amount),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        productIds: selectedProducts.map((p) => p.id),
      };
      return isEdit ? flashSalesApi.update(id!, payload) : flashSalesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      toast.success(isEdit ? 'Flash sale updated.' : 'Flash sale created.');
      navigate('/vendor/marketing/flash-sale');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError(
        (Array.isArray(message) ? message[0] : message) ?? 'Could not save this flash sale. Please try again.',
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Flash sale name is required.');
      return;
    }
    if (!amount.trim() || Number(amount) <= 0) {
      setFormError('Enter a discount amount.');
      return;
    }
    if (discountType === 'PERCENT' && Number(amount) > 100) {
      setFormError('A percentage discount can be at most 100%.');
      return;
    }
    if (!startsAt || !endsAt) {
      setFormError('Set when the flash sale starts and ends.');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setFormError('The end time must be after the start time.');
      return;
    }
    if (selectedProducts.length === 0) {
      setFormError('Add at least one product to the flash sale.');
      return;
    }
    saveMutation.mutate();
  };

  const amountNumber = Number(amount) || 0;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/marketing/flash-sale')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Flash Sale
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">
        {isEdit ? 'Edit Flash Sale' : 'New Flash Sale'}
      </h1>

      <div className="space-y-6">
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Name" required hint="Only you see this, e.g. “Eid Midnight Sale”.">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Flash sale name"
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
                  ] as [FlashSaleDiscountType, string][]
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
            <Field
              label={discountType === 'PERCENT' ? 'Discount (%)' : 'Discount (৳)'}
              required
              hint="Taken off each product’s regular price."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={discountType === 'PERCENT' ? 'e.g. 20' : 'e.g. 200'}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Schedule">
          <div className="space-y-5">
            <Field label="Starts" required>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Ends" required hint="The sale stops by itself at this time.">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Products">
          <div className="space-y-3">
            {selectedProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                <div className="flex items-center gap-2.5 min-w-0">
                  {p.photoUrl && <img src={p.photoUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <span className="text-sm text-regantify-text truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {amountNumber > 0 && (
                    <span className="text-xs text-regantify-text-muted whitespace-nowrap">
                      <s>৳{p.price.toLocaleString()}</s>{' '}
                      <span className="font-medium text-regantify-text">
                        ৳{salePrice(p.price, discountType, amountNumber).toLocaleString()}
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedProducts((prev) => prev.filter((sp) => sp.id !== p.id))}
                    className="text-regantify-text-muted hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
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
                        setSelectedProducts((prev) => [
                          ...prev,
                          { id: p.id, name: p.name, price: Number(p.price), photoUrl: p.photoUrls[0] ?? null },
                        ]);
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
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Flash Sale' : 'Add Flash Sale'}
        </button>
      </div>
    </div>
  );
}
