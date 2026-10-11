import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { blogApi, type BlogPostRow } from '../../../lib/blogApi';
import { toast } from '../../../lib/toast';

function statusOf(post: BlogPostRow): { label: string; className: string } {
  if (post.status === 'DRAFT') return { label: 'DRAFT', className: 'bg-regantify-content text-regantify-text-muted' };
  if (new Date(post.publishedAt).getTime() > Date.now()) return { label: 'SCHEDULED', className: 'bg-amber-100 text-amber-800' };
  return { label: 'PUBLISHED', className: 'bg-green-100 text-green-700' };
}

/**
 * Store > Content > Magazine (TellMe idea 106): the store's own blog. Posts show on the store as photo cards in the home page's Magazine
 * section and on /blog, so customers can see the shop is real and active. StorePal stores only.
 */
export default function Magazine() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: posts = [], isLoading } = useQuery({ queryKey: ['blog', search], queryFn: () => blogApi.list(search.trim() || undefined) });

  const remove = useMutation({
    mutationFn: (id: string) => blogApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      toast.success('Post deleted.');
    },
    onError: () => toast.error('Could not delete this post. Please try again.'),
  });

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">Magazine</h1>
        <button onClick={() => navigate('/vendor/store/magazine/add')} className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-regantify-cta-dark">
          <Plus size={16} />
          Add New
        </button>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        Write about your shop: an award, an event, a new collection, how you make your products. Customers who read it trust you more. The latest posts show in the Magazine section of your home page. Works on the StorePal theme only.
      </p>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <div className="border-b border-black/5 p-4">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title" className="w-full rounded-xl border border-black/10 py-2.5 pl-10 pr-4 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="w-20 px-5 py-3 font-medium">PHOTO</th>
                <th className="px-5 py-3 font-medium">TITLE</th>
                <th className="px-5 py-3 font-medium">DATE</th>
                <th className="px-5 py-3 font-medium">STATUS</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-regantify-text-muted">
                    No posts yet.
                  </td>
                </tr>
              )}
              {posts.map((p) => {
                const st = statusOf(p);
                return (
                  <tr key={p.id} className="border-t border-black/5">
                    <td className="px-5 py-3">{p.coverUrl ? <img src={p.coverUrl} alt="" className="h-10 w-14 rounded object-cover" /> : <div className="h-10 w-14 rounded bg-regantify-content" />}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => navigate(`/vendor/store/magazine/edit/${p.id}`)} className="text-left font-medium text-regantify-cta hover:underline">
                        {p.title}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-regantify-text-muted">{new Date(p.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${p.title}"? This cannot be undone.`)) remove.mutate(p.id);
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
