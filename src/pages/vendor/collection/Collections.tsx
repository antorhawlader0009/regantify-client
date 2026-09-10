import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { collectionsApi } from '../../../lib/collectionsApi';
import { toast } from '../../../lib/toast';

export default function Collections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', search],
    queryFn: () => collectionsApi.list(search.trim() || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: collectionsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted.');
    },
    onError: () => toast.error('Could not delete the collection. Please try again.'),
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Collections</h1>
        <button
          onClick={() => navigate('/vendor/product/collections/add')}
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
              placeholder="Search by collection name"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-5 py-3 font-medium">NAME</th>
              <th className="px-5 py-3 font-medium">PRODUCTS</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && collections.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-regantify-text-muted">
                  No collections yet.
                </td>
              </tr>
            )}
            {collections.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => navigate(`/vendor/product/collections/edit/${c.id}`)}
                    className="text-regantify-cta font-medium hover:underline"
                  >
                    {c.name}
                  </button>
                </td>
                <td className="px-5 py-3.5 text-regantify-text">{c.products.length}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:underline text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-5 py-3 text-xs text-regantify-text-muted border-t border-black/5">
          Total: {collections.length}
        </div>
      </div>
    </div>
  );
}
