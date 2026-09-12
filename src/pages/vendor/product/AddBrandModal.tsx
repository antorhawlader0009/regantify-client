import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImagePlus } from 'lucide-react';
import { brandsApi } from '../../../lib/brandsApi';
import { toast } from '../../../lib/toast';

interface AddBrandModalProps {
  onClose: () => void;
}

interface LogoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function AddBrandModal({ onClose }: AddBrandModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const [logo, setLogo] = useState<LogoState | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: brandsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand added.');
      onClose();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not create the brand. Please try again.');
    },
  });

  const handleNameChange = (value: string) => {
    setName(value.slice(0, 100));
    // Slug follows the name automatically until the vendor edits it
    // themselves — same "auto-fill until touched" pattern as most
    // name→slug fields.
    if (!slugTouched) setSlug(slugify(value).slice(0, 100));
  };

  const handleLogoSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) return;

    const previewUrl = URL.createObjectURL(file);
    setLogo({ previewUrl, uploading: true });

    brandsApi
      .uploadLogo(file)
      .then((res) => setLogo({ previewUrl, uploadedUrl: res.url, uploading: false }))
      .catch(() => setLogo({ previewUrl, uploading: false, error: 'Upload failed' }));
  };

  const isValid = name.trim().length > 0 && slug.trim().length > 0 && Boolean(logo?.uploadedUrl);

  const handleSubmit = () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Brand name is required.');
      return;
    }
    if (!slug.trim()) {
      setFormError('Slug is required.');
      return;
    }
    if (logo?.uploading) {
      setFormError('Please wait for the logo to finish uploading.');
      return;
    }
    if (!logo?.uploadedUrl) {
      setFormError('Brand logo is required.');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      slug: slugify(slug),
      logoUrl: logo.uploadedUrl,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <h2 className="sr-only">Add Brand</h2>
            <button onClick={onClose} className="ml-auto text-regantify-text-muted hover:text-regantify-text">
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-regantify-text mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Name"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-regantify-text mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.slice(0, 100));
                setSlugTouched(true);
              }}
              placeholder="Slug"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-regantify-text mb-1.5">
              Brand Logo <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
                flex items-center justify-center overflow-hidden hover:border-black/25"
            >
              {logo ? (
                <div className="relative w-full h-full">
                  <img src={logo.uploadedUrl ?? logo.previewUrl} alt="" className="w-full h-full object-cover" />
                  {logo.uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <ImagePlus size={22} className="text-regantify-text-muted" />
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                handleLogoSelect(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="hidden"
            />
            {logo?.error && <p className="text-red-500 text-sm mt-1.5">{logo.error}</p>}
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}
        </div>

        <div className="border-t border-black/5 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Adding…' : 'Add Brand'}
          </button>
        </div>
      </div>
    </div>
  );
}
