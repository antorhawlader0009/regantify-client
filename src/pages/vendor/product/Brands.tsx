import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { brandsApi } from '../../../lib/brandsApi';
import { AddBrandModal } from './AddBrandModal';
import { toast } from '../../../lib/toast';

export default function Brands() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand deleted.');
    },
    onError: () => toast.error('Could not delete the brand. Please try again.'),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.trim().toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Brands</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-5 py-3 font-medium">NAME</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center text-regantify-text-muted">
                  No brands yet.
                </td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id} className="border-t border-black/5">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={b.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-regantify-content" />
                    <span className="text-regantify-cta font-medium">{b.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => handleDelete(b.id, b.name)} className="text-red-600 hover:underline text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-5 py-3 text-xs text-regantify-text-muted border-t border-black/5">
          Total: {filtered.length}
        </div>
      </div>

      {showAddModal && <AddBrandModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
