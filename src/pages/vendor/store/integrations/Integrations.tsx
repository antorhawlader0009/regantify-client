import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronRight, Facebook, Music2, Tags } from 'lucide-react';
import { metaPixelApi } from '../../../../lib/metaPixelApi';

/**
 * Store > Integrations — one card per marketing/analytics integration.
 * Only Facebook Pixel is live; the rest are shown as "Coming soon" so the
 * page already has its final shape.
 */
export default function Integrations() {
  const { data: metaPixel } = useQuery({ queryKey: ['meta-pixel'], queryFn: metaPixelApi.get });

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
        <IntegrationCard
          icon={<Music2 size={20} />}
          iconClass="bg-black/5 text-regantify-text"
          title="TikTok Pixel"
          description="Measure TikTok ad results and build audiences from your store visitors."
        />
        <IntegrationCard
          icon={<BarChart3 size={20} />}
          iconClass="bg-[#F9AB00]/10 text-[#E37400]"
          title="Google Analytics 4"
          description="See where your visitors come from and what they do on your store."
        />
        <IntegrationCard
          icon={<Tags size={20} />}
          iconClass="bg-[#4285F4]/10 text-[#4285F4]"
          title="Google Tag Manager"
          description="Manage all your tracking tags from one Google Tag Manager container."
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
  status?: 'connected' | 'not-set';
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
          {status === 'connected' ? 'Manage' : 'Set up'}
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
