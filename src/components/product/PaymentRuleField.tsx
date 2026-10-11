import { useQuery } from '@tanstack/react-query';
import { paymentGatewaysApi } from '../../lib/paymentGatewaysApi';
import { Field } from './ProductFormPieces';

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * "Payment" (TellMe idea 126): a product that cannot be Cash on Delivery (made to order, expensive, perishable). With "Online payment only", a StorePal checkout whose
 * cart holds this product (or a bundle with it as a part) hides Cash on Delivery, and the server refuses a Cash on Delivery order for it. Your own Add Order and the POS
 * are not held to it. Warns when the store has no online payment turned on, because then nobody could buy the product.
 */
export function PaymentRuleField({ value, onChange }: { value: 'ANY' | 'ONLINE_ONLY'; onChange: (v: 'ANY' | 'ONLINE_ONLY') => void }) {
  const { data: gateways } = useQuery({ queryKey: ['payment-gateways'], queryFn: paymentGatewaysApi.listGateways, enabled: value === 'ONLINE_ONLY', staleTime: 60_000 });
  const noOnline = value === 'ONLINE_ONLY' && gateways !== undefined && !gateways.some((g) => g.type !== 'COD' && g.status === 'ACTIVE');
  return (
    <div className="mt-5 border-t border-line pt-5">
      <Field label="Payment" hint="Optional. Choose “Online payment only” for a product you do not want to sell as Cash on Delivery.">
        <select value={value} onChange={(e) => onChange(e.target.value === 'ONLINE_ONLY' ? 'ONLINE_ONLY' : 'ANY')} className={`${inputClass} w-64`}>
          <option value="ANY">Any payment method</option>
          <option value="ONLINE_ONLY">Online payment only (no Cash on Delivery)</option>
        </select>
      </Field>
      {noOnline && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Your store has no online payment turned on (Store &gt; Payment Gateway), so customers could not buy this product. Turn one on first.
        </p>
      )}
    </div>
  );
}
