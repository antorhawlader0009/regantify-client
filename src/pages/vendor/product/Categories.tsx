import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, ChevronDown } from 'lucide-react';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { SubcategoriesModal } from './SubcategoriesModal';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

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

  const mainCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

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
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
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
                <tr key={main.id} className="border-t border-black/5 align-top">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(main)}
                      className="text-regantify-cta font-medium hover:underline"
                    >
                      {main.name}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {subcategories.map((sub) => (
                        <span
                          key={sub.id}
                          className="inline-flex items-center gap-1.5 bg-regantify-black text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
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
        <AddCategoryModal categories={categories} onClose={() => setShowAddModal(false)} />
      )}

      {editingCategory && (
        <AddCategoryModal
          categories={categories}
          editingCategory={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {addingSubcategoryFor && (
        <SubcategoriesModal
          mainCategory={addingSubcategoryFor}
          categories={categories}
          onClose={() => setAddingSubcategoryFor(null)}
          onDeleteSubcategory={handleDelete}
        />
      )}
    </div>
  );
}
