import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Minus, Package, Plus, Search, ShoppingCart, Trash2, UserCheck } from 'lucide-react';
import { normalizeBdPhone } from '../../../lib/bdPhone';
import { productsApi, type Product } from '../../../lib/productsApi';
import { ordersApi, type Order, type OrderItemInput } from '../../../lib/ordersApi';
import { getVendorDeliveryCharges } from '../../../lib/vendorApi';
import { courierApi } from '../../../lib/courierApi';
import { BD_DISTRICTS } from '../../../lib/bdDistricts';
import { PathaoLocationSelects, type PathaoLocationValue } from '../../../components/courier/PathaoLocationSelects';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Field, SectionCard, productInputClass } from '../../../components/product/ProductFormPieces';
import { MoneyInput, SaveBar, Segmented, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { lmsApi } from '../../../lib/lmsApi';

interface CartLine extends OrderItemInput {
  key: string; // productId + variantId, for React keys / dedupe within this form only
}

// State shape passed via navigate(path, { state }) from the Orders page's
// Abandoned Cart tab's "Create Order" action — see AbandonedCart.tsx. Kept
// intentionally light: IncompleteOrderItem has no pricing (a shopper's
// in-progress cart is never treated as a priced snapshot the way a real
// Order's items are), so cart lines are surfaced as a note for the
// vendor to re-add themselves with live, correct pricing, rather than
// silently prefilling a cart with stale/zero prices.
export interface CreateOrderFromIncompleteState {
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  itemsSummary?: string; // e.g. "2x Men's Dress Shoes (wbie1158-brown-43)"
  // Order detail "Exchange": the old order's other details and lines, and which order it replaces.
  customerPhoneAlt?: string | null;
  shippingDistrict?: string | null;
  shippingCity?: string | null;
  staffNote?: string;
  items?: OrderItemInput[];
  exchangeForOrderId?: string;
}

type ChargeMode = 'DHAKA' | 'AROUND_DHAKA' | 'OUTSIDE_DHAKA' | 'CUSTOM';

function formatPrice(value: number) {
  return `৳${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AddOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // -- Customer / Shipping --
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhoneAlt, setCustomerPhoneAlt] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const [triedSave, setTriedSave] = useState(false);
  // Optional Pathao location, only offered once Pathao is connected (the
  // pickers need its token). Pre-filled from the address as it's typed.
  const [pathaoLocation, setPathaoLocation] = useState<PathaoLocationValue>({ cityId: null, zoneId: null, areaId: null });
  const { data: courierAccounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const pathaoConnected = courierAccounts?.some((a) => a.provider === 'PATHAO' && a.isActive) ?? false;

  // Prefill from "Create Order" on the Orders page's Abandoned Cart tab — runs
  // once on mount only (empty deps), since this page's own field state
  // should win over the handoff the moment the vendor starts editing.
  useEffect(() => {
    const state = location.state as CreateOrderFromIncompleteState | null;
    if (!state) return;
    if (state.customerName) setCustomerName(state.customerName);
    if (state.customerPhone) setCustomerPhone(state.customerPhone);
    if (state.customerEmail) setCustomerEmail(state.customerEmail);
    if (state.shippingAddress) setShippingAddress(state.shippingAddress);
    if (state.customerPhoneAlt) setCustomerPhoneAlt(state.customerPhoneAlt);
    if (state.shippingDistrict) setShippingDistrict(state.shippingDistrict);
    if (state.shippingCity) setShippingCity(state.shippingCity);
    if (state.staffNote) setStaffNote(state.staffNote);
    if (state.items?.length) setCart(state.items.map((item) => ({ ...item, key: `${item.productId}:${item.variantId ?? ''}` })));
    if (state.itemsSummary) {
      setStaffNote(`Cart from incomplete checkout — please re-add these items with current pricing:\n${state.itemsSummary}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- From an LMS lead (?fromLead=, opened by the LMS's "Create order") --
  // Fills in the customer and the cart at today's prices; saving the order
  // then closes the lead as won (LMS-plan.md Step 5).
  const [searchParams] = useSearchParams();
  const fromLead = searchParams.get('fromLead');
  const prefillQuery = useQuery({
    queryKey: ['lms', 'order-prefill', fromLead],
    queryFn: () => lmsApi.orderPrefill(fromLead!),
    enabled: !!fromLead,
    retry: false,
    staleTime: Infinity,
  });
  useEffect(() => {
    const p = prefillQuery.data;
    if (!p) return;
    setCustomerName(p.customerName);
    setCustomerPhone(p.customerPhone);
    if (p.customerPhoneAlt) setCustomerPhoneAlt(p.customerPhoneAlt);
    if (p.customerEmail) setCustomerEmail(p.customerEmail);
    if (p.shippingAddress) setShippingAddress(p.shippingAddress);
    if (p.shippingDistrict) setShippingDistrict(p.shippingDistrict);
    if (p.shippingCity) setShippingCity(p.shippingCity);
    if (p.customerNote) setCustomerNote(p.customerNote);
    setStaffNote(p.staffNote);
    setCart(p.items.map((item) => ({ ...item, key: `${item.productId}:${item.variantId ?? ''}` })));
  }, [prefillQuery.data]);

  // -- Returning customer: a full phone number looks up this store's own
  // latest order for it and fills in the fields that are still empty.
  const phone = normalizeBdPhone(customerPhone);
  const debouncedPhone = useDebounced(phone, 400);
  const { data: pastOrder } = useQuery({
    queryKey: ['add-order-phone-lookup', debouncedPhone],
    queryFn: () =>
      ordersApi
        .list({ search: debouncedPhone!, perPage: 5 })
        .then((r) => r.orders.find((o) => normalizeBdPhone(o.customerPhone) === debouncedPhone) ?? null),
    enabled: Boolean(debouncedPhone),
    staleTime: 60_000,
  });
  const lastOrder: Order | null = pastOrder && phone === debouncedPhone ? pastOrder : null;
  const filledFor = useRef<string | null>(null);
  const [filledFrom, setFilledFrom] = useState<number | null>(null);
  useEffect(() => {
    if (!lastOrder || filledFor.current === lastOrder.id) return;
    filledFor.current = lastOrder.id;
    let filled = false;
    const fill = (current: string, next: string | null | undefined, set: (v: string) => void) => {
      if (!current.trim() && next) {
        set(next);
        filled = true;
      }
    };
    fill(customerName, lastOrder.customerName, setCustomerName);
    fill(customerPhoneAlt, lastOrder.customerPhoneAlt, setCustomerPhoneAlt);
    fill(customerEmail, lastOrder.customerEmail, setCustomerEmail);
    fill(shippingAddress, lastOrder.shippingAddress, setShippingAddress);
    fill(shippingCity, lastOrder.shippingCity, setShippingCity);
    fill(shippingDistrict, lastOrder.shippingDistrict, setShippingDistrict);
    fill(shippingZip, lastOrder.shippingZip, setShippingZip);
    setFilledFrom(filled ? lastOrder.invoiceNumber : null);
    // Only when a new past order is found; the vendor's typing must win after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOrder]);

  const { data: deliveryStats } = useQuery({
    queryKey: ['customer-courier-stats', debouncedPhone ? [debouncedPhone] : []],
    queryFn: () => ordersApi.getCustomerCourierStats([debouncedPhone!]),
    enabled: Boolean(debouncedPhone),
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 3 && Object.values(query.state.data?.byPhone ?? {}).some((s) => s.pathao?.pending || s.steadfast?.pending) ? 4000 : false,
  });

  // -- Cart --
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const searchTerm = useDebounced(productSearch.trim(), 250);

  // -- Charges / Discounts --
  const [chargeMode, setChargeMode] = useState<ChargeMode | null>(null);
  const [customCharge, setCustomCharge] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  // Part of the total the customer already paid outside the platform (e.g. the delivery charge on the
  // vendor's own bKash), so the courier collects only the rest.
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['orders-product-search', searchTerm],
    queryFn: () => productsApi.list({ search: searchTerm, perPage: 8 }).then((r) => r.products),
    enabled: searchTerm.length > 0,
  });

  // Store > Delivery Charge / VAT —
  // same values the server actually falls back to below when no custom
  // charge is typed (OrdersService.create). Add Order always creates a
  // COD order (see that method's own comment on why ONLINE_PAYMENT is
  // storefront-only), and VAT applies regardless of payment method, so
  // it's always added server-side too — shown here as a preview so the
  // total matches what's actually created.
  const { data: deliveryCharges } = useQuery({
    queryKey: ['vendor-delivery-charges'],
    queryFn: getVendorDeliveryCharges,
  });
  const DELIVERY_CHARGE: Record<'DHAKA' | 'AROUND_DHAKA' | 'OUTSIDE_DHAKA', number> = {
    DHAKA: Number(deliveryCharges?.insideDhakaCharge ?? 70),
    AROUND_DHAKA: Number(deliveryCharges?.aroundDhakaCharge ?? 100),
    OUTSIDE_DHAKA: Number(deliveryCharges?.outsideDhakaCharge ?? 130),
  };
  // Store > Delivery Charge > Around Dhaka: offered only while the vendor has it on.
  const aroundDhakaOn = deliveryCharges?.aroundDhakaEnabled === true;
  const vatAmount = Number(deliveryCharges?.vatChargeBdt ?? 10);

  const addToCart = (product: Product) => {
    const price = Number(product.discountPrice ?? product.price);
    const listPrice = Number(product.price);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id && !l.variantId);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: product.id,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productImage: product.photoUrls[0],
          listPrice,
          unitPrice: price,
          quantity: 1,
        },
      ];
    });
    setProductSearch('');
    setSearchOpen(false);
    setActiveResult(0);
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  };

  const itemCount = cart.reduce((n, l) => n + l.quantity, 0);
  const cartTotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const customChargeValue = customCharge === '' ? null : Number(customCharge);
  const deliveryCharge =
    chargeMode === 'CUSTOM' ? (customChargeValue ?? 0) : chargeMode ? DELIVERY_CHARGE[chargeMode] : 0;
  const discountValue = showDiscount && discountAmount !== '' ? Number(discountAmount) : null;
  const discount = discountValue ?? 0;
  const grandTotal = Math.max(0, cartTotal + deliveryCharge + vatAmount - discount);
  const advanceValue = showAdvance && advanceAmount !== '' ? Number(advanceAmount) : 0;
  const advance = Number.isFinite(advanceValue) && advanceValue > 0 ? advanceValue : 0;

  const dirty = cart.length > 0 || Boolean(customerName.trim() || customerPhone.trim() || shippingAddress.trim());
  const [submitted, setSubmitted] = useState(false);
  useUnsavedChangesWarning(dirty && !submitted);

  const createMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: async (order) => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ORDER-${order.invoiceNumber} created.`);
      if (fromLead) {
        try {
          await lmsApi.linkOrder(fromLead, order.id);
          toast.success('The LMS lead is closed as won.');
        } catch (err) {
          toast.error(apiErrorMessage(err, "The order was created, but the LMS lead wasn't closed. Close it from the lead."));
        }
      }
      navigate(`/vendor/orders/${order.id}`);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not create the order. Please try again.'));
    },
  });

  const errors = {
    customerName: !customerName.trim() ? 'Enter the customer’s name.' : null,
    customerPhone: !customerPhone.trim() ? 'Enter a phone number.' : null,
    shippingAddress: !shippingAddress.trim() ? 'Enter the delivery address.' : null,
    cart: cart.length === 0 ? 'Add at least one product.' : null,
  };
  const shownError = (key: keyof typeof errors) => (triedSave ? errors[key] : null);

  const handleSubmit = () => {
    setTriedSave(true);
    const first = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
    if (first) {
      toast.error(errors[first]!);
      document.getElementById(first === 'cart' ? 'products' : first === 'shippingAddress' ? 'delivery' : 'customer')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    createMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerPhoneAlt: customerPhoneAlt.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerNote: customerNote.trim() || undefined,
      staffNote: staffNote.trim() || undefined,
      shippingAddress: shippingAddress.trim(),
      shippingZip: shippingZip.trim() || undefined,
      shippingCity: shippingCity.trim() || undefined,
      shippingDistrict: shippingDistrict.trim() || undefined,
      deliveryZone: chargeMode === 'DHAKA' || chargeMode === 'OUTSIDE_DHAKA' || chargeMode === 'AROUND_DHAKA' ? chargeMode : undefined,
      ...(pathaoConnected
        ? {
            pathaoCityId: pathaoLocation.cityId ?? undefined,
            pathaoZoneId: pathaoLocation.zoneId ?? undefined,
            pathaoAreaId: pathaoLocation.areaId ?? undefined,
          }
        : {}),
      items: cart.map(({ key, ...item }) => item),
      deliveryCharge: chargeMode === 'CUSTOM' && customChargeValue !== null ? customChargeValue : undefined,
      discountAmount: discountValue ?? undefined,
      discountLabel: showDiscount ? discountLabel.trim() || undefined : undefined,
      advanceAmount: advance > 0 ? advance : undefined,
      advanceNote: advance > 0 ? advanceNote.trim() || undefined : undefined,
      exchangeForOrderId: (location.state as CreateOrderFromIncompleteState | null)?.exchangeForOrderId,
    });
  };

  // Districts: the 64 plus whatever is already in the field (a lead or a past order may say it differently).
  const districtOptions = useMemo(() => {
    const names = shippingDistrict && !BD_DISTRICTS.includes(shippingDistrict) ? [shippingDistrict, ...BD_DISTRICTS] : BD_DISTRICTS;
    return names.map((label, id) => ({ id, label }));
  }, [shippingDistrict]);
  const districtId = districtOptions.find((o) => o.label === shippingDistrict)?.id ?? null;

  const showResults = searchOpen && productSearch.trim().length > 0;
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResult((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResult((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addToCart(searchResults[activeResult] ?? searchResults[0]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const summaryRows = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-neutral-600">
        <dt>
          Products{itemCount > 0 && <span className="text-neutral-400"> ({itemCount})</span>}
        </dt>
        <dd className="tabular-nums">{formatPrice(cartTotal)}</dd>
      </div>
      <div className="flex justify-between text-neutral-600">
        <dt>Delivery</dt>
        <dd className="tabular-nums">{chargeMode ? formatPrice(deliveryCharge) : <span className="text-neutral-400">Not chosen</span>}</dd>
      </div>
      <div className="flex justify-between text-neutral-600">
        <dt>COD charge</dt>
        <dd className="tabular-nums">{formatPrice(vatAmount)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <dt>Discount{discountLabel.trim() ? `: ${discountLabel.trim()}` : ''}</dt>
          <dd className="tabular-nums">−{formatPrice(discount)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-semibold text-regantify-text">Customer pays</dt>
        <dd className="text-lg font-semibold tabular-nums text-regantify-text">{formatPrice(grandTotal)}</dd>
      </div>
      {advance > 0 && (
        <>
          <div className="flex justify-between text-emerald-700">
            <dt>Received in advance</dt>
            <dd className="tabular-nums">−{formatPrice(advance)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="font-semibold text-regantify-text">Collect on delivery</dt>
            <dd className="font-semibold tabular-nums text-regantify-text">{formatPrice(Math.max(0, grandTotal - advance))}</dd>
          </div>
        </>
      )}
    </dl>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/vendor/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} />
        All orders
      </Link>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-regantify-text">Add order</h1>
        <p className="mt-0.5 text-sm text-neutral-500">For an order taken on the phone, Facebook or in the shop. It’s saved as cash on delivery.</p>
      </div>

      {fromLead && (
        <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-regantify-text">
          {prefillQuery.isPending
            ? 'Loading the lead…'
            : prefillQuery.isError
              ? apiErrorMessage(prefillQuery.error, "The lead's details couldn't load. Fill in the order by hand.")
              : `From an LMS lead. Check the cart and delivery, then create the order: the lead closes as won by itself.`}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Products first: it's what the order is about. */}
          <SectionCard title="Products" id="products" description="Search by name or SKU. ↑ ↓ and Enter work too.">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                value={productSearch}
                autoFocus={!fromLead}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSearchOpen(true);
                  setActiveResult(0);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={onSearchKey}
                placeholder="Search products to add"
                aria-label="Search products to add"
                className={`${productInputClass} pl-10`}
              />
              {showResults && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lg">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-neutral-500">{searching || searchTerm !== productSearch.trim() ? 'Searching…' : 'No product matches that.'}</p>
                  ) : (
                    searchResults.map((product, i) => (
                      <button
                        key={product.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveResult(i)}
                        onClick={() => addToCart(product)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left ${i === activeResult ? 'bg-neutral-100' : ''}`}
                      >
                        {product.photoUrls[0] ? (
                          <img src={product.photoUrls[0]} alt="" className="h-9 w-9 shrink-0 rounded-md border border-line object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400">
                            <Package size={14} aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-regantify-text">{product.name}</span>
                          <span className="block text-xs text-neutral-500">
                            {product.sku} · {formatPrice(Number(product.discountPrice ?? product.price))}
                            {product.stockQuantity != null && ` · ${product.stockQuantity} in stock`}
                          </span>
                        </span>
                        <Plus size={15} className="shrink-0 text-neutral-400" aria-hidden />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {cart.length === 0 ? (
              <div className={`mt-3 rounded-lg border border-dashed px-4 py-6 text-center ${shownError('cart') ? 'border-red-300 bg-red-50/40' : 'border-line'}`}>
                <ShoppingCart size={20} className="mx-auto text-neutral-400" aria-hidden />
                <p className={`mt-1.5 text-sm ${shownError('cart') ? 'text-red-600' : 'text-neutral-500'}`}>
                  {shownError('cart') ?? 'No products yet. Search above to add one.'}
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {cart.map((line) => (
                  <li key={line.key} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {line.productImage ? (
                        <img src={line.productImage} alt="" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400">
                          <Package size={14} aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-regantify-text">{line.productName}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {line.productSku}
                          {line.unitPrice !== line.listPrice && <> · list price {formatPrice(line.listPrice)}</>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-28">
                        <MoneyInput
                          value={String(line.unitPrice)}
                          onChange={(v) => setCart((prev) => prev.map((l) => (l.key === line.key ? { ...l, unitPrice: Number(v) } : l)))}
                          ariaLabel={`Price of ${line.productName}`}
                        />
                      </div>
                      <div className="flex h-10 items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => updateQuantity(line.key, line.quantity - 1)}
                          aria-label="One less"
                          className="flex h-full w-8 items-center justify-center text-neutral-500 hover:text-regantify-text"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.key, Number(e.target.value))}
                          aria-label={`Quantity of ${line.productName}`}
                          className="h-full w-10 border-x border-line text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(line.key, line.quantity + 1)}
                          aria-label="One more"
                          className="flex h-full w-8 items-center justify-center text-neutral-500 hover:text-regantify-text"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="w-24 text-right text-sm font-medium tabular-nums text-regantify-text">{formatPrice(line.unitPrice * line.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.key, 0)}
                      aria-label={`Remove ${line.productName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Customer" id="customer" description="Type the phone first: a returning customer’s details fill in by themselves.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" required error={shownError('customerPhone')}>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  autoComplete="off"
                  className={productInputClass}
                />
              </Field>
              <Field label="Name" required error={shownError('customerName')}>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer’s name" className={productInputClass} />
              </Field>
            </div>

            {lastOrder && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-lime bg-brand-lime/25 px-3 py-2.5 text-sm">
                <UserCheck size={16} className="shrink-0 text-brand" aria-hidden />
                <span className="text-regantify-text">
                  Ordered before: last order{' '}
                  <Link to={`/vendor/orders/${lastOrder.id}`} target="_blank" className="font-medium underline-offset-2 hover:underline">
                    ORDER-{lastOrder.invoiceNumber}
                  </Link>{' '}
                  on {new Date(lastOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
                  {filledFrom === lastOrder.invoiceNumber && ' Empty fields were filled from it.'}
                </span>
              </div>
            )}
            {debouncedPhone && phone === debouncedPhone && (
              <div className="mt-3">
                <CustomerDeliveryStats stats={deliveryStats?.byPhone[debouncedPhone]} />
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Other phone">
                <input value={customerPhoneAlt} onChange={(e) => setCustomerPhoneAlt(e.target.value)} placeholder="Optional" inputMode="tel" className={productInputClass} />
              </Field>
              <Field label="Email">
                <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Optional" type="email" className={productInputClass} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Delivery address" id="delivery">
            <div className="space-y-4">
              <Field label="Address" required error={shownError('shippingAddress')}>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  rows={2}
                  placeholder="House, road, area"
                  className={`${productInputClass} resize-y`}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="District">
                  <SearchableSelect
                    value={districtId}
                    options={districtOptions}
                    onChange={(id) => setShippingDistrict(districtOptions.find((o) => o.id === id)?.label ?? '')}
                    placeholder="Choose a district"
                    ariaLabel="District"
                    className={productInputClass}
                  />
                </Field>
                <Field label="City / thana">
                  <input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="e.g. Mirpur, Savar" className={productInputClass} />
                </Field>
                <Field label="ZIP code">
                  <input value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="Optional" inputMode="numeric" className={productInputClass} />
                </Field>
              </div>
              {pathaoConnected && (
                <Field label="Pathao delivery location" hint="Optional. Leave it empty and Pathao works it out from the address when you book.">
                  <PathaoLocationSelects
                    value={pathaoLocation}
                    onChange={setPathaoLocation}
                    selectClassName={productInputClass}
                    suggestFrom={{ address: shippingAddress, city: shippingCity, district: shippingDistrict }}
                  />
                </Field>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Notes">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Note from the customer" hint="Printed on the invoice.">
                <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={3} placeholder="e.g. Call before delivery" className={`${productInputClass} resize-y`} />
              </Field>
              <Field label="Staff note" hint="Only your team sees this.">
                <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={3} placeholder="Internal note" className={`${productInputClass} resize-y`} />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Side: charges and the total, kept in view while the form scrolls. */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <SectionCard title="Charges">
            <div className="space-y-4">
              <Field label="Delivery charge">
                <Segmented<ChargeMode | 'NONE'>
                  ariaLabel="Delivery charge"
                  value={chargeMode ?? 'NONE'}
                  onChange={(id) => setChargeMode(id === 'NONE' ? null : id)}
                  options={[
                    { id: 'DHAKA', label: `Dhaka ৳${DELIVERY_CHARGE.DHAKA}` },
                    ...(aroundDhakaOn ? [{ id: 'AROUND_DHAKA' as const, label: `Around ৳${DELIVERY_CHARGE.AROUND_DHAKA}` }] : []),
                    { id: 'OUTSIDE_DHAKA', label: `Outside ৳${DELIVERY_CHARGE.OUTSIDE_DHAKA}` },
                    { id: 'CUSTOM', label: 'Other' },
                  ]}
                />
                {chargeMode === 'CUSTOM' && (
                  <div className="mt-2">
                    <MoneyInput value={customCharge} onChange={setCustomCharge} placeholder="Delivery charge" ariaLabel="Custom delivery charge" />
                  </div>
                )}
              </Field>

              {showDiscount ? (
                <Field label="Discount">
                  <div className="flex gap-2">
                    <div className="w-28 shrink-0">
                      <MoneyInput value={discountAmount} onChange={setDiscountAmount} placeholder="0" ariaLabel="Discount amount" />
                    </div>
                    <input
                      value={discountLabel}
                      onChange={(e) => setDiscountLabel(e.target.value)}
                      placeholder="Reason (optional)"
                      className={productInputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscount(false);
                      setDiscountAmount('');
                      setDiscountLabel('');
                    }}
                    className="mt-1.5 text-xs text-neutral-500 hover:text-regantify-text"
                  >
                    Remove discount
                  </button>
                </Field>
              ) : (
                <button type="button" onClick={() => setShowDiscount(true)} className={outlineBtn}>
                  <Plus size={14} />
                  Add discount
                </button>
              )}

              {showAdvance ? (
                <Field label="Advance received">
                  <div className="flex gap-2">
                    <div className="w-28 shrink-0">
                      <MoneyInput value={advanceAmount} onChange={setAdvanceAmount} placeholder="0" ariaLabel="Advance received" />
                    </div>
                    <input
                      value={advanceNote}
                      maxLength={200}
                      onChange={(e) => setAdvanceNote(e.target.value)}
                      placeholder="Note, e.g. bKash TrxID (optional)"
                      className={productInputClass}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500">Money you already took, like the delivery charge. The courier collects only the rest.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvance(false);
                      setAdvanceAmount('');
                      setAdvanceNote('');
                    }}
                    className="mt-1.5 text-xs text-neutral-500 hover:text-regantify-text"
                  >
                    Remove advance
                  </button>
                </Field>
              ) : (
                <button type="button" onClick={() => setShowAdvance(true)} className={outlineBtn}>
                  <Plus size={14} />
                  Add advance received
                </button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Summary">
            {summaryRows}
            <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className={`${primaryBtn} mt-4 hidden w-full justify-center lg:flex`}>
              {createMutation.isPending ? 'Creating…' : 'Create order'}
            </button>
          </SectionCard>
        </div>
      </div>

      {/* Phones and tablets: the total and the button stay at the bottom. */}
      <div className="lg:hidden">
        <SaveBar
          message={
            <span>
              <span className="font-semibold tabular-nums text-regantify-text">{formatPrice(grandTotal)}</span>
              <span className="text-neutral-500"> · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            </span>
          }
        >
          <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className={primaryBtn}>
            {createMutation.isPending ? 'Creating…' : 'Create order'}
          </button>
        </SaveBar>
      </div>
    </div>
  );
}
