import { useEffect, useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle, Save, Loader2 } from 'lucide-react';
import { getVendorSocialLinks, updateVendorSocialLinks, type SocialLinks } from '../../../lib/vendorApi';
import { toast } from 'sonner';

type FieldKey = keyof SocialLinks;

interface PlatformField {
  key: FieldKey;
  label: string;
  placeholder: string;
  icon: typeof Facebook;
}

// Order matches the icons shown in the storefront footer (see
// themes/storepal/components/StoreFooter.tsx's own PLATFORMS list) so
// filling this form top-to-bottom matches what a visitor sees left-to-
// right.
const FIELDS: PlatformField[] = [
  { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/yourpage', icon: Facebook },
  { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/yourpage', icon: Instagram },
  { key: 'twitterUrl', label: 'X (Twitter)', placeholder: 'https://x.com/yourpage', icon: Twitter },
  { key: 'youtubeUrl', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel', icon: Youtube },
  { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@yourpage', icon: Youtube },
  { key: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourpage', icon: Linkedin },
  {
    key: 'whatsappUrl',
    label: 'WhatsApp',
    placeholder: 'https://wa.me/8801XXXXXXXXX',
    icon: MessageCircle,
  },
];

const EMPTY_LINKS: SocialLinks = {
  facebookUrl: null,
  instagramUrl: null,
  twitterUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  linkedinUrl: null,
  whatsappUrl: null,
};

export default function Social() {
  const [links, setLinks] = useState<SocialLinks>(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVendorSocialLinks()
      .then(setLinks)
      .catch(() => toast.error('Could not load your social links.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: FieldKey, value: string) => {
    setLinks((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateVendorSocialLinks(links);
      setLinks(updated);
      toast.success('Social links updated. Your storefront footer will reflect this shortly.');
    } catch {
      toast.error('Could not save your social links. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Social</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Add links to your store&apos;s social profiles — they&apos;ll show as icons in your storefront footer. Leave a
          field blank to hide that icon.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key}>
                <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1.5">
                  <Icon size={15} className="text-regantify-text-muted" />
                  {field.label}
                </label>
                <input
                  type="url"
                  value={links[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                    placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
                />
              </div>
            );
          })}

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
                text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
