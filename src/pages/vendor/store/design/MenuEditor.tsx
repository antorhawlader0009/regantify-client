import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { StoreMenuItem, StoreMenuItemType, StoreMenuOtherTarget } from '../../../../lib/designSettingsApi';
import { pagesApi } from '../../../../lib/pagesApi';
import { productsApi } from '../../../../lib/productsApi';
import { categoriesApi } from '../../../../lib/categoriesApi';
import { brandsApi } from '../../../../lib/brandsApi';

type SourceType = Exclude<StoreMenuItemType, 'CUSTOM'>;

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'PAGE', label: 'Page' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'CATEGORY', label: 'Category' },
  { value: 'BRAND', label: 'Brand' },
  { value: 'OTHER', label: 'Other' },
];

const OTHER_TARGETS: { value: StoreMenuOtherTarget; label: string }[] = [
  { value: 'ACCOUNT', label: 'My Account' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'TRACK_ORDER', label: 'Track Order' },
];

const TYPE_LABEL: Record<StoreMenuItemType, string> = {
  PAGE: 'Page',
  PRODUCT: 'Product',
  CATEGORY: 'Category',
  BRAND: 'Brand',
  OTHER: 'Other',
  CUSTOM: 'Custom link',
};

interface Candidate {
  label: string;
  value: string;
}

/**
 * Add/remove/reorder editor for one Store > Design menu (Site Menu,
 * header left/right, mobile). Items are picked from the vendor's own
 * pages/products/categories/brands (or a built-in page via "Other"), or
 * added as a custom link. Reorder is @dnd-kit, same as Store > Footer's
 * FooterLinkListEditor.
 */
export function MenuEditor({ items, onChange }: { items: StoreMenuItem[]; onChange: (items: StoreMenuItem[]) => void }) {
  const [sourceType, setSourceType] = useState<SourceType>('PAGE');
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const candidates = useMenuCandidates(sourceType, search, pickerOpen);

  const add = (item: Omit<StoreMenuItem, 'id'>) => {
    onChange([...items, { ...item, id: crypto.randomUUID() }]);
    setSearch('');
    setPickerOpen(false);
  };

  const update = (id: string, patch: Partial<StoreMenuItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(items, from, to));
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  onChange={(patch) => update(item.id, patch)}
                  onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-start gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <div className="flex rounded-xl border border-black/10 overflow-hidden focus-within:border-regantify-cta">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickerOpen(true);
              }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              placeholder={sourceType === 'OTHER' ? 'Pick a page to add' : `Search ${TYPE_LABEL[sourceType].toLowerCase()}(s) to add`}
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
            <select
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value as SourceType);
                setSearch('');
              }}
              className="border-l border-black/10 px-3 text-sm text-regantify-text bg-white focus:outline-none"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {pickerOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto bg-white rounded-xl border border-black/10 shadow-lg py-1">
              {candidates.isLoading ? (
                <p className="px-4 py-2.5 text-sm text-regantify-text-muted">Loading…</p>
              ) : candidates.items.length === 0 ? (
                <p className="px-4 py-2.5 text-sm text-regantify-text-muted">Nothing found.</p>
              ) : (
                candidates.items.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    // onMouseDown so it fires before the input's onBlur closes the list.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add({ label: c.label, type: sourceType, value: c.value });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-regantify-text hover:bg-regantify-content"
                  >
                    {c.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <span className="py-2.5 text-xs text-regantify-text-muted">OR</span>
        <button
          type="button"
          onClick={() => add({ label: '', type: 'CUSTOM', value: '' })}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/15 text-sm text-regantify-text hover:bg-regantify-content"
        >
          <Plus size={14} />
          Add Custom Link
        </button>
      </div>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Select the &lsquo;Other&rsquo; option to add &lsquo;My Account&rsquo;, &lsquo;Shop&rsquo; or &lsquo;Track Order&rsquo; pages.
      </p>
    </div>
  );
}

function MenuRow({
  item,
  onChange,
  onRemove,
}: {
  item: StoreMenuItem;
  onChange: (patch: Partial<StoreMenuItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const target =
    item.type === 'OTHER' ? OTHER_TARGETS.find((t) => t.value === item.value)?.label ?? item.value : item.value;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2 ${isDragging ? 'z-10 opacity-80 shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="shrink-0 cursor-grab touch-none rounded p-1 text-regantify-text-muted hover:text-regantify-text active:cursor-grabbing"
        aria-label="Reorder menu item"
      >
        <GripVertical size={14} />
      </button>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label"
        maxLength={60}
        className="w-1/3 min-w-0 px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
          placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
      />
      {item.type === 'CUSTOM' ? (
        <input
          type="text"
          value={item.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="https://… or /page/about-us"
          maxLength={500}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
            placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-sm text-regantify-text-muted">
          <span className="text-[11px] uppercase tracking-wide mr-1.5">{TYPE_LABEL[item.type]}</span>
          {target}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1.5 text-regantify-text-muted hover:text-red-500 transition-colors"
        aria-label="Remove menu item"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/** The pickable items for one source type, filtered by the search text. Only fetches once the picker opens. */
function useMenuCandidates(type: SourceType, search: string, enabled: boolean): { items: Candidate[]; isLoading: boolean } {
  const q = search.trim().toLowerCase();
  const pages = useQuery({ queryKey: ['pages', ''], queryFn: () => pagesApi.list(), enabled: enabled && type === 'PAGE' });
  const categories = useQuery({
    queryKey: ['categories', 'PUBLIC'],
    queryFn: () => categoriesApi.list('PUBLIC'),
    enabled: enabled && type === 'CATEGORY',
  });
  const brands = useQuery({ queryKey: ['brands', ''], queryFn: () => brandsApi.list(), enabled: enabled && type === 'BRAND' });
  const products = useQuery({
    queryKey: ['menu-products', q],
    queryFn: () => productsApi.list({ search: q || undefined, visibility: 'PUBLIC', perPage: 10 }),
    enabled: enabled && type === 'PRODUCT',
  });

  return useMemo(() => {
    const match = (label: string) => !q || label.toLowerCase().includes(q);
    switch (type) {
      case 'PAGE':
        return {
          isLoading: pages.isLoading,
          items: (pages.data ?? [])
            .filter((p) => p.status === 'PUBLISHED' && match(p.title))
            .map((p) => ({ label: p.title, value: p.slug })),
        };
      case 'CATEGORY':
        return {
          isLoading: categories.isLoading,
          items: (categories.data ?? []).filter((c) => match(c.name)).map((c) => ({ label: c.name, value: c.name })),
        };
      case 'BRAND':
        return {
          isLoading: brands.isLoading,
          items: (brands.data ?? []).filter((b) => match(b.name)).map((b) => ({ label: b.name, value: b.name })),
        };
      case 'PRODUCT':
        return {
          isLoading: products.isLoading,
          items: (products.data?.products ?? []).map((p) => ({ label: p.name, value: p.slug })),
        };
      case 'OTHER':
        return { isLoading: false, items: OTHER_TARGETS.filter((t) => match(t.label)) };
    }
  }, [type, q, pages.data, pages.isLoading, categories.data, categories.isLoading, brands.data, brands.isLoading, products.data, products.isLoading]);
}
