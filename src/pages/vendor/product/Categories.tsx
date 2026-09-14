import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, ChevronDown, GripVertical } from 'lucide-react';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { SubcategoriesModal } from './SubcategoriesModal';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

// Two distinct drag payload types on the same table so a row's onDrop can
// tell "reorder these two main categories" apart from "reparent this
// subcategory chip onto this main".
const MAIN_DRAG_TYPE = 'application/x-main-category-id';
const SUB_DRAG_TYPE = 'application/x-sub-category-id';

/** Every descendant of `parentId`, at any depth, flattened — so a
 * category nested more than one level deep still shows up as a chip on
 * its top-level ancestor's row instead of silently disappearing from
 * this (deliberately 2-column, not tree-indented) layout. */
function getDescendants(categories: Category[], parentId: string): Category[] {
  const direct = categories.filter((c) => c.parentId === parentId);
  return direct.flatMap((c) => [c, ...getDescendants(categories, c.id)]);
}

function ActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu
      trigger={
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
          Actions
          <ChevronDown size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addingSubcategoryFor, setAddingSubcategoryFor] = useState<Category | null>(null);
  const [dragOverMainId, setDragOverMainId] = useState<string | null>(null);
  // Optimistic main-category order while a drag's reorder request is in
  // flight — cleared once the mutation settles and refetched data (with
  // real persisted positions) takes over.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted.');
    },
    onError: () => toast.error('Could not delete the category. Please try again.'),
  });

  const reparentMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string }) => categoriesApi.update(id, { parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory moved.');
    },
    onError: () => toast.error('Could not move the subcategory. Please try again.'),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => categoriesApi.reorder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => toast.error('Could not save the new order. Please try again.'),
    onSettled: () => setOrderOverride(null),
  });

  const rawMainCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const mainCategories = useMemo(() => {
    if (!orderOverride) return rawMainCategories;
    const byId = new Map(rawMainCategories.map((m) => [m.id, m]));
    const ordered = orderOverride.map((id) => byId.get(id)).filter((m): m is Category => !!m);
    const missing = rawMainCategories.filter((m) => !orderOverride.includes(m.id));
    return [...ordered, ...missing];
  }, [rawMainCategories, orderOverride]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mainCategories.filter((main) => {
      if (visibilityFilter !== 'ALL' && main.visibility !== visibilityFilter) return false;
      if (!query) return true;
      const subcategories = getDescendants(categories, main.id);
      return (
        main.name.toLowerCase().includes(query) ||
        subcategories.some((sub) => sub.name.toLowerCase().includes(query))
      );
    });
  }, [mainCategories, categories, visibilityFilter, search]);

  const handleDelete = (id: string, name: string) => {
    // A category with subcategories can't be deleted out from under them —
    // move or delete every child first, or they'd be silently orphaned.
    if (categories.some((c) => c.parentId === id)) {
      toast.error(`Move or delete "${name}"'s subcategories first.`);
      return;
    }
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleDropOnMain = (targetMainId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverMainId(null);

    const draggedMainId = e.dataTransfer.getData(MAIN_DRAG_TYPE);
    if (draggedMainId) {
      if (draggedMainId === targetMainId) return;
      const baseOrder = orderOverride ?? mainCategories.map((m) => m.id);
      const from = baseOrder.indexOf(draggedMainId);
      const to = baseOrder.indexOf(targetMainId);
      if (from === -1 || to === -1) return;
      const next = [...baseOrder];
      next.splice(from, 1);
      next.splice(to, 0, draggedMainId);
      setOrderOverride(next);
      reorderMutation.mutate(next);
      return;
    }

    const subId = e.dataTransfer.getData(SUB_DRAG_TYPE);
    if (!subId) return;
    const sub = categories.find((c) => c.id === subId);
    if (!sub || sub.parentId === targetMainId) return;
    reparentMutation.mutate({ id: subId, parentId: targetMainId });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Categories</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product category"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-black/10 text-sm
              text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
          />
        </div>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
          className="px-4 py-2.5 rounded-xl bg-white border border-black/10 text-sm text-regantify-text focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-5 py-3 font-medium">MAIN CATEGORIES</th>
              <th className="px-5 py-3 font-medium">SUB CATEGORIES</th>
              <th className="px-5 py-3 font-medium">VISIBILITY</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                  No categories yet.
                </td>
              </tr>
            )}
            {filtered.map((main) => {
              const subcategories = getDescendants(categories, main.id);

              return (
                <tr
                  key={main.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverMainId(main.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverMainId((prev) => (prev === main.id ? null : prev));
                  }}
                  onDrop={(e) => handleDropOnMain(main.id, e)}
                  className={`border-t border-black/5 align-top transition-colors ${
                    dragOverMainId === main.id ? 'bg-regantify-cta/10 ring-2 ring-inset ring-regantify-cta' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(MAIN_DRAG_TYPE, main.id);
                          e.dataTransfer.effectAllowed = 'move';
                          // The grip icon alone is the draggable element, but the
                          // ghost image shown while dragging should be the whole
                          // icon+name group, not just the tiny icon.
                          const preview = e.currentTarget.parentElement;
                          if (preview) e.dataTransfer.setDragImage(preview, 10, 14);
                        }}
                        title="Drag to reorder"
                        className="text-regantify-text-muted/50 hover:text-regantify-text-muted cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical size={14} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(main)}
                        className="text-regantify-cta font-medium hover:underline"
                      >
                        {main.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {subcategories.map((sub) => (
                        <span
                          key={sub.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(SUB_DRAG_TYPE, sub.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          title={`Drag "${sub.name}" onto another main category to move it there`}
                          className="inline-flex items-center gap-1.5 bg-regantify-black text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full cursor-grab active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            onClick={() => setEditingCategory(sub)}
                            className="hover:underline"
                            title={`Edit ${sub.name}`}
                          >
                            {sub.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, sub.name)}
                            className="hover:opacity-70"
                            title={`Remove ${sub.name}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <button
                        type="button"
                        onClick={() => setAddingSubcategoryFor(main)}
                        title="Add subcategory"
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-black/15
                          text-regantify-text-muted hover:bg-regantify-content"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        main.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-regantify-content text-regantify-text-muted'
                      }`}
                    >
                      {main.visibility}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ActionsMenu
                      onEdit={() => setEditingCategory(main)}
                      onDelete={() => handleDelete(main.id, main.name)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        // "Add New" here always creates a Main Category, which has no parent.
        <AddCategoryModal categories={categories} hideParentField onClose={() => setShowAddModal(false)} />
      )}

      {editingCategory && (
        <AddCategoryModal
          categories={categories}
          editingCategory={editingCategory}
          hideParentField={!editingCategory.parentId}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {addingSubcategoryFor && (
        <SubcategoriesModal
          mainCategory={addingSubcategoryFor}
          categories={categories}
          onClose={() => setAddingSubcategoryFor(null)}
        />
      )}
    </div>
  );
}
