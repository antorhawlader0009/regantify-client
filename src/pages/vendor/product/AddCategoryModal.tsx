import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImagePlus } from 'lucide-react';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { toast } from '../../../lib/toast';

interface AddCategoryModalProps {
  categories: Category[];
  onClose: () => void;
  /** When set, the modal edits this category instead of creating a new one. */
  editingCategory?: Category;
}

type PhotoKind = 'cover' | 'square';

interface PhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm';

/** A text input that shows a dropdown of matching options as you type, and lets you pick one. */
function SearchSelect({
  placeholder,
  query,
  onQueryChange,
  options,
  onSelect,
}: {
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  options: { id: string; label: string }[];
  onSelect: (option: { id: string; label: string }) => void;
}) {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query],
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className={inputClass}
      />
      {focused && query.trim() && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-48 overflow-y-auto py-1">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => onSelect(m)}
              className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddCategoryModal({ categories, onClose, editingCategory }: AddCategoryModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingCategory;

  const [name, setName] = useState(editingCategory?.name ?? '');

  const [parentQuery, setParentQuery] = useState(editingCategory?.parent?.name ?? '');
  const [parentId, setParentId] = useState(editingCategory?.parentId ?? '');

  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(editingCategory?.visibility ?? 'PUBLIC');

  // Not wired up to any API yet — just captured for when the catalog feed
  // integration exists. These are plain text for now too (no real
  // Facebook/Google taxonomy lookup behind them), but styled the same as
  // the searchable Parent Category field to match the reference.
  const [facebookCategory, setFacebookCategory] = useState(editingCategory?.facebookCategory ?? '');
  const [googleCategory, setGoogleCategory] = useState(editingCategory?.googleCategory ?? '');

  const [coverPhoto, setCoverPhoto] = useState<PhotoState | null>(
    editingCategory?.coverPhotoUrl ? { previewUrl: editingCategory.coverPhotoUrl, uploadedUrl: editingCategory.coverPhotoUrl, uploading: false } : null,
  );
  const [squarePhoto, setSquarePhoto] = useState<PhotoState | null>(
    editingCategory?.squarePhotoUrl ? { previewUrl: editingCategory.squarePhotoUrl, uploadedUrl: editingCategory.squarePhotoUrl, uploading: false } : null,
  );
  const coverInputRef = useRef<HTMLInputElement>(null);
  const squareInputRef = useRef<HTMLInputElement>(null);

  const [formError, setFormError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => categories.filter((c) => c.id !== editingCategory?.id).map((c) => ({ id: c.id, label: c.name })),
    [categories, editingCategory],
  );

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created.');
      onClose();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not create the category. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof categoriesApi.update>[1]) =>
      categoriesApi.update(editingCategory!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated.');
      onClose();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not update the category. Please try again.');
    },
  });

  const handlePhotoSelect = (kind: PhotoKind, file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) return;

    const previewUrl = URL.createObjectURL(file);
    const setPhoto = kind === 'cover' ? setCoverPhoto : setSquarePhoto;
    setPhoto({ previewUrl, uploading: true });

    categoriesApi
      .uploadPhoto(file, kind)
      .then((res) => setPhoto({ previewUrl, uploadedUrl: res.url, uploading: false }))
      .catch(() => setPhoto({ previewUrl, uploading: false, error: 'Upload failed' }));
  };

  const handleSubmit = () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    if (coverPhoto?.uploading || squarePhoto?.uploading) {
      setFormError('Please wait for the photo to finish uploading.');
      return;
    }

    const payload = {
      name: name.trim(),
      visibility,
      parentId: parentId || undefined,
      coverPhotoUrl: coverPhoto?.uploadedUrl,
      squarePhotoUrl: squarePhoto?.uploadedUrl,
      facebookCategory: facebookCategory.trim() || undefined,
      googleCategory: googleCategory.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <h2 className="sr-only">{isEditing ? 'Edit Category' : 'Add Category'}</h2>
            <button onClick={onClose} className="ml-auto text-regantify-text-muted hover:text-regantify-text">
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="Name"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Parent Category</label>
            <SearchSelect
              placeholder="Search Category"
              query={parentQuery}
              onQueryChange={(v) => {
                setParentQuery(v);
                setParentId('');
              }}
              options={parentOptions}
              onSelect={(o) => {
                setParentId(o.id);
                setParentQuery(o.label);
              }}
            />
          </div>

          <div className="border-t border-black/5 pt-5">
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Facebook Product Category</label>
            <input
              type="text"
              value={facebookCategory}
              onChange={(e) => setFacebookCategory(e.target.value.slice(0, 150))}
              placeholder="Search Facebook Category"
              maxLength={150}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Google Product Category</label>
            <input
              type="text"
              value={googleCategory}
              onChange={(e) => setGoogleCategory(e.target.value.slice(0, 150))}
              placeholder="Search Google Category"
              maxLength={150}
              className={inputClass}
            />
          </div>

          <p className="text-xs text-regantify-text-muted -mt-2">
            Select either facebook or google product category that best fits your purpose.
            <br />
            <span className="font-medium text-regantify-text">Why do I need this?</span> For better facebook ad
            targeting.
          </p>

          <div className="border-t border-black/5 pt-5 grid grid-cols-2 gap-5">
            <div>
              <p className="text-sm font-medium text-regantify-text mb-1.5">Cover Photo</p>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
                  flex items-center justify-center overflow-hidden hover:border-black/25"
              >
                {coverPhoto ? (
                  <div className="relative w-full h-full">
                    <img src={coverPhoto.uploadedUrl ?? coverPhoto.previewUrl} alt="" className="w-full h-full object-cover" />
                    {coverPhoto.uploading && (
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
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  handlePhotoSelect('cover', e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <p className="text-xs text-regantify-text-muted mt-1.5">
                Cover photo size should be at least 1200x633. This photo will be shown on category page and on
                facebook.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-1.5">Square Photo</p>
              <button
                type="button"
                onClick={() => squareInputRef.current?.click()}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
                  flex items-center justify-center overflow-hidden hover:border-black/25"
              >
                {squarePhoto ? (
                  <div className="relative w-full h-full">
                    <img src={squarePhoto.uploadedUrl ?? squarePhoto.previewUrl} alt="" className="w-full h-full object-cover" />
                    {squarePhoto.uploading && (
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
                ref={squareInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  handlePhotoSelect('square', e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <p className="text-xs text-regantify-text-muted mt-1.5">
                Square photo size should be at least 400x400. This photo will be shown on category thumbnails (if
                enabled).
              </p>
            </div>
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}
        </div>

        <div className="border-t border-black/5 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
              transition-colors disabled:opacity-60"
          >
            {isEditing
              ? isSaving
                ? 'Saving…'
                : 'Save Changes'
              : isSaving
                ? 'Creating…'
                : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
