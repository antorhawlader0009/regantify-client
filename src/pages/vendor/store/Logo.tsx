import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Store, Camera, Loader2 } from 'lucide-react';
import { getVendorLogo, uploadVendorLogo } from '../../../lib/vendorApi';
import { toast } from 'sonner';

// Same upload pattern as Settings' own profile-picture upload (see
// VendorSettings.tsx) — the server resizes/recompresses to a small UI-
// element size regardless (see CloudinaryService.uploadStoreLogo), so
// this is just an early sanity check on an obviously-wrong file, not
// the final stored size.
const ACCEPTED_TYPES = /^image\/(jpe?g|png|webp|gif)$/;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export default function Logo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVendorLogo()
      .then(setLogoUrl)
      .catch(() => toast.error('Could not load your store logo.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be re-selected later (e.g. after fixing the
    // image elsewhere and re-uploading the same filename).
    e.target.value = '';
    if (!file) return;

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
      const updated = await uploadVendorLogo(file);
      setLogoUrl(updated);
      toast.success('Logo updated. Your storefront will reflect this shortly.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreviewUrl);
      setPreview(null);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Logo</h1>
        <p className="text-regantify-text-muted mt-1">
          Shown in your storefront&apos;s header and footer, in place of your store name text. Images are
          automatically resized and compressed.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={handlePick}
              disabled={uploading}
              className="relative w-32 h-20 rounded-xl overflow-hidden bg-regantify-search
                border border-black/5 shrink-0 disabled:opacity-60 group"
              title="Change store logo"
            >
              {preview || logoUrl ? (
                <img src={preview ?? logoUrl!} alt="Store logo" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-regantify-text-muted">
                  <Store size={28} />
                </div>
              )}
              <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors
                  flex items-center justify-center"
              >
                <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div>
              <button
                type="button"
                onClick={handlePick}
                disabled={uploading}
                className="text-sm font-medium bg-regantify-black text-white py-2 px-4 rounded-xl
                  hover:bg-black transition-colors disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload logo'}
              </button>
              <p className="text-xs text-regantify-text-muted mt-2">JPG, PNG, WEBP, or GIF · under 8MB</p>
              {error && <p className="text-red-500 text-sm mt-1.5">{error}</p>}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleChange}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}
