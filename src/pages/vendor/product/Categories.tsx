import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { categoriesApi } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { toast } from '../../../lib/toast';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

export default function Categories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (visibilityFilter !== 'ALL' && c.visibility !== visibilityFilter) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [categories, visibilityFilter, search]);

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
              <th className="px-5 py-3 font-medium">NAME</th>
              <th className="px-5 py-3 font-medium">PARENT</th>
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
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="px-5 py-3.5">
                  <span className="text-regantify-cta font-medium">{c.name}</span>
                </td>
                <td className="px-5 py-3.5 text-regantify-text">{c.parent?.name ?? ''}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      c.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-regantify-content text-regantify-text-muted'
                    }`}
                  >
                    {c.visibility}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddCategoryModal categories={categories} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
