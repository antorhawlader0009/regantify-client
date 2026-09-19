import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronDown, SquareArrowOutUpRight } from 'lucide-react';
import { mediaApi, type MediaAsset } from '../../../lib/mediaApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';

// CONTEXT values the app's own upload endpoints record (see
// CloudinaryService's uploadXPhoto methods) — used only to label rows,
// not to validate incoming data (a context is free-form server-side,
// see MediaAsset.context's schema comment). Every "logo"/identity
// upload (store logo, brand logo, profile picture) is deliberately
// excluded from Store > Media by product decision — see
// MediaService.EXCLUDED_CONTEXTS on the server — so no label exists
// here for those contexts; they never reach this page.
const CONTEXT_LABELS: Record<string, string> = {
  'product-portrait': 'Product Photo',
  'category-cover': 'Category Cover',
  'category-square': 'Category Square',
  'collection-cover': 'Collection Cover',
  'campaign-cover': 'Campaign Cover',
  'review-photo': 'Review Photo',
  'media-library': 'Uploaded to Library',
};

function contextLabel(context: string): string {
  return CONTEXT_LABELS[context] ?? context;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ActionsMenu({
  onGoToProduct,
  onGoToCategory,
  onDelete,
}: {
  onGoToProduct?: () => void;
  onGoToCategory?: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu
      trigger={
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
          Actions
          <ChevronDown size={14} />
        </button>
      }
    >
      {onGoToProduct && <DropdownMenuItem onSelect={onGoToProduct}>Go to Product</DropdownMenuItem>}
      {onGoToCategory && <DropdownMenuItem onSelect={onGoToCategory}>Go to Category</DropdownMenuItem>}
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete Image
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default function Media() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'image'>('image');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset to page 1 whenever a filter changes — same reasoning as
  // AllProducts.tsx: a stale page number from a larger result set could
  // land past the new total.
  useEffect(() => setPage(1), [search, type, perPage]);

  // Clear bulk-selected ids whenever the visible result set changes —
  // same reasoning as AllProducts.tsx (stale "Delete Selected" count,
  // stale header-checkbox state).
  useEffect(() => setSelected(new Set()), [search, type, page, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['media', { search, type, page, perPage }],
    queryFn: () =>
      mediaApi.list({
        search: search.trim() || undefined,
        type: type || undefined,
        page,
        perPage,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      // Sequential, not Promise.all: mirrors how Add Product uploads
      // photos one at a time — keeps a single upload's failure isolated
      // and avoids bursting past the endpoint's 30/min throttle on a
      // large multi-file selection.
      for (const file of Array.from(files)) {
        await mediaApi.upload(file);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Uploaded.');
    },
    onError: () => toast.error('Could not upload one or more files. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: mediaApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Image deleted.');
    },
    onError: () => toast.error('Could not delete the image. Please try again.'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this image? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((m) => m.id)));
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

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (window.confirm(`Delete ${count} selected image(s)? This cannot be undone.`)) {
      mediaApi.bulkRemove(Array.from(selected)).then(({ removed, failed }) => {
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: ['media'] });
        if (failed === 0) {
          toast.success(`${removed} image(s) deleted.`);
        } else if (removed === 0) {
          toast.error('Could not delete the selected images. Please try again.');
        } else {
          toast.error(`Deleted ${removed} of ${count} — ${failed} failed. Please try again for the rest.`);
        }
      });
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Media</h1>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadMutation.mutate(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Plus size={16} />
          {uploadMutation.isPending ? 'Uploading…' : 'Add New'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as '' | 'image')}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="image">image</option>
          </select>

          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Selected ({selected.size})
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-2 py-3 font-medium">MEDIA</th>
              <th className="px-4 py-3 font-medium">CONTEXT</th>
              <th className="px-4 py-3 font-medium">SIZE</th>
              <th className="px-4 py-3 font-medium">DATE</th>
              <th className="px-4 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-regantify-text-muted">
                  No media files yet.
                </td>
              </tr>
            )}
            {items.map((m: MediaAsset) => (
              <tr key={m.id} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelectOne(m.id)} />
                </td>
                <td className="px-2 py-3">
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <img
                      src={m.url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover bg-regantify-content shrink-0"
                    />
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-regantify-cta">{contextLabel(m.context)}</span>
                  {m.productId && (
                    <button
                      onClick={() => navigate(`/vendor/product/edit/${m.productId}`)}
                      title="Go to product"
                      className="ml-2 inline-flex items-center align-middle text-regantify-text-muted hover:text-regantify-cta"
                    >
                      <SquareArrowOutUpRight size={14} />
                    </button>
                  )}
                  {m.categoryId && (
                    // Categories have no dedicated edit route (Categories.tsx
                    // edits in-page via a modal, not a route like Edit
                    // Product) — this goes to the Categories list, the
                    // closest "go to" destination that exists today.
                    <button
                      onClick={() => navigate('/vendor/product/categories')}
                      title="Go to category"
                      className="ml-2 inline-flex items-center align-middle text-regantify-text-muted hover:text-regantify-cta"
                    >
                      <SquareArrowOutUpRight size={14} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-regantify-text">{formatSize(m.sizeBytes)}</td>
                <td className="px-4 py-3 text-regantify-text">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3">
                  <ActionsMenu
                    onGoToProduct={m.productId ? () => navigate(`/vendor/product/edit/${m.productId}`) : undefined}
                    onGoToCategory={m.categoryId ? () => navigate('/vendor/product/categories') : undefined}
                    onDelete={() => handleDelete(m.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
