import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Lock, Trash2 } from 'lucide-react';
import { paymentGatewaysApi, type VendorPaymentGateway, type PaymentGatewayType, type PaymentFeeType } from '../../../lib/paymentGatewaysApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { LockedFeatureCard } from '../../../components/ui/UpgradePrompt';

const DEFAULT_LABELS: Record<PaymentGatewayType, string> = {
  COD: 'Cash On Delivery',
  ONLINE_PAYMENT: 'Online Payment (Regantify)',
  SSLCOMMERZ: 'SSLCommerz',
  BKASH_MERCHANT: 'bKash Merchant (PGW)',
  VENDOR_PAYSTATION: "Vendor's own PayStation",
};

/**
 * Store > Payment Gateway — every payment option this vendor's storefront
 * accepts. COD/ONLINE_PAYMENT always exist (auto-provisioned server-side,
 * see PaymentGatewaysService.ensureBuiltins) and can be enabled/disabled +
 * given a Platform Charge, but never disconnected. Custom gateways
 * (SSLCommerz today; bKash Merchant/Vendor PayStation shown as "coming
 * soon") are gated by Plan.customPaymentGatewayAllowed, same plan-gated-
 * page pattern as Domain.tsx.
 */
export default function PaymentGateway() {
  const queryClient = useQueryClient();

  const { data: gateways = [], isLoading: gatewaysLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: paymentGatewaysApi.listGateways,
  });
  const { data: catalog = [] } = useQuery({
    queryKey: ['payment-gateway-catalog'],
    queryFn: paymentGatewaysApi.getCatalog,
  });
  // null while loading = "don't know yet" — never used to mean "not
  // allowed" so the page doesn't flash an upgrade prompt before the real
  // plan is known (same convention as Domain.tsx's customDomainAllowed).
  const { data: usage } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const customGatewayAllowed = usage?.plan.customPaymentGatewayAllowed ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
  };

  const cod = gateways.find((g) => g.type === 'COD');
  const onlinePayment = gateways.find((g) => g.type === 'ONLINE_PAYMENT');
  const sslcommerz = gateways.find((g) => g.type === 'SSLCOMMERZ');
  const catalogFor = (type: PaymentGatewayType) => catalog.find((c) => c.type === type);

  if (gatewaysLoading) {
    return (
      <div className="max-w-3xl bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Payment Gateway</h1>
        <p className="text-regantify-text-muted mt-1">
          Manage every payment option your storefront accepts, and the platform charge each one adds at checkout.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {cod && (
          <BuiltinGatewayCard
            gateway={cod}
            platformHidden={catalogFor('COD')?.isEnabledPlatformWide === false}
            onSaved={invalidate}
          />
        )}
        {onlinePayment && (
          <BuiltinGatewayCard
            gateway={onlinePayment}
            platformHidden={catalogFor('ONLINE_PAYMENT')?.isEnabledPlatformWide === false}
            onSaved={invalidate}
          />
        )}
      </div>

      <h2 className="text-lg font-medium text-regantify-text mb-1">Add a payment gateway</h2>
      <p className="text-sm text-regantify-text-muted mb-4">
        Connect your own gateway with real API credentials — a per-transaction platform charge is optional and set by
        you.
      </p>

      {customGatewayAllowed === false ? (
        <LockedFeatureCard
          title="Custom payment gateways aren't available on your plan"
          message="Connecting your own gateway (SSLCommerz, bKash Merchant, etc.) is a paid-plan feature. Upgrade your plan to connect one."
        />
      ) : (
        <div className="space-y-4">
          <SslcommerzCard gateway={sslcommerz} onSaved={invalidate} />
          <ComingSoonCard type="BKASH_MERCHANT" />
          <ComingSoonCard type="VENDOR_PAYSTATION" />
        </div>
      )}
    </div>
  );
}

function formatCharge(value: string, type: PaymentFeeType = 'FLAT') {
  return type === 'PERCENTAGE' ? `${Number(value)}%` : `৳${Number(value).toLocaleString('en-US')}`;
}

/**
 * COD/ONLINE_PAYMENT card — view-only label/fee (fully plan-driven, set
 * by Super Admin editing the plan itself, not per-vendor — see
 * AdminService.updatePlan), enable/disable toggle only, never
 * disconnected.
 */
