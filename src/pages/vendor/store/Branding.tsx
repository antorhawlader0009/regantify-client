import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Store, Camera, ImageIcon, Loader2, Save } from 'lucide-react';
import {
  getVendorBranding,
  updateVendorBranding,
  uploadVendorLogo,
  uploadVendorFavicon,
  uploadVendorBrandCover,
  type Branding as BrandingState,
} from '../../../lib/vendorApi';
import { toast } from 'sonner';

// Same upload guard as the old standalone Logo page (see git history) —
// the server resizes/recompresses regardless (see CloudinaryService's
// uploadStoreLogo/uploadStoreFavicon/uploadStoreBrandCover), so this is
// just an early rejection of an obviously-wrong file.
const ACCEPTED_TYPES = /^image\/(jpe?g|png|webp|gif)$/;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const EMPTY_BRANDING: BrandingState = {
  logoUrl: null,
  faviconUrl: null,
  accentColor: null,
  bodyBackgroundColor: null,
  brandHeadingFont: null,
  brandBodyFont: null,
  brandCoverImageUrl: null,
  brandMetaTitle: null,
  brandMetaDescription: null,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validateHex(value: string, label: string): string | null {
  if (!value.trim()) return null; // clearing the field is always allowed
  return HEX_COLOR.test(value.trim()) ? null : `${label} must be a hex code, e.g. #1E3A8A.`;
}

/**
 * Store > Branding — consolidates what used to be the standalone Store >
 * Logo page (logo upload is still here, first) plus new favicon/accent-
 * color/background-color/heading-and-body-font/cover-photo/meta-title/
 * meta-description fields, all writing to the new Vendor branding
 * columns (see schema.prisma). One page, three save actions under the
 * hood (logo/favicon/cover are their own upload endpoints, same split
 * the old Logo page already had; colors/fonts/meta share one "Update
 * Branding" PATCH) — presented to the vendor as a single screen with
 * one visible primary action per image field and one shared "Update
 * Branding" button for the rest, matching how the reference screenshot
 * groups them.
 */
export default function Branding() {
  const [branding, setBranding] = useState<BrandingState>(EMPTY_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVendorBranding()
      .then(setBranding)
      .catch(() => toast.error('Could not load your branding settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleField = <K extends keyof BrandingState>(key: K, value: BrandingState[K]) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (
    file: File,
    setPreview: (url: string | null) => void,
    setUploading: (v: boolean) => void,
    setError: (msg: string | null) => void,
    doUpload: (file: File) => Promise<string | null>,
    onDone: (url: string | null) => void,
    successMessage: string,
  ) => {
    setError(null);
    if (!ACCEPTED_TYPES.test(file.type)) {
      setError('Please choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Image is too large — please choose a file under 8MB.');
      return;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setUploading(true);
    try {
      const url = await doUpload(file);
      onDone(url);
      toast.success(successMessage);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreviewUrl);
      setPreview(null);
    }
  };

  const handleSaveBranding = async () => {
    const error =
      validateHex(branding.accentColor ?? '', 'Accent color') ??
      validateHex(branding.bodyBackgroundColor ?? '', 'Body background color');
    if (error) {
      setColorError(error);
      return;
    }
    setColorError(null);
    setSaving(true);
    try {
      const updated = await updateVendorBranding({
        accentColor: branding.accentColor ?? '',
        bodyBackgroundColor: branding.bodyBackgroundColor ?? '',
        brandHeadingFont: branding.brandHeadingFont ?? '',
        brandBodyFont: branding.brandBodyFont ?? '',
        brandMetaTitle: branding.brandMetaTitle ?? '',
        brandMetaDescription: branding.brandMetaDescription ?? '',
      });
      setBranding((prev) => ({ ...prev, ...updated }));
      toast.success('Branding updated. Your storefront will reflect this shortly.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save branding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Branding</h1>
        <p className="text-regantify-text-muted mt-1">
          Your store&apos;s logo, colors, fonts, and default social-share appearance.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-6">
        <h2 className="text-sm font-semibold text-regantify-text">Color &amp; Logo</h2>

        {/* Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-5 flex-1">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="relative w-32 h-20 rounded-xl overflow-hidden bg-regantify-search
                border border-black/5 shrink-0 disabled:opacity-60 group"
              title="Change store logo"
            >
              {logoPreview || branding.logoUrl ? (
                <img src={logoPreview ?? branding.logoUrl!} alt="Store logo" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-regantify-text-muted">
                  <Store size={28} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium text-regantify-text mb-1">Logo</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="text-sm font-medium bg-regantify-black text-white py-2 px-4 rounded-xl
                  hover:bg-black transition-colors disabled:opacity-60"
              >
                {logoUploading ? 'Uploading…' : 'Upload logo'}
              </button>
              <p className="text-xs text-regantify-text-muted mt-2">JPG, PNG, WEBP, or GIF · under 8MB</p>
              {logoError && <p className="text-red-500 text-sm mt-1.5">{logoError}</p>}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  void handleImageUpload(
                    file,
                    setLogoPreview,
                    setLogoUploading,
                    setLogoError,
                    uploadVendorLogo,
                    (url) => handleField('logoUrl', url),
                    'Logo updated. Your storefront will reflect this shortly.',
                  );
                }}
              />
            </div>
          </div>
          <p className="text-sm text-regantify-text-muted sm:max-w-xs">This logo will be used on your invoice as well.</p>
        </div>

        {/* Favicon */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pt-2 border-t border-black/5">
          <div className="flex items-center gap-5 flex-1 pt-4">
            <button
              type="button"
              onClick={() => faviconInputRef.current?.click()}
              disabled={faviconUploading}
              className="relative w-16 h-16 rounded-xl overflow-hidden bg-regantify-search
                border border-black/5 shrink-0 disabled:opacity-60 group"
              title="Change favicon"
            >
              {faviconPreview || branding.faviconUrl ? (
                <img
                  src={faviconPreview ?? branding.faviconUrl!}
                  alt="Store favicon"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-regantify-text-muted">
                  <ImageIcon size={22} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium text-regantify-text mb-1">Icon (Favicon)</p>
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={faviconUploading}
                className="text-sm font-medium bg-regantify-black text-white py-2 px-4 rounded-xl
                  hover:bg-black transition-colors disabled:opacity-60"
              >
                {faviconUploading ? 'Uploading…' : 'Upload favicon'}
              </button>
              {faviconError && <p className="text-red-500 text-sm mt-1.5">{faviconError}</p>}
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  void handleImageUpload(
                    file,
                    setFaviconPreview,
                    setFaviconUploading,
                    setFaviconError,
                    uploadVendorFavicon,
                    (url) => handleField('faviconUrl', url),
                    'Favicon updated. Your storefront will reflect this shortly.',
                  );
                }}
              />
            </div>
          </div>
          <p className="text-sm text-regantify-text-muted sm:max-w-xs pt-4">Favicons are shown on the browser tabs.</p>
        </div>

        {/* Colors */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-black/5 mt-2">
          <div className="pt-4">
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accentColor ?? '#000000'}
                onChange={(e) => handleField('accentColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={branding.accentColor ?? ''}
                onChange={(e) => handleField('accentColor', e.target.value || null)}
                placeholder="#1E3A8A"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                  placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
              />
            </div>
            <p className="text-xs text-regantify-text-muted mt-1.5">Main theme color of your store.</p>
          </div>
          <div className="pt-4">
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Body Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.bodyBackgroundColor ?? '#ffffff'}
                onChange={(e) => handleField('bodyBackgroundColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={branding.bodyBackgroundColor ?? ''}
                onChange={(e) => handleField('bodyBackgroundColor', e.target.value || null)}
                placeholder="#FFFFFF"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                  placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
              />
            </div>
            <p className="text-xs text-regantify-text-muted mt-1.5">Background color of the entire site.</p>
          </div>
        </div>
        {colorError && <p className="text-red-500 text-sm">{colorError}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4 mt-6">
        <h2 className="text-sm font-semibold text-regantify-text">Typography (Fonts)</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Font – Headline</label>
            <input
              type="text"
              value={branding.brandHeadingFont ?? ''}
              onChange={(e) => handleField('brandHeadingFont', e.target.value || null)}
              placeholder="Open Sans"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5">
              For a list of all available fonts,{' '}
              <a
                href="https://fonts.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-regantify-cta hover:underline"
              >
                browse Google Fonts library
              </a>
              .
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Font – Body</label>
            <input
              type="text"
              value={branding.brandBodyFont ?? ''}
              onChange={(e) => handleField('brandBodyFont', e.target.value || null)}
              placeholder="Open Sans"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5">
              For a list of all available fonts,{' '}
              <a
                href="https://fonts.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-regantify-cta hover:underline"
              >
                browse Google Fonts library
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4 mt-6">
        <h2 className="text-sm font-semibold text-regantify-text">Cover Photo &amp; Meta</h2>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="relative w-32 h-32 rounded-xl overflow-hidden bg-regantify-search
                border border-black/5 shrink-0 disabled:opacity-60 group"
              title="Change cover photo"
            >
              {coverPreview || branding.brandCoverImageUrl ? (
                <img
                  src={coverPreview ?? branding.brandCoverImageUrl!}
                  alt="Store cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-regantify-text-muted">
                  <ImageIcon size={26} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void handleImageUpload(
                  file,
                  setCoverPreview,
                  setCoverUploading,
                  setCoverError,
                  uploadVendorBrandCover,
                  (url) => handleField('brandCoverImageUrl', url),
                  'Cover photo updated. Your storefront will reflect this shortly.',
                );
              }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-regantify-text mb-1">Cover Photo</p>
            <p className="text-xs text-regantify-text-muted">Cover photo size should be at least 1200x633. This photo will be shown on Facebook.</p>
            {coverError && <p className="text-red-500 text-sm mt-1.5">{coverError}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Meta Title</label>
          <input
            type="text"
            value={branding.brandMetaTitle ?? ''}
            onChange={(e) => handleField('brandMetaTitle', e.target.value || null)}
            maxLength={70}
            placeholder="Your Store Name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
              placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
          />
          <p className="text-xs text-regantify-text-muted mt-1.5">Title for homepage that will be shown on Facebook and Google.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Meta Description</label>
          <textarea
            value={branding.brandMetaDescription ?? ''}
            onChange={(e) => handleField('brandMetaDescription', e.target.value || null)}
            maxLength={200}
            rows={3}
            placeholder="Short description of your store…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
              placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors resize-y"
          />
          <p className="text-xs text-regantify-text-muted mt-1.5">Short description that will be visible on Facebook and Google.</p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSaveBranding}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Update Branding'}
        </button>
      </div>
    </div>
  );
}
