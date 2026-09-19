import { useEffect, useState } from 'react';
import { Globe, Loader2, Trash2, HelpCircle } from 'lucide-react';
import { getVendorDomain, connectVendorDomain, removeVendorDomain } from '../../../lib/vendorApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { LockedFeatureCard } from '../../../components/ui/UpgradePrompt';
import { toast } from 'sonner';

// Same IP shown to every vendor, regardless of domain — resolution for a
// connected domain isn't per-vendor, it's the storefront app's own
// middleware (see storefront/src/middleware.ts) that looks up the Host
// header against Vendor.customDomain once the domain's registrar points
// an A record here. Falls back to a placeholder if the platform hasn't
// set VITE_PLATFORM_IP yet (see client/.env's own comment on it).
const PLATFORM_IP = import.meta.env.VITE_PLATFORM_IP ?? 'YOUR_SERVER_IP';

const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export default function Domain() {
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  // null while loading = "don't know yet" — never used to mean "not
  // allowed" so the page doesn't flash an upgrade prompt before the
  // real plan is known (same convention as Themes.tsx's allowedThemes).
  const [customDomainAllowed, setCustomDomainAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    Promise.all([getVendorDomain(), getVendorPlanUsage()])
      .then(([domain, { plan }]) => {
        setCustomDomain(domain);
        setCustomDomainAllowed(plan.customDomainAllowed);
      })
      .catch(() => toast.error('Could not load your domain settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setError(null);
    const domain = domainInput.trim().toLowerCase();
    if (!domain) {
      setError('Enter a domain name.');
      return;
    }
    if (!domainRegex.test(domain)) {
      setError('Enter a valid domain name (e.g. my-site.com).');
      return;
    }
    setSaving(true);
    try {
      const updated = await connectVendorDomain(domain);
      setCustomDomain(updated);
      setDomainInput('');
      setShowConnectForm(false);
      toast.success('Domain connected. Update your nameservers to finish setup.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not connect this domain. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeVendorDomain();
      setCustomDomain(null);
      toast.success('Domain removed.');
    } catch {
      toast.error('Could not remove this domain. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Domain Settings</h1>
        <p className="text-regantify-text-muted mt-1">
          Connect a custom domain to your store — your subdomain keeps working either way.
        </p>
      </div>

      {!customDomain ? (
        <>
          {customDomainAllowed === false ? (
            // PLAN.md Step 8 — Free tier: upgrade prompt instead of the
            // connect form, not just a raw 402 after clicking through
            // (the server still enforces this regardless — see
            // VendorService.updateDomain — this is purely a better
            // up-front UX for a vendor who's clearly on Free). Shared
            // shell component — see Step 16's UpgradePrompt.tsx.
            <LockedFeatureCard
              title="Custom domains aren't available on your plan"
              message="Connecting your own domain is a paid-plan feature. Upgrade your plan to connect one — your free subdomain keeps working either way."
            />
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 mb-6">
              <p className="text-sm text-amber-900 mb-3">You have not connected any domain to this store.</p>
              {!showConnectForm && (
                <button
                  type="button"
                  onClick={() => setShowConnectForm(true)}
                  className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition-colors"
                >
                  Connect Your Domain
                </button>
              )}
            </div>
          )}

          {showConnectForm && customDomainAllowed !== false && (
            <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
              <h2 className="text-lg font-medium text-regantify-text mb-1">Setup Guide</h2>
              <ol className="text-sm text-regantify-text-muted list-decimal list-inside space-y-1 mb-6">
                <li>Search your domain name and connect domain. (Use the form below)</li>
                <li>Add an A record in your domain registrar panel (ie. GoDaddy, NameCheap, etc) pointing to our server IP</li>
              </ol>

              <h2 className="text-lg font-medium text-regantify-text mb-3">Search Domain</h2>
              <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1.5">
                Domain name
                <HelpCircle size={14} className="text-regantify-text-muted" />
              </label>
              <div className="flex items-stretch rounded-xl border border-black/10 overflow-hidden focus-within:border-regantify-cta transition-colors">
                <span className="flex items-center px-3.5 bg-regantify-search text-sm text-regantify-text-muted border-r border-black/10">
                  www.
                </span>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="Domain name you purchased (example: my-site.com)"
                  className="flex-1 px-3.5 py-2.5 text-sm text-regantify-text placeholder:text-regantify-text-muted
                    focus:outline-none"
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-1.5">{error}</p>}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-regantify-cta
                    text-regantify-cta hover:bg-regantify-cta hover:text-white text-sm font-medium
                    transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                  {saving ? 'Searching…' : 'Search Domain'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 mb-6">
            <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1.5">
              Domain Name
              <HelpCircle size={14} className="text-regantify-text-muted" />
            </label>
            <div className="flex items-stretch rounded-xl border border-black/10 overflow-hidden mb-5">
              <span className="flex items-center px-3.5 bg-regantify-search text-sm text-regantify-text-muted border-r border-black/10">
                https://
              </span>
              <input
                type="text"
                value={customDomain}
                readOnly
                disabled
                className="flex-1 px-3.5 py-2.5 text-sm text-regantify-text-muted cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700
                text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {removing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {removing ? 'Removing…' : 'Remove Domain'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
            <h2 className="text-lg font-medium text-regantify-text mb-4">Update DNS Record</h2>
            <p className="text-sm text-regantify-text-muted mb-1">
              Login to your domain registrar panel (ie. where you bought your domain from)
            </p>
            <p className="text-sm text-regantify-text-muted mb-4">
              Add the following A record for your domain (and for "www") —
            </p>
            <div className="space-y-2">
              <div className="px-3.5 py-2.5 rounded-xl bg-regantify-search text-sm text-regantify-text font-mono flex items-center justify-between gap-3">
                <span>Type: A</span>
                <span>Host: @ (and www)</span>
                <span>Value: {PLATFORM_IP}</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-4">
              DNS changes can take up to 24–48 hours to fully propagate.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
