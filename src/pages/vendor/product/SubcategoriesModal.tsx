import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2 } from 'lucide-react';
import { CategoryForm } from './AddCategoryModal';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { toast } from '../../../lib/toast';

interface SubcategoriesModalProps {
  /** The main (top-level) category the "+" was clicked on. */
  mainCategory: Category;
  categories: Category[];
  onClose: () => void;
  onDeleteSubcategory: (id: string, name: string) => void;
}

type Tab = 'add' | 'list';

/** Opened from the "+" on a main category's Sub Categories cell. Bundles
 * the normal Add/Edit Category form (pre-scoped to this main category as
 * parent, with the now-redundant Parent Category field hidden) with a
 * second tab listing existing categories not yet under this main —
 * ticking just selects a category (no request fires yet); "Save" then
 * assigns every ticked one as a subcategory here in one go, so a vendor
 * can reuse old categories instead of only ever creating brand-new ones. */
export function SubcategoriesModal({ mainCategory, categories, onClose, onDeleteSubcategory }: SubcategoriesModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('add');
  const [editingSub, setEditingSub] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Candidates for "add an old subcategory": any category that already
  // belongs to some OTHER parent, i.e. an existing subcategory somewhere
  // — not this main's own top-level peers, since selecting one of those
  // in would silently detach its whole subtree from wherever it lives today.
  // Already-assigned children of this main are deliberately excluded —
  // they're not candidates anymore, they're managed as chips on the
  // Categories table itself.
  const candidates = categories.filter((c) => c.id !== mainCategory.id && !!c.parentId && c.parentId !== mainCategory.id);
  const assignedCount = categories.filter((c) => c.parentId === mainCategory.id).length;

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((existingId) => existingId !== id)));
  };

  const saveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => categoriesApi.update(id, { parentId: mainCategory.id })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategories added.');
      onClose();
    },
    onError: () => toast.error('Could not add the selected subcategories. Please try again.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-1 bg-regantify-content rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                setEditingSub(null);
                setTab('add');
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'add' ? 'bg-white text-regantify-text shadow-sm' : 'text-regantify-text-muted'
              }`}
            >
              Add New
            </button>
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'list' ? 'bg-white text-regantify-text shadow-sm' : 'text-regantify-text-muted'
              }`}
            >
              Sub Categories ({assignedCount})
            </button>
          </div>
          <button onClick={onClose} className="text-regantify-text-muted hover:text-regantify-text">
            <X size={18} />
          </button>
        </div>

        {tab === 'add' && (
          <CategoryForm
            categories={categories}
            editingCategory={editingSub ?? undefined}
            initialParentId={mainCategory.id}
            initialParentName={mainCategory.name}
            hideParentField
            hideCloseButton
            onSaved={onClose}
            onCancel={onClose}
          />
        )}

        {tab === 'list' && (
          <>
            <div className="p-6">
              <p className="text-xs text-regantify-text-muted -mt-2 mb-4">
                Tick the existing categories you want to add as subcategories of "{mainCategory.name}", then Save.
              </p>
              {candidates.length === 0 ? (
                <p className="text-sm text-regantify-text-muted text-center py-8">No other existing subcategories to add.</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {candidates.map((sub) => (
                    <li key={sub.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-regantify-content">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={(e) => toggleSelected(sub.id, e.target.checked)}
                        disabled={saveMutation.isPending}
                        title={`Select ${sub.name}`}
                        className="w-4 h-4 shrink-0 accent-regantify-cta rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSub(sub);
                          setTab('add');
                        }}
                        className="flex-1 text-left text-sm font-medium text-regantify-text hover:text-regantify-cta"
                      >
                        {sub.name}
                      </button>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          sub.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-white text-regantify-text-muted'
                        }`}
                      >
                        {sub.visibility}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteSubcategory(sub.id, sub.name)}
                        className="text-red-600 hover:text-red-700"
                        title={`Delete ${sub.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {candidates.length > 0 && (
              <div className="border-t border-black/5 px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate(selectedIds)}
                  disabled={selectedIds.length === 0 || saveMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
                    transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
