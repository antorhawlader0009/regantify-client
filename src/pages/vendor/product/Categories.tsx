import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderTree, GripVertical, MoreVertical, Plus, X } from 'lucide-react';
import { categoriesApi, type Category } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { SubcategoriesModal } from './SubcategoriesModal';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  SelectBox,
  StackedList,
  TableFrame,
  TableSkeleton,
  iconBtn,
  primaryBtn,
  td,
  th,
  theadRow,
} from '../../../components/ui/PageKit';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

// Two drag payload types on the same table, so a row's onDrop can tell
// "reorder these two main categories" from "move this sub category here".
const MAIN_DRAG_TYPE = 'application/x-main-category-id';
const SUB_DRAG_TYPE = 'application/x-sub-category-id';

/** Every descendant of `parentId`, at any depth, flattened — so a deeper
 * category still shows as a chip on its top-level ancestor's row. */
function getDescendants(categories: Category[], parentId: string): Category[] {
  const direct = categories.filter((c) => c.parentId === parentId);
  return direct.flatMap((c) => [c, ...getDescendants(categories, c.id)]);
}

function VisibilityBadge({ visibility }: { visibility: Category['visibility'] }) {
  return visibility === 'PUBLIC' ? (
    <span className="inline-block rounded border border-green-200 bg-green-50 px-2 py-0.5 text-sm text-green-700">Public</span>
  ) : (
    <span className="inline-block rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-sm text-neutral-600">Hidden</span>
  );
}