function BuiltinGatewayCard({
  gateway,
  platformHidden,
  onSaved,
}: {
  gateway: VendorPaymentGateway;
  platformHidden: boolean;
  onSaved: () => void;
}) {
  const toggleMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'DISABLED') => paymentGatewaysApi.updateBuiltin(gateway.type as 'COD' | 'ONLINE_PAYMENT', { status }),
    onSuccess: (_data, status) => {
      toast.success(status === 'ACTIVE' ? 'Gateway enabled.' : 'Gateway disabled.');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update this gateway.')),
  });

  const enabled = gateway.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{gateway.displayLabel ?? DEFAULT_LABELS[gateway.type]}</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            Fee: {formatCharge(gateway.platformChargeBdt, gateway.platformChargeType)}
            {gateway.platformChargeType === 'PERCENTAGE' ? ' of subtotal' : ' per order'}
          </p>
          {/* Fee From: Vendor (Plan.codGatewayFeePayer/onlinePaymentGatewayFeePayer)
              — the fee above is never charged to the shopper at all; it
              comes out of THIS vendor's own payout at order completion
              instead. Worth surfacing here since it's real money either
              way, just from a different source than the default. */}
          {gateway.platformChargePayer === 'VENDOR' && (
            <p className="text-xs text-regantify-text-muted mt-0.5">
              Paid by you — never charged to your customers, deducted from your payout instead.
            </p>
          )}
          {platformHidden && (
            <p className="text-xs text-amber-600 mt-1">Hidden by platform admin — not shown to shoppers regardless of this setting.</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={toggleMutation.isPending || platformHidden}
            onClick={() => toggleMutation.mutate(enabled ? 'DISABLED' : 'ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 ${
              enabled ? 'bg-regantify-content text-regantify-text' : 'bg-regantify-cta text-white hover:bg-regantify-cta-dark'
            }`}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** SSLCommerz card — connect form when not connected, edit/disconnect controls once connected. */
function SslcommerzCard({ gateway, onSaved }: { gateway: VendorPaymentGateway | undefined; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [displayLabel, setDisplayLabel] = useState('SSLCommerz');
  const [charge, setCharge] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.connectSslcommerz(storeId.trim(), storePassword, displayLabel.trim(), Number(charge)),
    onSuccess: () => {
      toast.success('SSLCommerz connected.');
      setStoreId('');
      setStorePassword('');
      setShowForm(false);
      setError(null);
      onSaved();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect SSLCommerz. Please check your credentials and try again.')),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.disconnect(gateway!.id),
    onSuccess: () => {
      toast.success('SSLCommerz disconnected.');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect SSLCommerz.')),
  });

  const isConnected = gateway?.status === 'ACTIVE' && gateway.isConnected;

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{gateway?.displayLabel ?? 'SSLCommerz'}</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isConnected
              ? `Connected — platform charge ${formatCharge(gateway!.platformChargeBdt)} per order.`
              : 'Connect your own SSLCommerz merchant account.'}
          </p>
        </div>
        {isConnected ? (
          <button
            type="button"
            disabled={disconnectMutation.isPending}
            onClick={() => disconnectMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60 shrink-0"
          >
            <Trash2 size={14} />
            Disconnect
          </button>
        ) : (
          !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium shrink-0"
            >
              Connect
            </button>
          )
        )}
      </div>

      {!isConnected && showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!storeId.trim() || !storePassword.trim()) {
              setError('Store ID and Store Password are both required.');
              return;
            }
            connectMutation.mutate();
          }}
          className="mt-4 pt-4 border-t border-black/5 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Store ID</label>
            <input
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="Your SSLCommerz Store ID"
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Store Password</label>
            <input
              type="password"
              value={storePassword}
              onChange={(e) => setStorePassword(e.target.value)}
              placeholder="Your SSLCommerz Store Password"
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Display label</label>
            <input
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Platform charge (৳)</label>
            <input
              type="number"
              min={0}
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
            >
              {connectMutation.isPending ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** bKash Merchant / Vendor's own PayStation — recognized types, not implemented yet (see PaymentGatewayTypeCatalog.isImplemented). */
function ComingSoonCard({ type }: { type: 'BKASH_MERCHANT' | 'VENDOR_PAYSTATION' }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 p-5 flex items-center gap-3 opacity-70">
      <Lock size={18} className="text-regantify-text-muted shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-regantify-text">{DEFAULT_LABELS[type]}</p>
        <p className="text-sm text-regantify-text-muted mt-0.5">Coming soon.</p>
      </div>
    </div>
  );
}
