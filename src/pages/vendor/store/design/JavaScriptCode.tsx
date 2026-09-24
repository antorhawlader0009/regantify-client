import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { customCodeApi, type StoreScript } from '../../../../lib/customCodeApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { DropdownMenu, DropdownMenuItem } from '../../../../components/ui/DropdownMenu';

const PER_PAGE_OPTIONS = [10, 25, 50];

/**
 * Store > Design > JavaScript Code — the list of named snippets. The
 * server returns them all (a vendor has a handful), so search and
 * pagination are client-side, same as Store > Pages.
 */
export default function JavaScriptCode() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => setPage(1), [search, perPage]);
  useEffect(() => setSelected(new Set()), [search, perPage, page]);

  const { data: scripts = [], isLoading } = useQuery({ queryKey: ['store-scripts'], queryFn: customCodeApi.listScripts });

  const remove = useMutation({
    mutationFn: (ids: string[]) => customCodeApi.deleteScripts(ids),
    onSuccess: ({ deleted }) => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['store-scripts'] });
      toast.success(deleted === 1 ? 'Script deleted.' : `${deleted} scripts deleted.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete. Please try again.')),
  });

  const q = search.trim().toLowerCase();
  const filtered = q ? scripts.filter((s) => s.name.toLowerCase().includes(q)) : scripts;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  const toggleSelectAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((s) => s.id)));

  const toggleSelectOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDelete = (script: StoreScript) => {
    if (window.confirm(`Delete "${script.name}"? This cannot be undone.`)) remove.mutate([script.id]);
  };

  const handleBulkRemove = () => {
    if (selected.size === 0) {
      toast.error('Select at least one script first.');
      return;
    }
    if (window.confirm(`Delete ${selected.size} selected script(s)? This cannot be undone.`)) {
      remove.mutate(Array.from(selected));
    }
  };

  const pagerButton = 'px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">JavaScript Code</h1>
        <button
          onClick={() => navigate('/vendor/store/javascript/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Scripts"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white focus:outline-none"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <DropdownMenu
            align="start"
            trigger={
              <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-regantify-cta text-sm text-regantify-cta">
                Bulk Actions {selected.size > 0 && `(${selected.size})`}
                <ChevronDown size={14} />
              </button>
            }
          >
            <DropdownMenuItem danger onSelect={handleBulkRemove}>
              Bulk remove
            </DropdownMenuItem>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-5 py-3 font-medium">NAME</th>
                <th className="px-5 py-3 font-medium">POSITION</th>
                <th className="px-5 py-3 font-medium w-40">ACTIONS</th>
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
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                    {q ? 'No scripts match your search.' : 'No scripts yet.'}
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-black/5">
                  <td className="px-5 py-3.5 w-10">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelectOne(s.id)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Link to={`/vendor/store/javascript/edit/${s.id}`} className="text-regantify-cta font-medium hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-regantify-text-muted">{s.position === 'HEAD' ? 'Head' : 'Body'}</td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu
                      align="start"
                      trigger={
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-regantify-cta text-xs text-regantify-cta">
                          Actions
                          <ChevronDown size={12} />
                        </button>
                      }
                    >
                      <DropdownMenuItem onSelect={() => navigate(`/vendor/store/javascript/edit/${s.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem danger onSelect={() => handleDelete(s)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className={pagerButton}>
                «
              </button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={pagerButton}>
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
                className={pagerButton}
              >
                ›
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className={pagerButton}>
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
