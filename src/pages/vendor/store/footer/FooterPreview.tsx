import { Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle, Store } from 'lucide-react';
import type { FooterConfig } from '../../../../lib/footerApi';
import { FOOTER_TEMPLATES, PAYMENT_ICON_LABELS } from '../../../../lib/footerTemplates';
import type { SocialLinks } from '../../../../lib/vendorApi';

interface FooterPreviewProps {
  config: FooterConfig;
  storeName: string;
  logoUrl?: string | null;
  socialLinks: SocialLinks;
  storeDomain: string;
  onSelectBlock: (block: 'logo' | 'menu' | 'info' | 'about' | null) => void;
  selectedBlock: 'logo' | 'menu' | 'info' | 'about' | null;
}

const SOCIAL_ICONS = [Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle];

/**
 * Store > Footer's "Preview" panel (reference screenshot 1) — a rough,
 * non-interactive-styling approximation of how the applied template will
 * render on the live storefront, built from plain dashboard styling
 * (not the actual storefront theme CSS — same "close approximation, not
 * pixel-perfect" spirit as the Landing Page builder's own SectionPreview).
 * Clicking a block calls onSelectBlock so the parent can open that
 * block's "Item Settings" panel (reference screenshot 3).
 */
export function FooterPreview({
  config,
  storeName,
  logoUrl,
  socialLinks,
  storeDomain,
  onSelectBlock,
  selectedBlock,
}: FooterPreviewProps) {
  const def = FOOTER_TEMPLATES[config.template];
  const activeSocialCount = Object.values(socialLinks).filter((v) => v?.trim()).length;

  const blockClass = (block: 'logo' | 'menu' | 'info' | 'about') =>
    `rounded-xl p-4 cursor-pointer transition-colors border-2 ${
      selectedBlock === block ? 'border-regantify-cta bg-regantify-cta/5' : 'border-transparent hover:border-black/10'
    }`;

  const columnRenderers: Record<'logo' | 'menu' | 'info' | 'about', React.ReactNode> = {
    logo: (
      <div key="logo" className={blockClass('logo')} onClick={() => onSelectBlock('logo')}>
        {logoUrl ? (
          <img src={logoUrl} alt={storeName} className="h-8 object-contain mb-3" />
        ) : (
          <div className="flex items-center gap-2 mb-3 text-regantify-text">
            <Store size={18} />
            <span className="font-semibold text-sm">{storeName}</span>
          </div>
        )}
        {config.showSubscribeBlock && def.supportsSubscribe && (
          <div className="flex mb-3 max-w-[220px]">
            <div className="flex-1 h-8 rounded-l-md border border-black/10 bg-white" />
            <div className="h-8 px-3 rounded-r-md bg-regantify-cta flex items-center text-white text-[10px] font-bold">
              JOIN
            </div>
          </div>
        )}
        {config.showSocialIcons && (
          <>
            <p className="text-xs font-medium text-regantify-text-muted mb-1.5">Social Link</p>
            <div className="flex gap-1.5">
              {SOCIAL_ICONS.slice(0, Math.max(activeSocialCount, 3)).map((Icon, i) => (
                <div key={i} className="w-6 h-6 rounded flex items-center justify-center bg-black/80 text-white">
                  <Icon size={11} />
                </div>
              ))}
            </div>
          </>
        )}
        {def.logoCarriesAbout && (
          <p className="text-xs text-regantify-text-muted mt-3 line-clamp-2">
            {config.aboutBlurb ? config.aboutBlurb.replace(/<[^>]+>/g, '') : `${storeName} — welcome to our store.`}
          </p>
        )}
      </div>
    ),
    menu: (
      <div key="menu" className={blockClass('menu')} onClick={() => onSelectBlock('menu')}>
        <p className="text-xs font-bold text-regantify-text uppercase mb-2.5">{config.menuTitle || 'ADD MENU TITLE'}</p>
        <div className="space-y-1.5">
          {config.menuLinks.length > 0 ? (
            config.menuLinks.map((link, i) => (
              <p key={i} className="text-xs text-regantify-cta truncate">
                {link.label || 'Untitled link'}
              </p>
            ))
          ) : (
            <p className="text-xs text-regantify-cta">Add Menu</p>
          )}
        </div>
      </div>
    ),
    info: (
      <div key="info" className={blockClass('info')} onClick={() => onSelectBlock('info')}>
        <p className="text-xs font-bold text-regantify-text uppercase mb-2.5">{config.infoTitle || 'INFORMATION'}</p>
        <div className="space-y-1.5">
          {(config.infoLinks.length > 0
            ? config.infoLinks
            : [{ label: 'About Us' }, { label: 'Contact Us' }, { label: 'Privacy Policy' }, { label: 'Return & Refund Policy' }]
          ).map((link, i) => (
            <p key={i} className="text-xs text-regantify-cta truncate">
              {link.label}
            </p>
          ))}
          <p className="text-xs text-regantify-cta">Add Menu</p>
        </div>
      </div>
    ),
    about: (
      <div key="about" className={blockClass('about')} onClick={() => onSelectBlock('about')}>
        <p className="text-xs text-regantify-text-muted line-clamp-3 mb-3">
          {config.aboutBlurb ? config.aboutBlurb.replace(/<[^>]+>/g, '') : `${storeName} — welcome to our store.`}
        </p>
        {config.showPaymentIcons && config.paymentIcons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {config.paymentIcons.map((key) => (
              <span key={key} className="px-1.5 py-0.5 rounded border border-black/10 text-[9px] font-semibold text-regantify-text-muted">
                {PAYMENT_ICON_LABELS[key]}
              </span>
            ))}
          </div>
        )}
      </div>
    ),
  };

  const visibleColumns = def.columns;

  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden">
      <div className={`grid gap-3 p-5 ${def.background === 'band' ? 'bg-regantify-search' : 'bg-white'}`}
        style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}
      >
        {visibleColumns.map((c) => columnRenderers[c])}
      </div>
      <div className="border-t border-black/5 bg-white px-5 py-3 text-center text-xs text-regantify-text-muted">
        © {new Date().getFullYear()} Copyright: {storeDomain}
      </div>
    </div>
  );
}
