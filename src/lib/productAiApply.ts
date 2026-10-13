import type { ProductVariantInput, VariationOptionInput, VariationValuePhotoInput } from './productsApi';
import type { ProductChatCategory, ProductChatForm, ProductChatOp, ProductChatPhoto, ProductChatVariant, SetFieldName } from './productAiChatApi';

/** A photo of the product as the page holds it. `url` is the uploaded address ('' while it is still uploading). */
export interface AiPhoto {
  id: string;
  url: string;
  previewUrl: string;
}

/** The values of the open Add/Edit Product form that the AI chat can read and change. */
export interface AiFormValues {
  name: string;
  description: string;
  summary: string;
  price: string;
  discountPrice: string;
  cost: string;
  stockQuantity: string;
  sku: string;
  barcode: string;
  weight: string;
  weightUnit: 'KG' | 'G' | 'LB';
  brand: string;
  metaTitle: string;
  metaDescription: string;
  searchKeywords: string[];
  visibility: 'PUBLIC' | 'DRAFT';
  videoUrl: string;
  badge: string;
  minOrder: string;
  maxOrder: string;
  maxPerPhone: string;
  lowStockAlert: string;
  preOrder: boolean;
  note: string;
  variationOptions: VariationOptionInput[];
  variants: ProductVariantInput[];
  variationPhotos: VariationValuePhotoInput[];
  categoryId: string;
  category: string;
  isBundle: boolean;
  photos: AiPhoto[];
}

export interface AiFormSetters {
  name: (v: string) => void;
  description: (v: string) => void;
  summary: (v: string) => void;
  price: (v: string) => void;
  discountPrice: (v: string) => void;
  cost: (v: string) => void;
  stockQuantity: (v: string) => void;
  sku: (v: string) => void;
  barcode: (v: string) => void;
  weight: (v: string) => void;
  weightUnit: (v: 'KG' | 'G' | 'LB') => void;
  brand: (v: string) => void;
  metaTitle: (v: string) => void;
  metaDescription: (v: string) => void;
  searchKeywords: (v: string[]) => void;
  visibility: (v: 'PUBLIC' | 'DRAFT') => void;
  videoUrl: (v: string) => void;
  badge: (v: string) => void;
  minOrder: (v: string) => void;
  maxOrder: (v: string) => void;
  maxPerPhone: (v: string) => void;
  lowStockAlert: (v: string) => void;
  preOrder: (v: boolean) => void;
  note: (v: string) => void;
  variationOptions: (v: VariationOptionInput[]) => void;
  variants: (v: ProductVariantInput[]) => void;
  variationPhotos: (v: VariationValuePhotoInput[]) => void;
  /** The product's one category: the sub category when there is one, else the main category. */
  category: (id: string, name: string) => void;
}

export interface AiFormAccess {
  values: AiFormValues;
  set: AiFormSetters;
  categories: { id: string; name: string; parentId?: string | null }[];
  photos: {
    /** Keeps only these photos, in this order (the ones left out are removed from the product). */
    setOrder: (ids: string[]) => void;
    /** Everything needed to put the photo list back exactly as it was. */
    snapshot: () => unknown;
    restore: (snapshot: unknown) => void;
  };
}

export interface AiApplyResult {
  /** Names of the things that were changed, for the chat ("Price", "Variations"...). */
  labels: string[];
  /** Said under the answer when part of what the seller asked could not go into the form. */
  notes: string[];
  /** Puts every changed thing back as it was before this answer. */
  undo: () => void;
}

/** The photos as the assistant names them (P1 is the cover), the ref map for applying its answer, and which were added in the chat (new). */
export function photoRefs(photos: AiPhoto[], newIds: Set<string>, notes: Map<string, string>): { list: ProductChatPhoto[]; map: Record<string, AiPhoto> } {
  const map: Record<string, AiPhoto> = {};
  const list: ProductChatPhoto[] = [];
  photos.forEach((p, i) => {
    const ref = `P${i + 1}`;
    map[ref] = p;
    // A photo still uploading has no address to look at yet; the chat does not send while one is uploading.
    if (!p.url) return;
    list.push({ ref, url: p.url, isNew: newIds.has(p.id), note: notes.get(p.url) || undefined });
  });
  return { list, map };
}

