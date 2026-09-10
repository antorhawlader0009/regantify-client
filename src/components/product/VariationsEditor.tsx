import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Camera } from 'lucide-react';
import { productInputClass } from './ProductFormPieces';
import type { VariationOptionInput, ProductVariantInput, VariationValuePhotoInput } from '../../lib/productsApi';
import { productsApi } from '../../lib/productsApi';

interface VariationsEditorProps {
  productSku: string;
  weightUnit: string;
  options: VariationOptionInput[];
  onOptionsChange: (options: VariationOptionInput[]) => void;
  variants: ProductVariantInput[];
  onVariantsChange: (variants: ProductVariantInput[]) => void;
  variationPhotos: VariationValuePhotoInput[];
  onVariationPhotosChange: (photos: VariationValuePhotoInput[]) => void;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Every combination of each option's values, in option order — e.g. Color×Size → [{Color:Black,Size:36-37}, ...]. */
function cartesianCombinations(options: VariationOptionInput[]): Record<string, string>[] {
  if (options.length === 0) return [];
  return options.reduce<Record<string, string>[]>(
    (acc, option) => {
      const next: Record<string, string>[] = [];
      for (const combo of acc) {
        for (const value of option.values) {
          next.push({ ...combo, [option.name]: value });
        }
      }
      return next;
    },
    [{}],
  );
}

/**
 * Product Variations section — "Add Variation: Size | Color | Custom"
 * buttons, one row per variation option with its chip list of values,
 * and a "Variation Stocks" table auto-generated from every combination
 * of those values. Matches the reference Edit Product page.
 */
export function VariationsEditor({
  productSku,
  weightUnit,
  options,
  onOptionsChange,
  variants,
  onVariantsChange,
  variationPhotos,
  onVariationPhotosChange,
}: VariationsEditorProps) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  // Which single variation option currently has photos assigned (e.g.
  // "Color") — null means "no photos section shown yet" or "none set".
  // Synced from variationPhotos whenever it's set from outside this
  // component (e.g. Edit Product loading an existing product's data,
  // which arrives after this component has already mounted with empty
  // props) — but only auto-picks when nothing has been explicitly chosen
  // yet, so it doesn't fight the vendor's own dropdown selection. Prefers
  // the first entry that actually has photos over just the array's first
  // entry, since a stale empty entry (e.g. switching "Photos by" away
  // from an option before uploading anything for it) shouldn't win.
  const firstPhotoEntry = (photos: VariationValuePhotoInput[]) => photos.find((p) => p.photoUrls.length > 0) ?? photos[0];
  const [photoOptionName, setPhotoOptionName] = useState<string | null>(
    variationPhotos.length > 0 ? firstPhotoEntry(variationPhotos).optionName : null,
  );
  const [photoOptionTouched, setPhotoOptionTouched] = useState(false);
  useEffect(() => {
    if (photoOptionTouched) return;
    if (variationPhotos.length > 0) setPhotoOptionName(firstPhotoEntry(variationPhotos).optionName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variationPhotos]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const combinations = useMemo(() => cartesianCombinations(options), [options]);

  // Keep the variants table in sync with the current combinations —
  // preserves any existing row's stock/price/etc. by matching on
  // optionValues, adds new rows for new combinations, and drops rows
  // whose combination no longer exists (e.g. a value was removed).
  useEffect(() => {
    if (options.length === 0) {
      if (variants.length > 0) onVariantsChange([]);
      return;
    }

    const optionOrder = options.map((o) => o.name);
    const nextVariants: ProductVariantInput[] = combinations.map((combo) => {
      const existing = variants.find((v) =>
        optionOrder.every((name) => v.optionValues[name] === combo[name]),
      );
      if (existing) return existing;

      const skuParts = optionOrder.map((name) => slugify(combo[name]));
      return {
        sku: [slugify(productSku), ...skuParts].join('-'),
        optionValues: combo,
        stock: 0,
      };
    });

    // Only update if something actually changed, to avoid an infinite
    // effect loop (this effect's own onVariantsChange call re-triggers it
    // otherwise, since `variants` is a dependency-free closure value here).
    const changed =
      nextVariants.length !== variants.length ||
      nextVariants.some((v, i) => v.sku !== variants[i]?.sku || v !== variants[i]);
    if (changed) onVariantsChange(nextVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinations, productSku]);

  const addOption = (name: string) => {
    if (options.some((o) => o.name === name)) return;
    onOptionsChange([...options, { name, values: [] }]);
  };

  const removeOption = (name: string) => {
    onOptionsChange(options.filter((o) => o.name !== name));
    if (variationPhotos.some((p) => p.optionName === name)) {
      onVariationPhotosChange(variationPhotos.filter((p) => p.optionName !== name));
    }
    if (photoOptionName === name) setPhotoOptionName(null);
  };

  const addValue = (optionName: string) => {
    const raw = (valueInputs[optionName] ?? '').trim();
    if (!raw) return;
    onOptionsChange(
      options.map((o) => (o.name === optionName && !o.values.includes(raw) ? { ...o, values: [...o.values, raw] } : o)),
    );
    setValueInputs((prev) => ({ ...prev, [optionName]: '' }));
  };

  const removeValue = (optionName: string, value: string) => {
    onOptionsChange(
      options.map((o) => (o.name === optionName ? { ...o, values: o.values.filter((v) => v !== value) } : o)),
    );
    if (variationPhotos.some((p) => p.optionName === optionName && p.optionValue === value)) {
      onVariationPhotosChange(
        variationPhotos.filter((p) => !(p.optionName === optionName && p.optionValue === value)),
      );
    }
  };

  const updateVariantField = (sku: string, field: keyof ProductVariantInput, value: string) => {
    onVariantsChange(
      variants.map((v) => {
        if (v.sku !== sku) return v;
        if (field === 'sku') return { ...v, sku: value };
        const num = value.trim() === '' ? undefined : Number(value);
        return { ...v, [field]: num };
      }),
    );
  };

  const totalStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);

  // The currently selected photo option, re-derived from `options` so it
  // stays valid even if the option list changes underneath it (e.g. the
  // vendor removed "Color" and re-added it).
  const photoOption = photoOptionName ? options.find((o) => o.name === photoOptionName) : undefined;

  const getPhotosFor = (value: string): string[] =>
    variationPhotos.find((p) => p.optionName === photoOptionName && p.optionValue === value)?.photoUrls ?? [];

  const setPhotosFor = (value: string, photoUrls: string[]) => {
    if (!photoOptionName) return;
    const existingIndex = variationPhotos.findIndex(
      (p) => p.optionName === photoOptionName && p.optionValue === value,
    );
    if (existingIndex === -1) {
      onVariationPhotosChange([...variationPhotos, { optionName: photoOptionName, optionValue: value, photoUrls }]);
      return;
    }
    onVariationPhotosChange(
      variationPhotos.map((p, i) => (i === existingIndex ? { ...p, photoUrls } : p)),
    );
  };

  const removePhotoUrl = (value: string, url: string) => {
    setPhotosFor(value, getPhotosFor(value).filter((u) => u !== url));
  };

  const handlePhotoFilesSelected = (value: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const key = `${photoOptionName}:${value}`;
    const validFiles = Array.from(files).filter((f) => /^image\/(jpe?g|png|webp|gif)$/.test(f.type));
    if (validFiles.length === 0) return;

    setUploadingKey(key);
    Promise.all(validFiles.map((file) => productsApi.uploadPhoto(file)))
      .then((results) => {
        setPhotosFor(value, [...getPhotosFor(value), ...results.map((r) => r.url)]);
      })
      .finally(() => {
        setUploadingKey((k) => (k === key ? null : k));
      });
  };

  // Options that can have photos assigned — any variation option with at
  // least one value. Most stores pick "Color" here, but any option works.
  const photoEligibleOptions = options.filter((o) => o.values.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-regantify-text mb-2">Add Variation:</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addOption('Size')}
            disabled={options.some((o) => o.name === 'Size')}
            className="px-4 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Size
          </button>
          <button
            type="button"
            onClick={() => addOption('Color')}
            disabled={options.some((o) => o.name === 'Color')}
            className="px-4 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Color
          </button>
          <button
            type="button"
            onClick={() => setAddingCustom(true)}
            className="px-4 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content"
          >
            Custom
          </button>
        </div>
        {addingCustom && (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="ie. Material"
              className={productInputClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) {
                  addOption(customName.trim());
                  setCustomName('');
                  setAddingCustom(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (customName.trim()) addOption(customName.trim());
                setCustomName('');
                setAddingCustom(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium whitespace-nowrap"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {options.length > 0 && (
        <div className="rounded-xl border border-black/10 divide-y divide-black/10">
          {options.map((option) => (
            <div key={option.name} className="flex items-start gap-3 p-3">
              <button
                type="button"
                onClick={() => removeOption(option.name)}
                className="mt-1 text-regantify-text-muted hover:text-red-600"
                title="Remove variation"
              >
                <X size={16} />
              </button>
              <div className="w-20 shrink-0 pt-1 text-sm font-medium text-regantify-text">{option.name}</div>
              <div className="flex-1 flex flex-wrap items-center gap-1.5">
                {option.values.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-regantify-black text-white text-xs font-medium"
                  >
                    {value}
                    <button type="button" onClick={() => removeValue(option.name, value)}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={valueInputs[option.name] ?? ''}
                    onChange={(e) => setValueInputs((prev) => ({ ...prev, [option.name]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addValue(option.name);
                      }
                    }}
                    placeholder="Add value"
                    className="px-2.5 py-1 rounded-lg bg-regantify-search text-xs text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none w-24"
                  />
                  <button type="button" onClick={() => addValue(option.name)} className="text-regantify-text-muted hover:text-regantify-text">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {photoEligibleOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-regantify-text">Variation Photos</p>
            <span className="text-xs text-regantify-text-muted">— give each value its own photos (e.g. per Color)</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-regantify-text-muted shrink-0">Photos by:</label>
            <select
              value={photoOptionName ?? ''}
              onChange={(e) => {
                setPhotoOptionName(e.target.value || null);
                setPhotoOptionTouched(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-sm text-regantify-text"
            >
              <option value="">— Select a variation —</option>
              {photoEligibleOptions.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {photoOption && (
            <div className="rounded-xl border border-black/10 divide-y divide-black/10">
              {photoOption.values.map((value) => {
                const photos = getPhotosFor(value);
                const key = `${photoOptionName}:${value}`;
                const isUploading = uploadingKey === key;
                return (
                  <div key={value} className="flex items-start gap-3 p-3">
                    <div className="w-24 shrink-0 pt-1.5 text-sm font-medium text-regantify-text truncate">
                      {value}
                    </div>
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      {photos.map((url) => (
                        <div
                          key={url}
                          className="relative w-14 h-14 rounded-lg overflow-hidden bg-regantify-content border border-black/5"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhotoUrl(value, url)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[key]?.click()}
                        disabled={isUploading}
                        className="w-14 h-14 rounded-lg border-2 border-dashed border-black/15 bg-regantify-content
                          flex items-center justify-center text-regantify-text-muted hover:border-black/25 disabled:opacity-50"
                        title={`Add photos for ${value}`}
                      >
                        {isUploading ? (
                          <div className="w-4 h-4 border-2 border-regantify-text-muted border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera size={16} />
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[key] = el;
                        }}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          handlePhotoFilesSelected(value, e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <p className="text-sm font-medium text-regantify-text mb-2">Variation Stocks</p>
          <div className="overflow-x-auto rounded-xl border border-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-regantify-text-muted">
                  <th className="px-3 py-2.5 font-medium">SKU</th>
                  <th className="px-3 py-2.5 font-medium">Stock</th>
                  <th className="px-3 py-2.5 font-medium">List Price</th>
                  <th className="px-3 py-2.5 font-medium">Discount Price</th>
                  <th className="px-3 py-2.5 font-medium">Cost</th>
                  <th className="px-3 py-2.5 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.sku} className="border-t border-black/5">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariantField(v.sku, 'sku', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.stock ?? ''}
                        onChange={(e) => updateVariantField(v.sku, 'stock', e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.listPrice ?? ''}
                        onChange={(e) => updateVariantField(v.sku, 'listPrice', e.target.value)}
                        placeholder="Variation price"
                        className="w-28 px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.discountPrice ?? ''}
                        onChange={(e) => updateVariantField(v.sku, 'discountPrice', e.target.value)}
                        placeholder="Variation price"
                        className="w-28 px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={v.cost ?? ''}
                        onChange={(e) => updateVariantField(v.sku, 'cost', e.target.value)}
                        placeholder="Cost"
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={v.weight ?? ''}
                          onChange={(e) => updateVariantField(v.sku, 'weight', e.target.value)}
                          placeholder="ie. 100"
                          className="w-20 px-2.5 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                        />
                        <span className="text-xs text-regantify-text-muted">{weightUnit}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-regantify-text-muted text-right mt-1.5">Total Stock: {totalStock}</p>
        </div>
      )}
    </div>
  );
}
