import { ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { storefrontProductUrl } from '../../lib/storefrontUrl';

interface ViewProductOnStorefrontProps {
  /** The product's storefront URL slug — pass undefined/null when unavailable (e.g. a deleted product's name snapshot on an old order) to render nothing rather than a broken link. */
  slug?: string | null;
  /** Extra spacing/alignment classes from the call site — the icon itself always stays a fixed small size. */
  className?: string;
}

/**
 * Small "view on storefront" icon meant to sit right next to a product
 * name anywhere it's shown in the vendor dashboard (All Products, Order
 * line items, Incomplete Orders, Create Stock Product, etc) — opens that
 * product's real public storefront page in a new tab. Renders nothing if
 * either the vendor has no subdomain yet or the product has no slug to
 * link to (e.g. a snapshot of a since-deleted product on an old order),
 * rather than showing a link that would 404.
 */
export function ViewProductOnStorefront({ slug, className }: ViewProductOnStorefrontProps) {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  if (!subdomain || !slug) return null;

  return (
    <a
      href={storefrontProductUrl(subdomain, slug)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="View on storefront"
      className={`inline-flex text-regantify-text-muted hover:text-regantify-cta transition-colors ${className ?? ''}`}
    >
      <ExternalLink size={13} />
    </a>
  );
}
