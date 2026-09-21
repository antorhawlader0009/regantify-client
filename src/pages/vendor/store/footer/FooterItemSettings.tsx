import { X } from 'lucide-react';
import { RichTextEditor } from '../../../../components/editor/RichTextEditor';
import { FooterLinkListEditor } from './FooterLinkListEditor';
import type { FooterConfig } from '../../../../lib/footerApi';
import { FOOTER_TEMPLATES, PAYMENT_ICON_KEYS, PAYMENT_ICON_LABELS } from '../../../../lib/footerTemplates';

interface FooterItemSettingsProps {
  block: 'logo' | 'menu' | 'info' | 'about';
  config: FooterConfig;
  onChange: (patch: Partial<FooterConfig>) => void;
  onClose: () => void;
  hasSocialLinks: boolean;
}

/**
 * Store > Footer's "Item Settings" side panel (reference screenshot 3) —
 * clicking a footer block in the preview opens this panel scoped to
 * just that block's content, same interaction pattern as the Landing
 * Page builder's per-section SectionSettings panel.
 */
export function FooterItemSettings({ block, config, onChange, onClose, hasSocialLinks }: FooterItemSettingsProps) {
  const def = FOOTER_TEMPLATES[config.template];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl border-l border-black/10 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
        <h3 className="text-sm font-semibold text-regantify-text">Item Settings</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-regantify-text-muted hover:bg-regantify-search transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {block === 'logo' && (
          <>
            <p className="text-xs text-regantify-text-muted">
              Logo comes from Store &gt; Branding. Social links come from Store &gt; Social.
            </p>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-regantify-text">Show social icons</span>
              <input
                type="checkbox"
                checked={config.showSocialIcons}
                disabled={!hasSocialLinks}
                onChange={(e) => onChange({ showSocialIcons: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
            {!hasSocialLinks && (
              <p className="text-xs text-amber-600 -mt-3">Add at least one link on Store &gt; Social to enable this.</p>
            )}
            {def.supportsSubscribe && (
              <>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-regantify-text">Show subscribe block</span>
                  <input
                    type="checkbox"
                    checked={config.showSubscribeBlock}
                    onChange={(e) => onChange({ showSubscribeBlock: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                {config.showSubscribeBlock && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-regantify-text-muted mb-1">Heading</label>
                      <input
                        type="text"
                        value={config.subscribeHeading}
                        onChange={(e) => onChange({ subscribeHeading: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-regantify-text-muted mb-1">Subheading</label>
                      <input
                        type="text"
                        value={config.subscribeSubheading}
                        onChange={(e) => onChange({ subscribeSubheading: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta"
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {def.logoCarriesAbout && (
              <div>
                <label className="block text-xs font-medium text-regantify-text-muted mb-1">About blurb</label>
                <RichTextEditor
                  value={config.aboutBlurb ?? ''}
                  onChange={(html) => onChange({ aboutBlurb: html })}
                  placeholder="A short line about your store…"
                />
              </div>
            )}
          </>
        )}

        {block === 'menu' && (
          <>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Column title</label>
              <input
                type="text"
                value={config.menuTitle}
                onChange={(e) => onChange({ menuTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-2">Links</label>
              <FooterLinkListEditor links={config.menuLinks} onChange={(menuLinks) => onChange({ menuLinks })} />
            </div>
          </>
        )}

        {block === 'info' && (
          <>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Column title</label>
              <input
                type="text"
                value={config.infoTitle}
                onChange={(e) => onChange({ infoTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-2">Links</label>
              <p className="text-xs text-regantify-text-muted mb-2">
                Leave empty to auto-list your published Store &gt; Pages instead.
              </p>
              <FooterLinkListEditor links={config.infoLinks} onChange={(infoLinks) => onChange({ infoLinks })} />
            </div>
          </>
        )}

        {block === 'about' && (
          <>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">About blurb</label>
              <RichTextEditor
                value={config.aboutBlurb ?? ''}
                onChange={(html) => onChange({ aboutBlurb: html })}
                placeholder="A short line about your store…"
              />
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-regantify-text">Show payment/courier icons</span>
              <input
                type="checkbox"
                checked={config.showPaymentIcons}
                onChange={(e) => onChange({ showPaymentIcons: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
            {config.showPaymentIcons && (
              <div className="flex flex-wrap gap-2">
                {PAYMENT_ICON_KEYS.map((key) => {
                  const active = config.paymentIcons.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        onChange({
                          paymentIcons: active
                            ? config.paymentIcons.filter((k) => k !== key)
                            : [...config.paymentIcons, key],
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-cta'
                          : 'border-black/10 text-regantify-text-muted hover:border-black/20'
                      }`}
                    >
                      {PAYMENT_ICON_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