/** The open form as text for the assistant, including the variations table with each row's photo ref. */
export function buildAiForm(values: AiFormValues, categories: AiFormAccess['categories'], refMap: Record<string, AiPhoto>, htmlToText: (html: string) => string): ProductChatForm {
  const byUrl = new Map<string, string>();
  for (const [ref, p] of Object.entries(refMap)) if (p.url && !byUrl.has(p.url)) byUrl.set(p.url, ref);
  const photoOption = values.variationPhotos.find((p) => p.photoUrls.length > 0)?.optionName;
  const sel = categories.find((c) => c.id === values.categoryId);
  const main = sel ? (sel.parentId ? categories.find((c) => c.id === sel.parentId) : sel) : undefined;
  const sub = sel?.parentId ? sel : undefined;
  const variants: ProductChatVariant[] = values.variants.map((v) => {
    const url = photoOption ? values.variationPhotos.find((p) => p.optionName === photoOption && p.optionValue === v.optionValues[photoOption])?.photoUrls[0] : undefined;
    return {
      options: v.optionValues,
      stock: v.stock !== undefined ? String(v.stock) : undefined,
      price: v.listPrice !== undefined ? String(v.listPrice) : undefined,
      salePrice: v.discountPrice !== undefined ? String(v.discountPrice) : undefined,
      cost: v.cost !== undefined ? String(v.cost) : undefined,
      sku: v.sku || undefined,
      barcode: v.barcode || undefined,
      weight: v.weight !== undefined ? String(v.weight) : undefined,
      photo: url ? byUrl.get(url) : undefined,
    };
  });
  return {
    name: values.name,
    description: htmlToText(values.description).slice(0, 2500),
    summary: htmlToText(values.summary).slice(0, 800),
    price: values.price,
    discountPrice: values.discountPrice,
    cost: values.cost,
    sku: values.sku,
    barcode: values.barcode,
    stockQuantity: values.stockQuantity,
    weight: values.weight,
    weightUnit: values.weightUnit,
    category: main?.name ?? '',
    subCategory: sub?.name ?? '',
    brand: values.brand,
    metaTitle: values.metaTitle,
    metaDescription: values.metaDescription,
    visibility: values.visibility,
    videoUrl: values.videoUrl,
    badge: values.badge,
    minOrder: values.minOrder,
    maxOrder: values.maxOrder,
    maxPerPhone: values.maxPerPhone,
    lowStockAlert: values.lowStockAlert,
    preOrder: values.preOrder,
    note: values.note.slice(0, 1000),
    searchKeywords: values.searchKeywords,
    variations: values.variationOptions.map((o) => ({ name: o.name, values: o.values })),
    variants,
    photoOption,
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

/** Every combination of each option's values (the same rule as the Variations table). */
function combinations(options: VariationOptionInput[]): Record<string, string>[] {
  if (options.length === 0) return [];
  return options.reduce<Record<string, string>[]>((acc, o) => acc.flatMap((combo) => o.values.map((value) => ({ ...combo, [o.name]: value }))), [{}]);
}

const FIELD_LABEL: Record<SetFieldName, string> = {
  name: 'Name',
  description: 'Description',
  summary: 'Short summary',
  price: 'Price',
  discountPrice: 'Sale price',
  cost: 'Cost',
  stockQuantity: 'Stock',
  sku: 'SKU',
  barcode: 'Barcode',
  weight: 'Weight',
  weightUnit: 'Weight',
  category: 'Category',
  subCategory: 'Category',
  brand: 'Brand',
  metaTitle: 'Search listing',
  metaDescription: 'Search listing',
  visibility: 'Status',
  videoUrl: 'Video link',
  badge: 'Badge',
  minOrder: 'Minimum order',
  maxOrder: 'Most per order',
  maxPerPhone: 'Most per phone',
  lowStockAlert: 'Low stock alert',
  preOrder: 'Pre-order',
  note: 'Internal note',
};

/**
 * Puts the assistant's checked edits into the open form. The page passes its current values and setters, so the same code serves
 * Add Product and Edit Product. Nothing is saved: the seller still presses Save. Options, variants and variation photos are worked
 * out together on a copy and written once at the end (the Variations table then finds its rows already in place); the photo list
 * is changed through the page. `refs` maps the photo names the assistant used (P1, P2...) to the photos as they were when the
 * message was sent. Returns what changed, what could not be done, and an undo for all of it.
 */
export function applyProductAiOps(ops: ProductChatOp[], refs: Record<string, AiPhoto>, access: AiFormAccess): AiApplyResult {
  const { values: v, set, categories } = access;
  const labels: string[] = [];
  const notes: string[] = [];
  const label = (l: string) => {
    if (!labels.includes(l)) labels.push(l);
  };

  // The variations as a working copy.
  let options: VariationOptionInput[] = v.variationOptions.map((o) => ({ name: o.name, values: [...o.values] }));
  let variants: ProductVariantInput[] = v.variants.map((x) => ({ ...x, optionValues: { ...x.optionValues } }));
  let varPhotos: VariationValuePhotoInput[] = v.variationPhotos.map((x) => ({ ...x, photoUrls: [...x.photoUrls] }));
  let photoIds = v.photos.map((p) => p.id);
  let sku = v.sku;
  let stockQuantity = v.stockQuantity;
  let structure = false;
  let photosChanged = false;
  let targetCategoryId: string | null = null;
  const photoSnapshot = access.photos.snapshot();
  const touched = new Set<keyof AiFormSetters>();

  const sync = () => {
    structure = true;
    if (options.length === 0) {
      variants = [];
      return;
    }
    const names = options.map((o) => o.name);
    variants = combinations(options).map(
      (combo) =>
        variants.find((x) => names.every((n) => x.optionValues[n] === combo[n])) ?? {
          sku: [slug(sku), ...names.map((n) => slug(combo[n]))].filter(Boolean).join('-'),
          optionValues: combo,
          stock: 0,
        },
    );
  };
  const matching = (combo: Record<string, string>) => variants.filter((x) => Object.entries(combo).every(([k, val]) => x.optionValues[k] === val));
  const photoUrl = (ref: string) => refs[ref]?.url ?? '';

  const assignPhoto = (optionName: string, value: string, url: string) => {
    if (!url) {
      notes.push('A photo was still uploading, so I could not attach it to a variation yet. Ask me again in a moment.');
      return;
    }
    if (varPhotos.some((p) => p.optionName !== optionName && p.photoUrls.length > 0)) {
      varPhotos = varPhotos.filter((p) => p.optionName === optionName);
      notes.push(`Variation photos are now grouped by ${optionName}.`);
    }
    let entry = varPhotos.find((p) => p.optionName === optionName && p.optionValue === value);
    if (!entry) {
      entry = { optionName, optionValue: value, photoUrls: [] };
      varPhotos.push(entry);
    }
    if (!entry.photoUrls.includes(url)) entry.photoUrls.push(url);
    structure = true;
    label('Variation photos');
  };

  const applyVariantData = (op: Extract<ProductChatOp, { op: 'add_variant' | 'update_variant' }>) => {
    const rows = matching(op.combo);
    if (rows.length === 0) {
      notes.push('I could not find that variation in the table.');
      return;
    }
    const d = op.data;
    for (const row of rows) {
      if (d.price !== undefined) row.listPrice = Number(d.price);
      if (d.salePrice !== undefined) row.discountPrice = Number(d.salePrice);
      if (d.cost !== undefined) row.cost = Number(d.cost);
      if (d.stock !== undefined) row.stock = Number(d.stock);
      if (d.weight !== undefined) row.weight = Number(d.weight);
      if (d.sku !== undefined) row.sku = d.sku;
      if (d.barcode !== undefined) row.barcode = d.barcode;
    }
    structure = true;
    label('Variations');
    if (op.photo) {
      const optionName = op.photoOption && options.some((o) => o.name === op.photoOption) ? op.photoOption : Object.keys(op.combo)[0];
      const seen = new Set<string>();
      for (const row of rows) {
        const value = row.optionValues[optionName];
        if (value && !seen.has(value)) {
          seen.add(value);
          assignPhoto(optionName, value, photoUrl(op.photo));
        }
      }
    }
  };

  const setField = (field: SetFieldName, value: string) => {
    switch (field) {
      case 'name':
        set.name(value);
        break;
      case 'description':
        set.description(value);
        break;
      case 'summary':
        set.summary(value);
        break;
      case 'price':
        set.price(value);
        break;
      case 'discountPrice':
        set.discountPrice(value);
        break;
      case 'cost':
        set.cost(value);
        break;
      case 'stockQuantity':
        if (options.length > 0) {
          notes.push('Stock is set for each size or colour in the Variations table below.');
          return;
        }
        stockQuantity = value;
        set.stockQuantity(value);
        break;
      case 'sku':
        sku = value;
        set.sku(value);
        break;
      case 'barcode':
        set.barcode(value);
        break;
      case 'weight':
        set.weight(value);
        break;
      case 'weightUnit':
        set.weightUnit(value as 'KG' | 'G' | 'LB');
        break;
      case 'brand':
        set.brand(value);
        break;
      case 'metaTitle':
        set.metaTitle(value);
        break;
      case 'metaDescription':
        set.metaDescription(value);
        break;
      case 'visibility':
        set.visibility(value as 'PUBLIC' | 'DRAFT');
        break;
      case 'videoUrl':
        set.videoUrl(value);
        break;
      case 'badge':
        set.badge(value);
        break;
      case 'minOrder':
        set.minOrder(value);
        break;
      case 'maxOrder':
        set.maxOrder(value);
        break;
      case 'maxPerPhone':
        set.maxPerPhone(value);
        break;
      case 'lowStockAlert':
        set.lowStockAlert(value);
        break;
      case 'preOrder':
        set.preOrder(value === 'true');
        break;
      case 'note':
        set.note(value);
        break;
      case 'category': {
        const main = categories.find((c) => !c.parentId && c.name === value);
        if (main) targetCategoryId = main.id;
        else return;
        break;
      }
      case 'subCategory': {
        const current = targetCategoryId ?? v.categoryId;
        const parentId = categories.find((c) => c.id === current)?.parentId ?? current;
        const sub = categories.find((c) => c.parentId === parentId && c.name === value);
        if (sub) targetCategoryId = sub.id;
        else return;
        break;
      }
    }
    touched.add(field === 'category' || field === 'subCategory' ? 'category' : (field as keyof AiFormSetters));
    label(FIELD_LABEL[field]);
  };

  for (const op of ops) {
    switch (op.op) {
      case 'set':
        setField(op.field, op.value);
        break;
      case 'add_words': {
        const seen = new Set(v.searchKeywords.map((w) => w.toLowerCase()));
        const merged = [...v.searchKeywords];
        for (const w of op.values) {
          if (merged.length >= 20) break;
          if (!seen.has(w.toLowerCase())) {
            seen.add(w.toLowerCase());
            merged.push(w);
          }
        }
        if (merged.length !== v.searchKeywords.length) {
          set.searchKeywords(merged);
          touched.add('searchKeywords');
          label('Search words');
        }
        break;
      }
      case 'set_options': {
        options = op.optionList.map((o) => ({ name: o.name, values: [...o.values] }));
        varPhotos = varPhotos.filter((p) => options.some((o) => o.name === p.optionName && o.values.includes(p.optionValue)));
        sync();
        label('Variations');
        break;
      }
      case 'add_value': {
        const o = options.find((x) => x.name === op.option);
        if (o && !o.values.includes(op.value)) {
          o.values.push(op.value);
          sync();
          label('Variations');
        }
        break;
      }
      case 'rename_value': {
        const o = options.find((x) => x.name === op.option);
        if (!o) break;
        o.values = o.values.map((x) => (x === op.value ? op.to : x));
        for (const row of variants) if (row.optionValues[op.option] === op.value) row.optionValues[op.option] = op.to;
        for (const p of varPhotos) if (p.optionName === op.option && p.optionValue === op.value) p.optionValue = op.to;
        structure = true;
        label('Variations');
        break;
      }
      case 'rename_option': {
        const o = options.find((x) => x.name === op.option);
        if (!o) break;
        o.name = op.to;
        for (const row of variants) {
          row.optionValues[op.to] = row.optionValues[op.option];
          delete row.optionValues[op.option];
        }
        for (const p of varPhotos) if (p.optionName === op.option) p.optionName = op.to;
        structure = true;
        label('Variations');
        break;
      }
      case 'remove_value': {
        const o = options.find((x) => x.name === op.option);
        if (!o) break;
        o.values = o.values.filter((x) => x !== op.value);
        varPhotos = varPhotos.filter((p) => !(p.optionName === op.option && p.optionValue === op.value));
        if (o.values.length === 0) options = options.filter((x) => x !== o);
        sync();
        label('Variations');
        break;
      }
      case 'remove_option':
        options = options.filter((x) => x.name !== op.option);
        varPhotos = varPhotos.filter((p) => p.optionName !== op.option);
        sync();
        label('Variations');
        break;
      case 'add_variant': {
        if (options.length === 0) {
          // The product has no variations: it becomes the first variant, and the new one is the second.
          const [name, value] = Object.entries(op.combo)[0];
          const base = op.base || 'Original';
          options = [{ name, values: [base, value] }];
          sync();
          const first = variants.find((x) => x.optionValues[name] === base);
          const n = Number(stockQuantity);
          if (first && stockQuantity.trim() !== '' && Number.isFinite(n)) first.stock = n;
          notes.push(`Your current product is now the variant "${base}", and the new one is "${value}". Rename them if you like.`);
        } else {
          for (const [name, value] of Object.entries(op.combo)) {
            const o = options.find((x) => x.name === name);
            if (o && !o.values.includes(value)) {
              o.values.push(value);
              sync();
            }
          }
        }
        applyVariantData(op);
        break;
      }
      case 'update_variant': {
        for (const [name, value] of Object.entries(op.combo)) {
          const o = options.find((x) => x.name === name);
          if (o && !o.values.includes(value)) {
            o.values.push(value);
            sync();
          }
        }
        applyVariantData(op);
        break;
      }
      case 'assign_photo':
        assignPhoto(op.option, op.value, photoUrl(op.photo));
        break;
      case 'remove_photo': {
        const p = refs[op.photo];
        if (!p) break;
        photoIds = photoIds.filter((id) => id !== p.id);
        if (p.url) {
          varPhotos = varPhotos.map((e) => ({ ...e, photoUrls: e.photoUrls.filter((u) => u !== p.url) })).filter((e) => e.photoUrls.length > 0);
          structure = true;
        }
        photosChanged = true;
        label('Photos');
        break;
      }
      case 'make_cover': {
        const p = refs[op.photo];
        if (!p || !photoIds.includes(p.id) || photoIds[0] === p.id) break;
        photoIds = [p.id, ...photoIds.filter((id) => id !== p.id)];
        photosChanged = true;
        label('Photos');
        break;
      }
    }
  }

  if (structure) {
    set.variationOptions(options);
    set.variants(variants);
    set.variationPhotos(varPhotos);
  }
  if (photosChanged) access.photos.setOrder(photoIds);
  if (targetCategoryId) {
    const c = categories.find((x) => x.id === targetCategoryId);
    if (c) set.category(c.id, c.name);
  }

  const undo = () => {
    // Put back only what this answer touched: every setter it used, with the value from before.
    const before: Record<string, () => void> = {
      name: () => set.name(v.name),
      description: () => set.description(v.description),
      summary: () => set.summary(v.summary),
      price: () => set.price(v.price),
      discountPrice: () => set.discountPrice(v.discountPrice),
      cost: () => set.cost(v.cost),
      stockQuantity: () => set.stockQuantity(v.stockQuantity),
      sku: () => set.sku(v.sku),
      barcode: () => set.barcode(v.barcode),
      weight: () => set.weight(v.weight),
      weightUnit: () => set.weightUnit(v.weightUnit),
      brand: () => set.brand(v.brand),
      metaTitle: () => set.metaTitle(v.metaTitle),
      metaDescription: () => set.metaDescription(v.metaDescription),
      visibility: () => set.visibility(v.visibility),
      videoUrl: () => set.videoUrl(v.videoUrl),
      badge: () => set.badge(v.badge),
      minOrder: () => set.minOrder(v.minOrder),
      maxOrder: () => set.maxOrder(v.maxOrder),
      maxPerPhone: () => set.maxPerPhone(v.maxPerPhone),
      lowStockAlert: () => set.lowStockAlert(v.lowStockAlert),
      preOrder: () => set.preOrder(v.preOrder),
      note: () => set.note(v.note),
      searchKeywords: () => set.searchKeywords(v.searchKeywords),
      category: () => set.category(v.categoryId, v.category),
    };
    for (const key of touched) before[key]?.();
    if (structure) {
      set.variationOptions(v.variationOptions);
      set.variants(v.variants);
      set.variationPhotos(v.variationPhotos);
    }
    if (photosChanged) access.photos.restore(photoSnapshot);
  };

  return { labels, notes, undo };
}
