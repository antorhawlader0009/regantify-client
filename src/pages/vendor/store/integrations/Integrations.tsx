import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronRight, Facebook, KeyRound, Music2, Server, Tags, Webhook } from 'lucide-react';
import { metaPixelApi } from '../../../../lib/metaPixelApi';
import { googleAnalyticsApi } from '../../../../lib/googleAnalyticsApi';
import { googleTagManagerApi } from '../../../../lib/googleTagManagerApi';
import { tiktokPixelApi } from '../../../../lib/tiktokPixelApi';
import { webhooksApi } from '../../../../lib/webhooksApi';
import { apiKeysApi } from '../../../../lib/apiKeysApi';

/**
 * Store > Integrations — one card per marketing/analytics integration.
 * Every card is live; IntegrationCard still renders a "Coming soon" card
 * (no link) for any future integration added before it's built.
 */
export default function Integrations() {
  const { data: metaPixel } = useQuery({ queryKey: ['meta-pixel'], queryFn: metaPixelApi.get });
  const { data: googleAnalytics } = useQuery({ queryKey: ['google-analytics'], queryFn: googleAnalyticsApi.get });
  const { data: googleTagManager } = useQuery({ queryKey: ['google-tag-manager'], queryFn: googleTagManagerApi.get });
  const { data: tiktokPixel } = useQuery({ queryKey: ['tiktok-pixel'], queryFn: tiktokPixelApi.get });
  const { data: webhooks } = useQuery({ queryKey: ['webhooks'], queryFn: webhooksApi.list });
  const { data: apiKeys } = useQuery({ queryKey: ['api-keys'], queryFn: apiKeysApi.list });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Integrations</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Connect ad and analytics tools to your storefront to track visitors and sales.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <IntegrationCard
          to="/vendor/store/integrations/facebook-pixel"
          icon={<Facebook size={20} />}
          iconClass="bg-[#1877F2]/10 text-[#1877F2]"
          title="Facebook Pixel (Meta)"
          description="Track visits, add-to-carts and purchases for Facebook & Instagram ads, plus a product catalog feed."
          status={metaPixel ? (metaPixel.pixelId ? 'connected' : 'not-set') : undefined}
        />
        {/* Same MetaPixelSettings as the card above, its own page. */}
        <IntegrationCard
          to="/vendor/store/integrations/meta-conversions-api"
          icon={<Server size={20} />}
          iconClass="bg-[#1877F2]/10 text-[#1877F2]"
          title="Meta Conversions API"
          description="Send events to Meta from our server so ad blockers and iOS can't lose them, and count only confirmed orders as purchases."
          status={
            metaPixel
              ? metaPixel.capiTokenInvalid
                ? 'attention'
                : metaPixel.capiTokenSet
                  ? 'connected'
                  : 'not-set'
              : undefined
          }
        />
        <IntegrationCard
          to="/vendor/store/integrations/tiktok-pixel"
          icon={<Music2 size={20} />}
          iconClass="bg-black/5 text-regantify-text"
          title="TikTok Pixel"
          description="Measure TikTok ad results, optimize for purchases and build audiences from your store visitors."
          status={tiktokPixel ? (tiktokPixel.pixelId ? 'connected' : 'not-set') : undefined}
        />
        <IntegrationCard
          to="/vendor/store/integrations/google-analytics"
          icon={<BarChart3 size={20} />}
          iconClass="bg-[#F9AB00]/10 text-[#E37400]"
          title="Google Analytics 4"
          description="See where your visitors come from, what they do on your store and what they buy."
          status={googleAnalytics ? (googleAnalytics.measurementId ? 'connected' : 'not-set') : undefined}
        />
        <IntegrationCard
          to="/vendor/store/integrations/google-tag-manager"
          icon={<Tags size={20} />}
          iconClass="bg-[#4285F4]/10 text-[#4285F4]"
          title="Google Tag Manager"
          description="Manage all your tracking tags from one Google Tag Manager container, with ready-made ecommerce events."
          status={googleTagManager ? (googleTagManager.containerId ? 'connected' : 'not-set') : undefined}
        />
      </div>

      <h2 className="text-lg font-semibold text-regantify-text mt-8 mb-3">Advanced</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <IntegrationCard
          to="/vendor/store/integrations/webhooks"
          icon={<Webhook size={20} />}
          iconClass="bg-violet-50 text-violet-700"
          title="Webhooks"
          description="Send new orders, status changes, product changes and leads to your own apps (Google Sheets, CRM, n8n, Make) as they happen."
          status={
            webhooks
              ? webhooks.some((w) => !w.isActive && w.disabledReason)
                ? 'attention'
                : webhooks.length > 0
                  ? 'connected'
                  : 'not-set'
              : undefined
          }
        />
        <IntegrationCard
          to="/vendor/store/integrations/external-api"
          icon={<KeyRound size={20} />}
          iconClass="bg-slate-100 text-slate-700"
          title="External API"
          description="API keys for your own systems to read orders and products, create orders and update stock."
          status={apiKeys ? (apiKeys.length > 0 ? 'connected' : 'not-set') : undefined}
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  to,
  icon,
  iconClass,
  title,
  description,
  status,
}: {
  // No link = not built yet ("Coming soon").
  to?: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
  // 'attention' = set up, but the service rejected it (e.g. an expired token).
  status?: 'connected' | 'not-set' | 'attention';
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</div>
        {!to ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-regantify-text-muted">
            Coming soon
          </span>
        ) : status === 'connected' ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            Connected
          </span>
        ) : status === 'attention' ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
            Needs attention
          </span>
        ) : status === 'not-set' ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-regantify-text-muted">
            Not set up
          </span>
        ) : null}
      </div>
      <h2 className="text-base font-medium text-regantify-text mt-4">{title}</h2>
      <p className="text-sm text-regantify-text-muted mt-1">{description}</p>
      {to && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-regantify-cta mt-4">
          {status === 'connected' || status === 'attention' ? 'Manage' : 'Set up'}
          <ChevronRight size={16} />
        </span>
      )}
    </>
  );

  return to ? (
    <Link
      to={to}
      className="block bg-white rounded-2xl border border-black/5 p-5 hover:border-regantify-cta/40 hover:shadow-sm transition"
    >
      {body}
    </Link>
  ) : (
    <div className="bg-white rounded-2xl border border-black/5 p-5 opacity-70">{body}</div>
  );
}
