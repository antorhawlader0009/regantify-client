import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Lock, Smartphone, Trash2 } from 'lucide-react';
import {
  paymentGatewaysApi,
  type VendorPaymentGateway,
  type PaymentGatewayType,
  type ManualMobileAccount,
  type ManualMobileWallet,
  type GatewayConnection,
  type StoreGatewaySlug,
} from '../../../lib/paymentGatewaysApi';
import { getVendorPlanUsage, formatFeeParts } from '../../../lib/plansApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { LockedFeatureCard } from '../../../components/ui/UpgradePrompt';
import { MoreInFullView } from '../../../components/ui/FullViewOnly';
import { useDashboardView } from '../../../lib/useDashboardView';

const DEFAULT_LABELS: Record<PaymentGatewayType, string> = {
  COD: 'Cash On Delivery',
  ONLINE_PAYMENT: 'Online Payment',
  SSLCOMMERZ: 'SSLCommerz',
  BKASH_MERCHANT: 'bKash',
  VENDOR_PAYSTATION: "Vendor's own PayStation",
  SHURJOPAY: 'shurjoPay',
  EPS: 'EPS (Easy Payment System)',
  AAMARPAY: 'aamarPay',
  MANUAL_MOBILE: 'Manual Mobile Payment',
  PORTWALLET: 'PortWallet (PortPos)',
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
  // Add-ons opens this page with ?connect=<gateway> so that gateway's form is already open.
  const [searchParams] = useSearchParams();
  const connectParam = searchParams.get('connect');
  const { isSimple } = useDashboardView();

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
  const shurjopay = gateways.find((g) => g.type === 'SHURJOPAY');
  const eps = gateways.find((g) => g.type === 'EPS');
  const manualMobile = gateways.find((g) => g.type === 'MANUAL_MOBILE');
  const catalogFor = (type: PaymentGatewayType) => catalog.find((c) => c.type === type);
  const visibleStoreGateways = STORE_GATEWAYS.filter((def) => !isSimple || connectParam === def.slug || gateways.some((g) => g.type === def.type));
  const hiddenGatewayCount =
    STORE_GATEWAYS.length - visibleStoreGateways.length + [
      [sslcommerz, 'sslcommerz'],
      [shurjopay, 'shurjopay'],
      [eps, 'eps'],
    ].filter(([g, slug]) => isSimple && !g && connectParam !== slug).length;

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
          {/* Simple mode (SIMPLE-VIEW-plan.md Step 8): Manual Mobile Payment plus the gateways already connected (or the
              one a link asked to connect); adding the other gateways is Full mode. */}
          {(!isSimple || sslcommerz || connectParam === 'sslcommerz') && <SslcommerzCard gateway={sslcommerz} onSaved={invalidate} autoOpen={connectParam === 'sslcommerz'} />}
          {(!isSimple || shurjopay || connectParam === 'shurjopay') && <ShurjopayCard gateway={shurjopay} onSaved={invalidate} autoOpen={connectParam === 'shurjopay'} />}
          {(!isSimple || eps || connectParam === 'eps') && <EpsCard gateway={eps} onSaved={invalidate} autoOpen={connectParam === 'eps'} />}
          <ManualMobileCard gateway={manualMobile} onSaved={invalidate} autoOpen={connectParam === 'manual-mobile'} />
          {visibleStoreGateways.map((def) => (
            <StoreGatewayCard
              key={def.type}
              def={def}
              gateway={gateways.find((g) => g.type === def.type)}
              onSaved={invalidate}
              autoOpen={connectParam === def.slug}
            />
          ))}
          <MoreInFullView count={hiddenGatewayCount} />
        </div>
      )}
    </div>
  );
}