function ActionsMenu({ onEdit, onAddSub, onDelete }: { onEdit: () => void; onAddSub: () => void; onDelete: () => void }) {
  // No menu for a role that can't change the catalog (rule-plan.md Step 10).
  if (!useCan('products.edit')) return null;
  return (
    <DropdownMenu
      trigger={
        <button aria-label="Actions" title="Actions" className={iconBtn}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={onEdit}>Edit category</DropdownMenuItem>
      <DropdownMenuItem onSelect={onAddSub}>Add sub category</DropdownMenuItem>
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete category
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  // Read-only roles see the tree but can't add, drag or change it (rule-plan.md Step 10).
  const canEdit = useCan('products.edit');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addingSubcategoryFor, setAddingSubcategoryFor] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [dragOverMainId, setDragOverMainId] = useState<string | null>(null);
  // Optimistic main-category order while a drag's reorder request is in
  // flight — cleared once the mutation settles and refetched data takes over.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleting(null);
      toast.success('Category deleted.');
    },
    onError: () => toast.error('Could not delete the category. Please try again.'),
  });

  const reparentMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string }) => categoriesApi.update(id, { parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Sub category moved.');
    },
    onError: () => toast.error('Could not move the sub category. Please try again.'),
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
      return main.name.toLowerCase().includes(query) || subcategories.some((sub) => sub.name.toLowerCase().includes(query));
    });
  }, [mainCategories, categories, visibilityFilter, search]);

  /** Products in a main category and all its sub categories. */
  const productCount = (main: Category) =>
    (main._count?.products ?? 0) + getDescendants(categories, main.id).reduce((sum, c) => sum + (c._count?.products ?? 0), 0);

  const askDelete = (category: Category) => {
    // A category with sub categories can't be deleted out from under them.
    if (categories.some((c) => c.parentId === category.id)) {
      toast.error(`Move or delete the sub categories of “${category.name}” first.`);
      return;
    }
    setDeleting(category);
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

  const addButton = canEdit ? (
    <button type="button" onClick={() => setShowAddModal(true)} className={primaryBtn}>
      <Plus size={15} />
      Add category
    </button>
  ) : undefined;
  const emptyTitle = search || visibilityFilter !== 'ALL' ? 'No categories match' : 'No categories yet';
  const emptyHint =
    search || visibilityFilter !== 'ALL'
      ? 'Try a different name or filter.'
      : 'Categories group your products so shoppers can find them, e.g. Men, Women, Kids.';

  const subChip = (sub: Category, draggable: boolean) => (
    <span
      key={sub.id}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData(SUB_DRAG_TYPE, sub.id);
              e.dataTransfer.effectAllowed = 'move';
            }
          : undefined
      }
      title={draggable ? `Drag “${sub.name}” onto another main category to move it there` : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border border-brand-lime bg-brand-lime/40 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <button type="button" onClick={() => setEditingCategory(sub)} className="hover:underline" title={`Edit ${sub.name}`}>
        {sub.name}
        {sub._count?.products ? <span className="ml-1 font-normal text-brand/70">{sub._count.products}</span> : null}
      </button>
      <button
        type="button"
        onClick={() => askDelete(sub)}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/70"
        aria-label={`Delete ${sub.name}`}
      >
        <X size={11} />
      </button>
    </span>
  );

  return (
    <PageSection>
      <PageHeader
        title="Categories"
        description={rawMainCategories.length > 1 ? 'Drag rows to change the order shoppers see. Drag a sub category onto another row to move it.' : undefined}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search categories" />
            <SelectBox ariaLabel="Filter categories" value={visibilityFilter} onChange={(v) => setVisibilityFilter(v as VisibilityFilter)}>
              <option value="ALL">All categories</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Hidden</option>
            </SelectBox>
            {addButton}
          </>
        }
      />

      {/* Wide screens: table with drag and drop */}
      <TableFrame minWidth="min-w-[760px]" className="hidden md:block">
        <thead>
          <tr className={theadRow}>
            <th className={th}>Main category</th>
            <th className={th}>Sub categories</th>
            <th className={`${th} w-28`}>Products</th>
            <th className={`${th} w-28`}>Visibility</th>
            <th className={`${th} w-16`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={4} colSpan={5} />
          ) : filtered.length === 0 ? (
            <EmptyState as="row" colSpan={5} icon={FolderTree} title={emptyTitle} hint={emptyHint} action={!search && visibilityFilter === 'ALL' ? addButton : undefined} />
          ) : (
            filtered.map((main) => {
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
                  className={`border-t border-line align-top text-regantify-text transition-colors ${
                    dragOverMainId === main.id ? 'bg-brand-lime/25 ring-2 ring-inset ring-brand' : 'hover:bg-neutral-50/70'
                  }`}
                >
                  <td className={`${td} whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <span
                        draggable={canEdit}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(MAIN_DRAG_TYPE, main.id);
                          e.dataTransfer.effectAllowed = 'move';
                          // Drag ghost: the icon + name group, not just the tiny icon.
                          const preview = e.currentTarget.parentElement;
                          if (preview) e.dataTransfer.setDragImage(preview, 10, 14);
                        }}
                        title="Drag to reorder"
                        className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
                      >
                        <GripVertical size={15} />
                      </span>
                      <button type="button" onClick={() => setEditingCategory(main)} className="font-medium text-brand hover:underline">
                        {main.name}
                      </button>
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {subcategories.map((sub) => subChip(sub, canEdit))}
                      <button
                        type="button"
                        onClick={() => setAddingSubcategoryFor(main)}
                        title="Add sub category"
                        aria-label={`Add sub category to ${main.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-500 hover:border-brand hover:text-brand"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{productCount(main)}</td>
                  <td className={td}>
                    <VisibilityBadge visibility={main.visibility} />
                  </td>
                  <td className={td}>
                    <ActionsMenu
                      onEdit={() => setEditingCategory(main)}
                      onAddSub={() => setAddingSubcategoryFor(main)}
                      onDelete={() => askDelete(main)}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableFrame>

      {/* Phones: stacked list (no drag and drop on touch) */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-line">
            <EmptyState icon={FolderTree} title={emptyTitle} hint={emptyHint} action={!search && visibilityFilter === 'ALL' ? addButton : undefined} />
          </div>
        ) : (
          <StackedList>
            {filtered.map((main) => {
              const subcategories = getDescendants(categories, main.id);
              return (
                <li key={main.id} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditingCategory(main)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-brand">
                      {main.name}
                    </button>
                    <span className="text-xs text-neutral-500">{productCount(main)} products</span>
                    <ActionsMenu
                      onEdit={() => setEditingCategory(main)}
                      onAddSub={() => setAddingSubcategoryFor(main)}
                      onDelete={() => askDelete(main)}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <VisibilityBadge visibility={main.visibility} />
                    {subcategories.map((sub) => subChip(sub, false))}
                  </div>
                </li>
              );
            })}
          </StackedList>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 px-2 text-xs text-neutral-600">
          {filtered.length} of {rawMainCategories.length} main {rawMainCategories.length === 1 ? 'category' : 'categories'}
        </p>
      )}

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'category'}?`}
        message="Products in it stay in your store; only the category is removed. This can’t be undone."
        confirmLabel="Delete category"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        busy={deleteMutation.isPending}
        danger
      />

      {showAddModal && (
        // "Add category" here always creates a main category, which has no parent.
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
        <SubcategoriesModal mainCategory={addingSubcategoryFor} categories={categories} onClose={() => setAddingSubcategoryFor(null)} />
      )}
    </PageSection>
  );
}
