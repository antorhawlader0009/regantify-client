import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutTemplate, Loader2, Save } from 'lucide-react';
import { getFooterConfig, updateFooterConfig, type FooterConfig, type FooterConfigPayload } from '../../../../lib/footerApi';
import { getVendorSocialLinks, getVendorBranding, getVendorSettings } from '../../../../lib/vendorApi';
import { toast } from '../../../../lib/toast';
import { storefrontStoreUrl } from '../../../../lib/storefrontUrl';
import { FOOTER_TEMPLATES, type FooterTemplateKey } from '../../../../lib/footerTemplates';
import { FooterPreview } from './FooterPreview';
import { FooterTemplateModal } from './FooterTemplateModal';
import { FooterItemSettings } from './FooterItemSettings';

type SelectedBlock = 'logo' | 'menu' | 'info' | 'about' | null;

/**
 * Store > Footer — a drag-and-drop, template-based footer builder, same
 * engineering approach as the Landing Page builder applied to a smaller,
 * fixed-slot surface (reference screenshots: eDokan's Footer Editor).
 * The whole config is edited locally as one draft object and committed
 * on "Save", same pattern LandingPageBuilder.tsx uses — every field
 * edit/template swap flows through patchDraft so the preview always
 * shows exactly what would be saved.
 */
export default function Footer() {
  const [draft, setDraft] = useState<FooterConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock>(null);

  const { data: config, isLoading } = useQuery({ queryKey: ['footer-config'], queryFn: getFooterConfig });
  const { data: socialLinks } = useQuery({ queryKey: ['vendor-social-links'], queryFn: getVendorSocialLinks });
  const { data: branding } = useQuery({ queryKey: ['vendor-branding'], queryFn: getVendorBranding });
  const { data: settings } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings });

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const patchDraft = (patch: FooterConfigPayload) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const hasSocialLinks = Boolean(socialLinks && Object.values(socialLinks).some((v) => v?.trim()));

  const handleSelectTemplate = (template: FooterTemplateKey) => {
    patchDraft({ template });
    setTemplateModalOpen(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await updateFooterConfig(draft);
      setDraft(updated);
      setDirty(false);
      toast.success('Footer saved. Your storefront will reflect this shortly.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save the footer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      </div>
    );
  }

  // Bare host for the preview's "© {year} Copyright: {domain}" line
  // (reference screenshot) — storefrontStoreUrl returns a full URL
  // (path-based in local/LAN dev, subdomain-based in production, see
  // that helper's own comment), so this strips it down to just the host
  // for display purposes only; the actual live storefront always uses
  // storefrontStoreUrl's real value, this is preview-only cosmetics.
  const storeDomain = settings
    ? (() => {
        try {
          return new URL(storefrontStoreUrl(settings.subdomain)).host;
        } catch {
          return settings.subdomain;
        }
      })()
    : '';

  return (
    <div className="max-w-5xl">
      <p className="text-xs text-regantify-text-muted mb-1">Design &gt; Footer Editor</p>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Footer Editor</h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium
              text-regantify-text hover:bg-regantify-search transition-colors"
          >
            <LayoutTemplate size={15} />
            Browse Templates
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-regantify-text-muted mb-2">Preview</p>
      <FooterPreview
        config={draft}
        storeName={settings?.storeName ?? 'Your Store'}
        logoUrl={branding?.logoUrl}
        socialLinks={socialLinks ?? { facebookUrl: null, instagramUrl: null, twitterUrl: null, youtubeUrl: null, tiktokUrl: null, linkedinUrl: null, whatsappUrl: null }}
        storeDomain={storeDomain}
        selectedBlock={selectedBlock}
        onSelectBlock={setSelectedBlock}
      />
      <p className="text-xs text-regantify-text-muted mt-3">
        Click a block above to edit its content. Currently using the <strong>{FOOTER_TEMPLATES[draft.template].label}</strong> template.
      </p>

      {templateModalOpen && (
        <FooterTemplateModal
          currentTemplate={draft.template}
          onSelect={handleSelectTemplate}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}

      {selectedBlock && (
        <FooterItemSettings
          block={selectedBlock}
          config={draft}
          onChange={patchDraft}
          onClose={() => setSelectedBlock(null)}
          hasSocialLinks={hasSocialLinks}
        />
      )}
    </div>
  );
}
