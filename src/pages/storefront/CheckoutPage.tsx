import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { formatPrice } from './themes/medium/ProductCard';

const DELIVERY_CHARGE: Record<'DHAKA' | 'OUTSIDE_DHAKA', number> = {
  DHAKA: 70,
  OUTSIDE_DHAKA: 130,
};

export interface CheckoutItem {
  productSlug: string;
  name: string;
  image?: string;
  unitPrice: number;
  originalUnitPrice?: number;
  quantity: number;
  selectedOptions: Record<string, string>;
  isPreOrder: boolean;
}

export interface CheckoutNavigationState {
  store: { subdomain: string; storeName: string };
  item: CheckoutItem;
}

interface FormState {
  fullName: string;
  phone: string;
  address: string;
  zone: 'DHAKA' | 'OUTSIDE_DHAKA';
  note: string;
}

export default function CheckoutPage() {
  const { subdomain: subdomainParam } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const state = location.state as CheckoutNavigationState | null;

  const [form, setForm] = useState<FormState>({
    fullName: '',
    phone: '',
    address: '',
    zone: 'DHAKA',
    note: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>No order details found.</p>
        <Link to={`/store/${subdomainParam}`} style={{ color: '#1a5fd0', fontSize: '14px' }}>
          ← Back to store
        </Link>
      </div>
    );
  }

  const { store, item } = state;
  const subdomain = store.subdomain || subdomainParam;
  const itemTotal = item.unitPrice * item.quantity;
  const deliveryCharge = DELIVERY_CHARGE[form.zone];
  const grandTotal = itemTotal + deliveryCharge;

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) next.fullName = 'Enter your full name.';
    if (!/^01[0-9]{9}$/.test(form.phone.trim())) next.phone = 'Enter a valid 11-digit phone number.';
    if (!form.address.trim()) next.address = 'Enter your delivery address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePlaceOrder = () => {
    if (!validate()) return;
    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    setPlacedOrderId(orderId);
  };

  if (placedOrderId) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ background: '#fff', border: '1px solid #ececec', borderRadius: '14px', padding: '36px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e8f5ec', color: '#1a8a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Order placed</h1>
          <p style={{ fontSize: '13.5px', color: '#666', margin: '0 0 4px' }}>
            Order <strong>{placedOrderId}</strong> for {item.quantity} × "{item.name}"
          </p>
          <p style={{ fontSize: '13.5px', color: '#666', margin: '0 0 20px' }}>
            Cash on delivery — total due on arrival: <strong>{formatPrice(grandTotal)}</strong>
          </p>
          <Link
            to={`/store/${subdomain}`}
            style={{ display: 'inline-block', padding: '11px 20px', borderRadius: '10px', background: '#1a1a1a', color: '#fff', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none' }}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#1a1a1a', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #ececec' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 32px' }}>
          <Link to={`/store/${subdomain}/product/${item.productSlug}`} style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>
            ← {store.storeName}
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 22px' }}>Checkout</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Delivery form */}
          <div style={{ background: '#fff', border: '1px solid #ececec', borderRadius: '14px', padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px' }}>Delivery details</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>Full name</label>
              <input
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="e.g. Rafiul Islam"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${errors.fullName ? '#e4572e' : '#ddd'}`, fontSize: '13.5px', boxSizing: 'border-box' }}
              />
              {errors.fullName && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e4572e' }}>{errors.fullName}</p>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>Phone number</label>
              <input
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${errors.phone ? '#e4572e' : '#ddd'}`, fontSize: '13.5px', boxSizing: 'border-box' }}
              />
              {errors.phone && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e4572e' }}>{errors.phone}</p>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>Delivery address</label>
              <textarea
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="House, road, area, city"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${errors.address ? '#e4572e' : '#ddd'}`, fontSize: '13.5px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
              {errors.address && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e4572e' }}>{errors.address}</p>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>Delivery area</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['DHAKA', 'OUTSIDE_DHAKA'] as const).map((zone) => (
                  <button
                    key={zone}
                    onClick={() => updateField('zone', zone)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: form.zone === zone ? '2px solid #1a1a1a' : '1px solid #ddd',
                      background: form.zone === zone ? '#1a1a1a' : '#fff',
                      color: form.zone === zone ? '#fff' : '#333',
                    }}
                  >
                    {zone === 'DHAKA' ? `Inside Dhaka — ${formatPrice(DELIVERY_CHARGE.DHAKA)}` : `Outside Dhaka — ${formatPrice(DELIVERY_CHARGE.OUTSIDE_DHAKA)}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '4px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>Order note (optional)</label>
              <textarea
                value={form.note}
                onChange={(e) => updateField('note', e.target.value)}
                placeholder="Anything we should know about this order"
                rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13.5px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fde4c9', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#8a5a1c', marginTop: '16px' }}>
              Payment method: <strong>Cash on Delivery</strong> — pay when your order arrives.
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#fff', border: '1px solid #ececec', borderRadius: '14px', padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px' }}>Order summary</h2>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#f0f0f0', flexShrink: 0 }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 600 }}>{item.name}</p>
                {Object.entries(item.selectedOptions).length > 0 && (
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#888' }}>
                    {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: '12.5px', color: '#666' }}>Qty {item.quantity}</p>
                {item.isPreOrder && (
                  <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 600, color: '#1a1a1a', background: '#f2f2f2', borderRadius: '999px', padding: '2px 8px' }}>
                    Pre-order
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {formatPrice(itemTotal)}
                {item.originalUnitPrice && (
                  <div style={{ fontSize: '11.5px', color: '#aaa', textDecoration: 'line-through', fontWeight: 400 }}>
                    {formatPrice(item.originalUnitPrice * item.quantity)}
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>Subtotal</span>
                <span>{formatPrice(itemTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>Delivery charge</span>
                <span>{formatPrice(deliveryCharge)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, paddingTop: '6px', borderTop: '1px solid #f0f0f0' }}>
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              style={{ width: '100%', marginTop: '18px', padding: '13px', borderRadius: '10px', border: 'none', background: '#e4572e', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
            >
              Place Order — Cash on Delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}