import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { pagesApi, type StorePage } from '../../../lib/pagesApi';
import { toast } from '../../../lib/toast';
import { demoPagesShowing } from '../../../lib/demoPages';

interface PageRowProps {
  page: StorePage;
  selected: boolean;
  onToggleSelect: () => void;
}

function PageRow({ page, selected, onToggleSelect }: PageRowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => pagesApi.remove(page.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Page deleted.');
    },
    onError: () => toast.error('Could not delete this page. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete "${page.title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-t border-black/5">
      <td className="px-5 py-3.5 w-10">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="px-5 py-3.5">
        <button
          onClick={() => navigate(`/vendor/store/pages/edit/${page.id}`)}
          className="text-regantify-cta font-medium hover:underline"
        >
          {page.title}
        </button>
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-md ${
            page.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-regantify-content text-regantify-text-muted'
          }`}
        >
          {page.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button onClick={handleDelete} className="text-red-600 hover:underline text-sm">
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function Pages() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const perPage = 10;

  useEffect(() => setPage(1), [search]);
  useEffect(() => setSelected(new Set()), [search, page]);

  const { data: allPages = [], isLoading } = useQuery({
    queryKey: ['pages', search],
    queryFn: () => pagesApi.list(search.trim() || undefined),
  });

  const demoShowing = demoPagesShowing(allPages);
  const total = allPages.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = allPages.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  const toggleSelectAll = () => {
    if (selected.size === pages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pages.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Pages</h1>
        <button
          onClick={() => navigate('/vendor/store/pages/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      {/* Default pages (lib/demoPages.ts): shown on the store with a demo text until the owner saves their own. */}
      {!isLoading && !search.trim() && demoShowing.length > 0 && (
        <section className="mb-5 rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-[15px] font-semibold text-regantify-text">Ready pages on your store</h2>
          <p className="mt-0.5 text-sm text-regantify-text-muted">
            These pages show a demo text on your store and in its footer until you save your own. Open one, change what does not
            fit, and press Save.
          </p>
          <ul className="mt-3 divide-y divide-black/5">
            {demoShowing.map((d) => (
              <li key={d.kind} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-regantify-text">{d.title}</span>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Demo text</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/vendor/store/pages/add?demo=${d.kind}`)}
                  className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-regantify-text hover:bg-regantify-content"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pages.length > 0 && selected.size === pages.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-5 py-3 font-medium">TITLE</th>
                <th className="px-5 py-3 font-medium">STATUS</th>
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
              {!isLoading && pages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                    No pages yet.
                  </td>
                </tr>
              )}
              {pages.map((p) => (
                <PageRow key={p.id} page={p} selected={selected.has(p.id)} onToggleSelect={() => toggleSelectOne(p.id)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
