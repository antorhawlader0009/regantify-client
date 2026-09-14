import { X } from 'lucide-react';
import { CategoryForm } from './AddCategoryModal';
import type { Category } from '../../../lib/categoriesApi';

interface SubcategoriesModalProps {
  /** The main (top-level) category the "+" was clicked on. */
  mainCategory: Category;
  categories: Category[];
  onClose: () => void;
}

/** Opened from the "+" on a main category's Sub Categories cell — the
 * normal Add Category form, with Parent Category pre-filled (but still
 * editable) to this main category. */
export function SubcategoriesModal({ mainCategory, categories, onClose }: SubcategoriesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-base font-semibold text-regantify-text">Add Subcategory</h2>
          <button onClick={onClose} className="text-regantify-text-muted hover:text-regantify-text">
            <X size={18} />
          </button>
        </div>

        <CategoryForm
          categories={categories}
          initialParentId={mainCategory.id}
          initialParentName={mainCategory.name}
          hideCloseButton
          onSaved={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
