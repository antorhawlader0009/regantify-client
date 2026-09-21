import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, X, Search } from 'lucide-react';
import { productsApi, type Product } from '../../../lib/productsApi';
import { ordersApi, type OrderItemInput } from '../../../lib/ordersApi';
import { getVendorDeliveryCharges } from '../../../lib/vendorApi';
import { toast } from '../../../lib/toast';

interface CartLine extends OrderItemInput {
  key: string; // productId + variantId, for React keys / dedupe within this form only
}

// State shape passed via navigate(path, { state }) from the Incomplete
// Orders page's "Create Order" action — see IncompleteOrders.tsx. Kept
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
}

function formatPrice(value: number) {
  return `৳${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

  // Prefill from "Create Order" on the Incomplete Orders page — runs
  // once on mount only (empty deps), since this page's own field state
  // should win over the handoff the moment the vendor starts editing.
  useEffect(() => {
    const state = location.state as CreateOrderFromIncompleteState | null;
    if (!state) return;
    if (state.customerName) setCustomerName(state.customerName);
    if (state.customerPhone) setCustomerPhone(state.customerPhone);
    if (state.customerEmail) setCustomerEmail(state.customerEmail);
    if (state.shippingAddress) setShippingAddress(state.shippingAddress);
    if (state.itemsSummary) {
      setStaffNote(`Cart from incomplete checkout — please re-add these items with current pricing:\n${state.itemsSummary}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Cart --
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // -- Charges / Discounts --
  const [zone, setZone] = useState<'DHAKA' | 'OUTSIDE_DHAKA' | null>(null);
  const [customCharge, setCustomCharge] = useState<number | null>(null);
  const [showCustomCharge, setShowCustomCharge] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [discountLabel, setDiscountLabel] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['orders-product-search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch, perPage: 8 }).then((r) => r.products),
    enabled: productSearch.trim().length > 0,
  });

  // Settings > Courier Integration > Delivery Charge / Settings > VAT —
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
  const DELIVERY_CHARGE: Record<'DHAKA' | 'OUTSIDE_DHAKA', number> = {
    DHAKA: Number(deliveryCharges?.insideDhakaCharge ?? 70),
    OUTSIDE_DHAKA: Number(deliveryCharges?.outsideDhakaCharge ?? 130),
  };
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
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const deliveryCharge = showCustomCharge && customCharge !== null ? customCharge : zone ? DELIVERY_CHARGE[zone] : 0;
  const discount = showDiscount && discountAmount !== null ? discountAmount : 0;
  const grandTotal = Math.max(0, cartTotal + deliveryCharge + vatAmount - discount);

  const createMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ORDER-${order.invoiceNumber} created.`);
      navigate('/vendor/orders');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not create the order. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Customer name and phone are required.');
      return;
    }
    if (!shippingAddress.trim()) {
      toast.error('Shipping address is required.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Add at least one product to the cart.');
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
      deliveryZone: zone ?? undefined,
      items: cart.map(({ key, ...item }) => item),
      deliveryCharge: showCustomCharge && customCharge !== null ? customCharge : undefined,
      discountAmount: showDiscount && discountAmount !== null ? discountAmount : undefined,
      discountLabel: showDiscount ? discountLabel.trim() || undefined : undefined,
    });
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none';

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/orders')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Orders
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Add Order</h1>

      <section className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="text-base font-semibold text-regantify-text mb-4">Customer</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Phone</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Mobile phone number" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Phone Alternative</label>
            <input value={customerPhoneAlt} onChange={(e) => setCustomerPhoneAlt(e.target.value)} placeholder="Alternative phone number" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Email</label>
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Valid email address" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Customer Note</label>
            <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={2} placeholder="Special instructions for this order" className={`${inputClass} resize-y`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Staff Note</label>
            <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={2} placeholder="Internal note (visible to staff only)" className={`${inputClass} resize-y`} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="text-base font-semibold text-regantify-text mb-4">Shipping</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Address</label>
            <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={2} placeholder="Full address" className={`${inputClass} resize-y`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Zip Code</label>
            <input value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} placeholder="####" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">City/Thana</label>
            <input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="ie Dhaka, Gazipur, Savar" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">District</label>
            <input value={shippingDistrict} onChange={(e) => setShippingDistrict(e.target.value)} placeholder="ie. Dhaka, Sylhet, Chattogram" className={inputClass} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="text-base font-semibold text-regantify-text mb-4">Cart</h2>

        {cart.length === 0 ? (
          <p className="text-sm text-regantify-text-muted py-4 text-center border border-dashed border-black/10 rounded-xl mb-4">
            No items in cart. Use the search below to add products.
          </p>
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase border-b border-black/5">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">List Price</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.key} className="border-b border-black/5">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        {line.productImage ? (
                          <img src={line.productImage} alt="" className="w-9 h-9 rounded-lg object-cover bg-regantify-content" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-regantify-content" />
                        )}
                        <div>
                          <p className="text-sm text-regantify-text leading-tight">{line.productName}</p>
                          <p className="text-xs text-regantify-text-muted">{line.productSku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-sm text-regantify-text-muted">{formatPrice(line.listPrice)}</td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, unitPrice: Number(e.target.value) } : l)),
                          )
                        }
                        className="w-24 px-2 py-1.5 rounded-lg border border-black/10 text-sm"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateQuantity(line.key, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 rounded-lg border border-black/10 text-sm"
                      />
                    </td>
                    <td className="py-2.5 pr-3 text-sm font-medium text-regantify-text text-right">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </td>
                    <td className="py-2.5">
                      <button onClick={() => updateQuantity(line.key, 0)} className="text-regantify-text-muted hover:text-red-600">
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search products to add"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
          />
          {searchOpen && productSearch.trim() && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-black/10 shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-regantify-content text-left"
                >
                  {product.photoUrls[0] ? (
                    <img src={product.photoUrls[0]} alt="" className="w-8 h-8 rounded-lg object-cover bg-regantify-content" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-regantify-content" />
                  )}
                  <div>
                    <p className="text-sm text-regantify-text">{product.name}</p>
                    <p className="text-xs text-regantify-text-muted">
                      {product.sku} · {formatPrice(Number(product.discountPrice ?? product.price))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-black/5 p-6 mb-6">
        <h2 className="text-base font-semibold text-regantify-text mb-4">Amount</h2>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-regantify-text-muted">Cart Total</span>
          <span className="font-medium text-regantify-text">{formatPrice(cartTotal)}</span>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-regantify-text mb-2">Charges</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => {
                setZone('DHAKA');
                setShowCustomCharge(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-sm border ${
                zone === 'DHAKA' && !showCustomCharge
                  ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-cta'
                  : 'border-black/10 text-regantify-text hover:bg-regantify-content'
              }`}
            >
              Inside Dhaka ({DELIVERY_CHARGE.DHAKA})
            </button>
            <button
              onClick={() => {
                setZone('OUTSIDE_DHAKA');
                setShowCustomCharge(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-sm border ${
                zone === 'OUTSIDE_DHAKA' && !showCustomCharge
                  ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-cta'
                  : 'border-black/10 text-regantify-text hover:bg-regantify-content'
              }`}
            >
              Outside Dhaka ({DELIVERY_CHARGE.OUTSIDE_DHAKA})
            </button>
            {!showCustomCharge && (
              <button
                onClick={() => setShowCustomCharge(true)}
                className="px-3.5 py-2 rounded-xl text-sm border border-black/10 text-regantify-text hover:bg-regantify-content"
              >
                Add Charge
              </button>
            )}
          </div>
          {showCustomCharge && (
            <input
              type="number"
              value={customCharge ?? ''}
              onChange={(e) => setCustomCharge(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Custom delivery charge"
              className={inputClass}
            />
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-regantify-text mb-2">Discounts</p>
          {!showDiscount ? (
            <button
              onClick={() => setShowDiscount(true)}
              className="px-3.5 py-2 rounded-xl text-sm border border-black/10 text-regantify-text hover:bg-regantify-content"
            >
              Add Discount
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={discountAmount ?? ''}
                onChange={(e) => setDiscountAmount(e.target.value === '' ? null : Number(e.target.value))}
                placeholder="Amount"
                className={`${inputClass} w-32`}
              />
              <input
                value={discountLabel}
                onChange={(e) => setDiscountLabel(e.target.value)}
                placeholder="Reason (optional)"
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-regantify-text-muted">COD Charge (Cash on Delivery)</span>
          <span className="font-medium text-regantify-text">{formatPrice(vatAmount)}</span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-black/5">
          <span className="text-base font-semibold text-regantify-text">Total</span>
          <span className="text-lg font-bold text-regantify-text">{formatPrice(grandTotal)}</span>
        </div>
      </section>

      <button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
        className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium disabled:opacity-60"
      >
        {createMutation.isPending ? 'Creating…' : 'Add Order'}
      </button>
    </div>
  );
}