function formatCharge(gateway: VendorPaymentGateway) {
  const label = formatFeeParts(gateway.platformChargeBdt, gateway.platformChargePercent);
  return Number(gateway.platformChargePercent) > 0 ? `${label} of order total` : `${label} per order`;
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
  const hideFee = gateway.type === 'ONLINE_PAYMENT';

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{gateway.displayLabel ?? DEFAULT_LABELS[gateway.type]}</p>
          {/* ONLINE_PAYMENT's fee (Payment Gateway Fee) is hidden from the
              vendor everywhere, so only COD shows its fee here. */}
          {!hideFee && (
            <p className="text-sm text-regantify-text-muted mt-0.5">
              Fee: {formatCharge(gateway)}
              {gateway.specialRate && (
                <span className="ml-2 rounded border border-brand/30 bg-brand-lime px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">
                  Special rate{gateway.specialRate.until ? ` until ${new Date(gateway.specialRate.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </span>
              )}
            </p>
          )}
          {/* Fee From: Vendor (Plan.codGatewayFeePayer) — the fee above is
              never charged to the shopper at all; it comes out of THIS
              vendor's own payout at order completion instead. Worth
              surfacing here since it's real money either way, just from a
              different source than the default. */}
          {!hideFee && gateway.platformChargePayer === 'VENDOR' && (
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
function SslcommerzCard({ gateway, onSaved, autoOpen }: { gateway: VendorPaymentGateway | undefined; onSaved: () => void; autoOpen?: boolean }) {
  const [showForm, setShowForm] = useState(!!autoOpen);
  const cardRef = useScrollIntoView(autoOpen);
  const [storeId, setStoreId] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [displayLabel, setDisplayLabel] = useState('SSLCommerz');
  const [charge, setCharge] = useState('0');
  const [sandbox, setSandbox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isConnected = gateway?.status === 'ACTIVE' && gateway.isConnected;
  // Test or live: SSLCommerz gives a separate Store ID for each (z-others/documentations/SSLCOMMERZ).
  const { data: connection } = useQuery({
    queryKey: ['payment-gateway-connection', 'SSLCOMMERZ'],
    queryFn: () => paymentGatewaysApi.getConnection('SSLCOMMERZ'),
    enabled: isConnected,
  });

  const connectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.connectSslcommerz(storeId.trim(), storePassword, sandbox, displayLabel.trim(), Number(charge)),
    onSuccess: () => {
      toast.success(sandbox ? 'SSLCommerz connected in sandbox mode.' : 'SSLCommerz connected.');
      void queryClient.invalidateQueries({ queryKey: ['payment-gateway-connection', 'SSLCOMMERZ'] });
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

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-regantify-text">
            {gateway?.displayLabel ?? 'SSLCommerz'}
            {isConnected && connection && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${connection.sandbox ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {connection.sandbox ? 'Sandbox' : 'Live'}
              </span>
            )}
          </p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isConnected
              ? `Connected — platform charge ${formatCharge(gateway!)}.`
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
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">Sandbox mode</span>
              <span className="block text-xs text-regantify-text-muted">
                For testing with a Store ID from SSLCommerz&apos;s sandbox (developer.sslcommerz.com). No real money moves. Leave it off with
                your live Store ID before selling.
              </span>
            </span>
          </label>
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

/** One key a store gateway needs, as its connect form shows it. */
interface GatewayField {
  /** The connect route's body key. */
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  /** Never sent back by the server: typed again to save a change. */
  secret?: boolean;
  /** Read back into the form from the saved, non-secret part (GET :type/connection). */
  fromConnection?: keyof GatewayConnection;
  /** Only asked for live (bKash's live API address). */
  liveOnly?: boolean;
}

interface StoreGatewayDef {
  type: PaymentGatewayType;
  slug: StoreGatewaySlug;
  name: string;
  about: string;
  defaultLabel: string;
  sandboxHelp: string;
  fields: GatewayField[];
  /** Said under the form: when the keys are really checked. */
  checkNote: string;
}

/**
 * Add-ons > aamarPay / bKash / PayStation (the store's own) / PortWallet: each one's keys, taken from that gateway's own
 * documentation (z-others/documentations/adds on docs). The connect route on the server is named by `slug`.
 */
const STORE_GATEWAYS: StoreGatewayDef[] = [
  {
    type: 'BKASH_MERCHANT',
    slug: 'bkash-merchant',
    name: 'bKash',
    about: 'Customers pay from their bKash wallet through your own bKash merchant account.',
    defaultLabel: 'bKash',
    sandboxHelp: "For testing with bKash's sandbox keys. No real money moves. Turn it off with your live keys before selling.",
    fields: [
      { key: 'username', label: 'Username', placeholder: 'Merchant username from bKash', fromConnection: 'username' },
      { key: 'password', label: 'Password', secret: true, placeholder: 'Merchant password from bKash' },
      { key: 'appKey', label: 'App key', secret: true, placeholder: 'App key from bKash' },
      { key: 'appSecret', label: 'App secret', secret: true, placeholder: 'App secret from bKash' },
      {
        key: 'liveBaseUrl',
        label: 'Live API address',
        placeholder: 'https://… .bka.sh/…',
        help: 'The API address bKash gave you with your live keys (it ends in bka.sh).',
        fromConnection: 'liveBaseUrl',
        liveOnly: true,
      },
    ],
    checkNote: 'Your keys are checked with bKash before they are saved.',
  },
  {
    type: 'AAMARPAY',
    slug: 'aamarpay',
    name: 'aamarPay',
    about: 'Cards, bKash, Nagad and more through your own aamarPay store.',
    defaultLabel: 'aamarPay (cards, bKash, Nagad)',
    sandboxHelp: "For testing with aamarPay's sandbox store (aamarpaytest). No real money moves. Turn it off with your live keys before selling.",
    fields: [
      { key: 'storeId', label: 'Store ID', placeholder: 'Store ID from aamarPay', fromConnection: 'storeId' },
      { key: 'signatureKey', label: 'Signature key', secret: true, placeholder: 'Signature key from aamarPay' },
    ],
    checkNote: 'aamarPay has no way to test keys on their own, so a wrong key shows when the first payment starts. Try one small payment after connecting.',
  },
  {
    type: 'VENDOR_PAYSTATION',
    slug: 'vendor-paystation',
    name: 'PayStation',
    about: 'Cards, bKash, Nagad, Rocket and banks through your own PayStation merchant account.',
    defaultLabel: 'PayStation (cards, bKash, Nagad)',
    sandboxHelp: "For testing with PayStation's sandbox merchant. No real money moves. Turn it off with your live keys before selling.",
    fields: [
      { key: 'merchantId', label: 'Merchant ID', placeholder: 'e.g. 104-1653730183', fromConnection: 'merchantId' },
      { key: 'password', label: 'Password', secret: true, placeholder: 'Password from PayStation' },
    ],
    checkNote: 'PayStation has no way to test keys on their own, so a wrong key shows when the first payment starts. Try one small payment after connecting.',
  },
  {
    type: 'PORTWALLET',
    slug: 'portwallet',
    name: 'PortWallet (PortPos)',
    about: 'Cards, mobile wallets and banks through your own PortWallet (PortPos) account.',
    defaultLabel: 'PortWallet (cards, wallets)',
    sandboxHelp: "For testing with keys from PortPos's sandbox panel. No real money moves. Turn it off with your live keys before selling.",
    fields: [
      { key: 'appKey', label: 'App key', placeholder: 'App key from the PortPos panel', fromConnection: 'appKey' },
      { key: 'secretKey', label: 'Secret key', secret: true, placeholder: 'Secret key from the PortPos panel' },
    ],
    checkNote: 'PortPos has no way to test keys on their own, so a wrong key shows when the first payment starts. Try one small payment after connecting.',
  },
];

/**
 * A store gateway connected with the store's own keys (the four in STORE_GATEWAYS): the keys, a sandbox switch, the
 * name at checkout and the platform charge. Once connected it shows live or sandbox and lets the vendor change the
 * keys (the same form again; secret ones are typed again) or disconnect.
 */
function StoreGatewayCard({
  def,
  gateway,
  onSaved,
  autoOpen,
}: {
  def: StoreGatewayDef;
  gateway: VendorPaymentGateway | undefined;
  onSaved: () => void;
  autoOpen?: boolean;
}) {
  const isConnected = gateway?.status === 'ACTIVE' && gateway.isConnected;
  const [showForm, setShowForm] = useState(!!autoOpen && !isConnected);
  const cardRef = useScrollIntoView(autoOpen);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sandbox, setSandbox] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(gateway?.displayLabel ?? def.defaultLabel);
  const [charge, setCharge] = useState(gateway ? String(Number(gateway.platformChargeBdt)) : '0');
  const [error, setError] = useState<string | null>(null);

  const { data: connection } = useQuery({
    queryKey: ['payment-gateway-connection', def.type],
    queryFn: () => paymentGatewaysApi.getConnection(def.type),
    enabled: !!isConnected,
  });

  const visibleFields = def.fields.filter((f) => !f.liveOnly || !sandbox);

  const openForm = () => {
    const next: Record<string, string> = {};
    for (const f of def.fields) next[f.key] = f.fromConnection ? String(connection?.[f.fromConnection] ?? '') : '';
    setValues(next);
    setSandbox(connection?.sandbox ?? false);
    setError(null);
    setShowForm(true);
  };

  const connectMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | number | boolean | undefined> = {
        sandbox,
        displayLabel: displayLabel.trim() || undefined,
        platformChargeBdt: Number(charge) || 0,
      };
      for (const f of visibleFields) payload[f.key] = f.secret ? values[f.key] : values[f.key]?.trim();
      return paymentGatewaysApi.connectStoreGateway(def.slug, payload);
    },
    onSuccess: () => {
      toast.success(sandbox ? `${def.name} connected in sandbox mode.` : `${def.name} connected.`);
      setValues({});
      setShowForm(false);
      setError(null);
      onSaved();
    },
    onError: (err) => setError(apiErrorMessage(err, `Could not connect ${def.name}. Please check your keys and try again.`)),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.disconnect(gateway!.id),
    onSuccess: () => {
      toast.success(`${def.name} disconnected.`);
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, `Could not disconnect ${def.name}.`)),
  });

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none';

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={20} className="mt-0.5 shrink-0 text-regantify-text-muted" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text flex items-center gap-2">
            {gateway?.displayLabel ?? def.name}
            {isConnected && connection && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${connection.sandbox ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {connection.sandbox ? 'Sandbox' : 'Live'}
              </span>
            )}
          </p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isConnected ? `Connected — platform charge ${formatCharge(gateway!)}.` : def.about}
          </p>
        </div>
        {isConnected ? (
          <div className="flex shrink-0 gap-2">
            {!showForm && (
              <button
                type="button"
                onClick={openForm}
                className="px-3 py-1.5 rounded-xl border border-black/10 text-sm font-medium text-regantify-text hover:bg-black/5"
              >
                Change keys
              </button>
            )}
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          </div>
        ) : (
          !showForm && (
            <button
              type="button"
              onClick={openForm}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium shrink-0"
            >
              Connect
            </button>
          )
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const missing = visibleFields.find((f) => !(f.secret ? values[f.key] : values[f.key]?.trim()));
            if (missing) {
              setError(`${missing.label} is required.`);
              return;
            }
            connectMutation.mutate();
          }}
          className="mt-4 pt-4 border-t border-black/5 space-y-3"
        >
          <label className="flex items-start gap-3 rounded-lg border border-black/10 p-3 cursor-pointer">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">Sandbox mode</span>
              <span className="block text-xs text-regantify-text-muted">{def.sandboxHelp}</span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleFields.map((f) => (
              <div key={f.key} className={f.liveOnly ? 'sm:col-span-2' : undefined}>
                <label className="block text-xs font-medium text-regantify-text-muted mb-1">{f.label}</label>
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  autoComplete={f.secret ? 'new-password' : 'off'}
                  placeholder={f.secret && isConnected ? 'Type it again to save a change' : f.placeholder}
                  className={inputClass}
                />
                {f.help && <p className="text-xs text-regantify-text-muted mt-1">{f.help}</p>}
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Name at checkout</label>
              <input value={displayLabel} onChange={(e) => setDisplayLabel(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Platform charge (৳)</label>
              <input type="number" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-regantify-text-muted">{def.checkNote}</p>
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
              {connectMutation.isPending ? 'Saving…' : isConnected ? 'Save' : 'Connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Scrolls a card into view once, when Add-ons sent the vendor here to connect it. */
function useScrollIntoView(active: boolean | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);
  return ref;
}

/**
 * shurjoPay card (Add-ons > shurjoPay): the store's own shurjoPay login, its order prefix and a sandbox switch. The
 * server tries the login with shurjoPay before saving it. Once connected it shows live or sandbox and lets the vendor
 * change the login (the same form again) or disconnect.
 */
function ShurjopayCard({ gateway, onSaved, autoOpen }: { gateway: VendorPaymentGateway | undefined; onSaved: () => void; autoOpen?: boolean }) {
  const isConnected = gateway?.status === 'ACTIVE' && gateway.isConnected;
  const [showForm, setShowForm] = useState(!!autoOpen && !isConnected);
  const cardRef = useScrollIntoView(autoOpen);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [prefix, setPrefix] = useState('');
  const [sandbox, setSandbox] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(gateway?.displayLabel ?? 'shurjoPay');
  const [charge, setCharge] = useState(gateway ? String(Number(gateway.platformChargeBdt)) : '0');
  const [error, setError] = useState<string | null>(null);

  const { data: connection } = useQuery({
    queryKey: ['payment-gateway-connection', 'SHURJOPAY'],
    queryFn: paymentGatewaysApi.getShurjopayConnection,
    enabled: !!isConnected,
  });

  const openForm = () => {
    setUsername(connection?.username ?? '');
    setPrefix(connection?.prefix ?? '');
    setSandbox(connection?.sandbox ?? false);
    setPassword('');
    setError(null);
    setShowForm(true);
  };

  const connectMutation = useMutation({
    mutationFn: () =>
      paymentGatewaysApi.connectShurjopay({
        username: username.trim(),
        password,
        prefix: prefix.trim(),
        sandbox,
        displayLabel: displayLabel.trim() || undefined,
        platformChargeBdt: Number(charge) || 0,
      }),
    onSuccess: () => {
      toast.success(sandbox ? 'shurjoPay connected in sandbox mode.' : 'shurjoPay connected.');
      setPassword('');
      setShowForm(false);
      setError(null);
      onSaved();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect shurjoPay. Please check your login and try again.')),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.disconnect(gateway!.id),
    onSuccess: () => {
      toast.success('shurjoPay disconnected.');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect shurjoPay.')),
  });

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none';

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={20} className="mt-0.5 shrink-0 text-regantify-text-muted" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text flex items-center gap-2">
            {gateway?.displayLabel ?? 'shurjoPay'}
            {isConnected && connection && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${connection.sandbox ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {connection.sandbox ? 'Sandbox' : 'Live'}
              </span>
            )}
          </p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isConnected
              ? `Connected — platform charge ${formatCharge(gateway!)}.`
              : 'Cards, bKash, Nagad and other wallets through your own shurjoPay store.'}
          </p>
        </div>
        {isConnected ? (
          <div className="flex shrink-0 gap-2">
            {!showForm && (
              <button
                type="button"
                onClick={openForm}
                className="px-3 py-1.5 rounded-xl border border-black/10 text-sm font-medium text-regantify-text hover:bg-black/5"
              >
                Change login
              </button>
            )}
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          </div>
        ) : (
          !showForm && (
            <button
              type="button"
              onClick={openForm}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium shrink-0"
            >
              Connect
            </button>
          )
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!username.trim() || !password || !prefix.trim()) {
              setError('Username, password and order prefix are all required.');
              return;
            }
            connectMutation.mutate();
          }}
          className="mt-4 pt-4 border-t border-black/5 space-y-3"
        >
          <label className="flex items-start gap-3 rounded-lg border border-black/10 p-3 cursor-pointer">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">Sandbox mode</span>
              <span className="block text-xs text-regantify-text-muted">
                For testing with shurjoPay&apos;s sandbox login. No real money moves. Turn it off with your live login before selling.
              </span>
            </span>
          </label>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" placeholder="Store username from shurjoPay" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={isConnected ? 'Type the password again to save a change' : 'Store password from shurjoPay'}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Order prefix</label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={10} placeholder="e.g. sp" className={inputClass} />
            <p className="text-xs text-regantify-text-muted mt-1">The short prefix shurjoPay gave your store with the login.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Name at checkout</label>
              <input value={displayLabel} onChange={(e) => setDisplayLabel(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Platform charge (৳)</label>
              <input type="number" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} className={inputClass} />
            </div>
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
              {connectMutation.isPending ? 'Checking with shurjoPay…' : isConnected ? 'Save' : 'Connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * EPS card (Add-ons > EPS, Easy Payment System): the store's own EPS merchant login, hash key, merchant and store IDs
 * and a sandbox switch. The server tries the login and hash key with EPS before saving. Once connected it shows live
 * or sandbox and lets the vendor change the details (the same form again) or disconnect.
 */
function EpsCard({ gateway, onSaved, autoOpen }: { gateway: VendorPaymentGateway | undefined; onSaved: () => void; autoOpen?: boolean }) {
  const isConnected = gateway?.status === 'ACTIVE' && gateway.isConnected;
  const [showForm, setShowForm] = useState(!!autoOpen && !isConnected);
  const cardRef = useScrollIntoView(autoOpen);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hashKey, setHashKey] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [sandbox, setSandbox] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(gateway?.displayLabel ?? 'EPS (cards, bKash, Nagad)');
  const [charge, setCharge] = useState(gateway ? String(Number(gateway.platformChargeBdt)) : '0');
  const [error, setError] = useState<string | null>(null);

  const { data: connection } = useQuery({
    queryKey: ['payment-gateway-connection', 'EPS'],
    queryFn: paymentGatewaysApi.getEpsConnection,
    enabled: !!isConnected,
  });

  const openForm = () => {
    setUsername(connection?.username ?? '');
    setMerchantId(connection?.merchantId ?? '');
    setStoreId(connection?.storeId ?? '');
    setSandbox(connection?.sandbox ?? false);
    setPassword('');
    setHashKey('');
    setError(null);
    setShowForm(true);
  };

  const connectMutation = useMutation({
    mutationFn: () =>
      paymentGatewaysApi.connectEps({
        username: username.trim(),
        password,
        hashKey: hashKey.trim(),
        merchantId: merchantId.trim(),
        storeId: storeId.trim(),
        sandbox,
        displayLabel: displayLabel.trim() || undefined,
        platformChargeBdt: Number(charge) || 0,
      }),
    onSuccess: () => {
      toast.success(sandbox ? 'EPS connected in sandbox mode.' : 'EPS connected.');
      setPassword('');
      setHashKey('');
      setShowForm(false);
      setError(null);
      onSaved();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect EPS. Please check your details and try again.')),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => paymentGatewaysApi.disconnect(gateway!.id),
    onSuccess: () => {
      toast.success('EPS disconnected.');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect EPS.')),
  });

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none';

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <CreditCard size={20} className="mt-0.5 shrink-0 text-regantify-text-muted" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text flex items-center gap-2">
            {gateway?.displayLabel ?? 'EPS (Easy Payment System)'}
            {isConnected && connection && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${connection.sandbox ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {connection.sandbox ? 'Sandbox' : 'Live'}
              </span>
            )}
          </p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isConnected
              ? `Connected — platform charge ${formatCharge(gateway!)}.`
              : 'Cards, bKash, Nagad and other wallets through your own EPS merchant account.'}
          </p>
        </div>
        {isConnected ? (
          <div className="flex shrink-0 gap-2">
            {!showForm && (
              <button
                type="button"
                onClick={openForm}
                className="px-3 py-1.5 rounded-xl border border-black/10 text-sm font-medium text-regantify-text hover:bg-black/5"
              >
                Change details
              </button>
            )}
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          </div>
        ) : (
          !showForm && (
            <button
              type="button"
              onClick={openForm}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium shrink-0"
            >
              Connect
            </button>
          )
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!username.trim() || !password || !hashKey.trim() || !merchantId.trim() || !storeId.trim()) {
              setError('Username, password, hash key, merchant ID and store ID are all required.');
              return;
            }
            connectMutation.mutate();
          }}
          className="mt-4 pt-4 border-t border-black/5 space-y-3"
        >
          <p className="text-xs text-regantify-text-muted">
            All five values are in your EPS merchant panel. Your customers pay into your own EPS account.
          </p>
          <label className="flex items-start gap-3 rounded-lg border border-black/10 p-3 cursor-pointer">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">Sandbox mode</span>
              <span className="block text-xs text-regantify-text-muted">
                For testing with EPS&apos;s sandbox details. No real money moves. Turn it off with your live details before selling.
              </span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Username (email)</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={isConnected ? 'Type it again to save a change' : 'EPS password'}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Hash key</label>
            <input
              type="password"
              value={hashKey}
              onChange={(e) => setHashKey(e.target.value)}
              autoComplete="off"
              placeholder={isConnected ? 'Type it again to save a change' : 'Hash key from EPS'}
              className={inputClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Merchant ID</label>
              <input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Store ID</label>
              <input value={storeId} onChange={(e) => setStoreId(e.target.value)} autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Name at checkout</label>
              <input value={displayLabel} onChange={(e) => setDisplayLabel(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Platform charge (৳)</label>
              <input type="number" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} className={inputClass} />
            </div>
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
              {connectMutation.isPending ? 'Checking with EPS…' : isConnected ? 'Save' : 'Connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const WALLET_OPTIONS: { id: ManualMobileWallet; name: string }[] = [
  { id: 'BKASH', name: 'bKash' },
  { id: 'NAGAD', name: 'Nagad' },
  { id: 'ROCKET', name: 'Rocket' },
  { id: 'UPAY', name: 'Upay' },
  { id: 'OTHER', name: 'Other' },
];
const KIND_OPTIONS: { id: ManualMobileAccount['kind']; name: string }[] = [
  { id: 'PERSONAL', name: 'Personal (Send Money)' },
  { id: 'AGENT', name: 'Agent (Cash Out)' },
  { id: 'MERCHANT', name: 'Merchant (Payment)' },
];
const blankAccount = (): ManualMobileAccount => ({ wallet: 'BKASH', label: null, number: '', kind: 'PERSONAL' });

/**
 * Manual Mobile Payment card (Add-ons > Manual Mobile Payment): the store's own bKash / Nagad / ... numbers and what
 * the shopper is told. The shopper sends the total, then types the number they sent from and the TrxID; the store
 * checks it on the order (or, with "trust every TrxID", it is recorded as received at once). StorePal checkout only.
 */
function ManualMobileCard({ gateway, onSaved, autoOpen }: { gateway: VendorPaymentGateway | undefined; onSaved: () => void; autoOpen?: boolean }) {
  const isOn = gateway?.status === 'ACTIVE' && gateway.isConnected;
  const cardRef = useScrollIntoView(autoOpen);
  const [showForm, setShowForm] = useState(!!autoOpen && !isOn);
  const [accounts, setAccounts] = useState<ManualMobileAccount[]>([blankAccount()]);
  const [instructions, setInstructions] = useState('');
  const [markReceived, setMarkReceived] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(gateway?.displayLabel ?? 'Mobile payment (bKash, Nagad)');
  const [charge, setCharge] = useState(gateway ? String(Number(gateway.platformChargeBdt)) : '0');
  const [error, setError] = useState<string | null>(null);

  const { data: saved } = useQuery({ queryKey: ['manual-mobile'], queryFn: paymentGatewaysApi.getManualMobile });

  const openForm = () => {
    setAccounts(saved?.accounts?.length ? saved.accounts.map((a) => ({ ...a })) : [blankAccount()]);
    setInstructions(saved?.instructions ?? '');
    setMarkReceived(saved?.markReceived ?? false);
    setDisplayLabel(gateway?.displayLabel ?? 'Mobile payment (bKash, Nagad)');
    setError(null);
    setShowForm(true);
  };
  // Opened from Add-ons with saved settings: fill the form once they arrive.
  const [filled, setFilled] = useState(false);
  if (showForm && !filled && saved) {
    setFilled(true);
    setAccounts(saved.accounts.map((a) => ({ ...a })));
    setInstructions(saved.instructions);
    setMarkReceived(saved.markReceived);
  }

  const save = useMutation({
    mutationFn: () =>
      paymentGatewaysApi.saveManualMobile({
        accounts: accounts.map((a) => ({ ...a, number: a.number.replace(/[\s-]/g, ''), label: a.wallet === 'OTHER' ? a.label?.trim() || null : null })),
        instructions: instructions.trim(),
        markReceived,
        displayLabel: displayLabel.trim() || undefined,
        platformChargeBdt: Number(charge) || 0,
      }),
    onSuccess: () => {
      toast.success('Saved. Shoppers can now pay to these numbers at checkout.');
      setShowForm(false);
      setError(null);
      onSaved();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save. Please check the numbers and try again.')),
  });

  const disconnect = useMutation({
    mutationFn: () => paymentGatewaysApi.disconnect(gateway!.id),
    onSuccess: () => {
      toast.success('Manual Mobile Payment is off at checkout.');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not turn it off.')),
  });

  const setAccount = (i: number, patch: Partial<ManualMobileAccount>) => setAccounts((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none';

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <Smartphone size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{gateway?.displayLabel ?? 'Manual Mobile Payment'}</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isOn
              ? `On at checkout: ${saved?.accounts.map((a) => (a.wallet === 'OTHER' ? a.label : WALLET_OPTIONS.find((w) => w.id === a.wallet)?.name)).join(', ') ?? ''}. ${saved?.markReceived ? 'Every TrxID is recorded as received.' : 'You check each TrxID on the order.'}`
              : 'Shoppers send money to your own bKash, Nagad or other number and type the transaction ID. You check it on the order.'}
          </p>
        </div>
        {isOn ? (
          <div className="flex shrink-0 gap-2">
            {!showForm && (
              <button type="button" onClick={openForm} className="px-3 py-1.5 rounded-xl border border-black/10 text-sm font-medium text-regantify-text hover:bg-black/5">
                Edit
              </button>
            )}
            <button
              type="button"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Turn off
            </button>
          </div>
        ) : (
          !showForm && (
            <button type="button" onClick={openForm} className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium shrink-0">
              Set up
            </button>
          )
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (accounts.some((a) => !/^01[3-9]\d{8}$/.test(a.number.replace(/[\s-]/g, '')))) {
              setError('Each number must be an 11-digit mobile number starting with 01.');
              return;
            }
            save.mutate();
          }}
          className="mt-4 pt-4 border-t border-black/5 space-y-3"
        >
          <p className="text-xs font-medium text-regantify-text-muted">Numbers that receive payments</p>
          {accounts.map((a, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_11rem_auto] items-center">
              <select value={a.wallet} onChange={(e) => setAccount(i, { wallet: e.target.value as ManualMobileWallet })} className={inputClass}>
                {WALLET_OPTIONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                {a.wallet === 'OTHER' && (
                  <input value={a.label ?? ''} onChange={(e) => setAccount(i, { label: e.target.value })} maxLength={30} placeholder="Wallet name" className={`${inputClass} max-w-[9rem]`} />
                )}
                <input value={a.number} onChange={(e) => setAccount(i, { number: e.target.value })} inputMode="tel" placeholder="01XXXXXXXXX" className={inputClass} />
              </div>
              <select value={a.kind} onChange={(e) => setAccount(i, { kind: e.target.value as ManualMobileAccount['kind'] })} className={inputClass}>
                {KIND_OPTIONS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={accounts.length === 1}
                onClick={() => setAccounts((list) => list.filter((_, j) => j !== i))}
                className="text-sm text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
          {accounts.length < 6 && (
            <button type="button" onClick={() => setAccounts((list) => [...list, blankAccount()])} className="text-sm font-medium text-regantify-cta">
              + Add another number
            </button>
          )}
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Instructions for the shopper (optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="For example: Use Send Money, not Cash Out. Write your phone number in the reference."
              className={inputClass}
            />
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-black/10 p-3 cursor-pointer">
            <input type="checkbox" checked={markReceived} onChange={(e) => setMarkReceived(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">Trust every transaction ID</span>
              <span className="block text-xs text-regantify-text-muted">
                Records the payment as received at once. Leave it off to check each TrxID in your wallet first (safer: anyone can type a made-up ID).
              </span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Name at checkout</label>
              <input value={displayLabel} onChange={(e) => setDisplayLabel(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Platform charge (৳)</label>
              <input type="number" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-regantify-text-muted">Shown on the StorePal checkout only.</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10">
              Cancel
            </button>
            <button type="submit" disabled={save.isPending} className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60">
              {save.isPending ? 'Saving…' : isOn ? 'Save' : 'Save and turn on'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
