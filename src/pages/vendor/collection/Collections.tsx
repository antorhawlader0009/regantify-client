import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Layers, MoreVertical, Plus } from 'lucide-react';
import { collectionsApi } from '../../../lib/collectionsApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  StackedList,
  TableFrame,
  TableSkeleton,
  iconBtn,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { toast } from '../../../lib/toast';

export default function Collections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', search],
    queryFn: () => collectionsApi.list(search.trim() || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: collectionsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDeleting(null);
      toast.success('Collection deleted.');
    },
    onError: () => toast.error('Could not delete the collection. Please try again.'),
  });

  const editPath = (id: string) => `/vendor/product/collections/edit/${id}`;

  const menu = (c: { id: string; name: string }) => (
    <DropdownMenu
      trigger={
        <button aria-label="Actions" title="Actions" className={iconBtn}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={() => navigate(editPath(c.id))}>Edit collection</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setDeleting(c)} danger>
        Delete collection
      </DropdownMenuItem>
    </DropdownMenu>
  );

  const addButton = (
    <button type="button" onClick={() => navigate('/vendor/product/collections/add')} className={primaryBtn}>
      <Plus size={15} />
      Add collection
    </button>
  );
  const emptyTitle = search ? 'No collections match your search' : 'No collections yet';
  const emptyHint = search
    ? 'Try a different name.'
    : 'Group products you want to show together, like “Eid offers” or “New arrivals”, and show the group on your store.';

  return (
    <PageSection>
      <PageHeader
        title="Collections"
        description={`${collections.length.toLocaleString()} ${collections.length === 1 ? 'collection' : 'collections'}`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search collections" />
            {addButton}
          </>
        }
      />

      <TableFrame minWidth="min-w-[520px]" className="hidden md:block">
        <thead>
          <tr className={theadRow}>
            <th className={th}>Collection</th>
            <th className={`${th} w-32`}>Products</th>
            <th className={`${th} w-16`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={4} colSpan={3} />
          ) : collections.length === 0 ? (
            <EmptyState as="row" colSpan={3} icon={Layers} title={emptyTitle} hint={emptyHint} action={search ? undefined : addButton} />
          ) : (
            collections.map((c) => (
              <tr key={c.id} className={trClass()}>
                <td className={td}>
                  <Link to={editPath(c.id)} className="font-medium text-brand hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className={`${td} tabular-nums`}>{c.products.length}</td>
                <td className={td}>{menu(c)}</td>
              </tr>
            ))
          )}
        </tbody>
      </TableFrame>

      <div className="md:hidden">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : collections.length === 0 ? (
          <div className="rounded-lg border border-line">
            <EmptyState icon={Layers} title={emptyTitle} hint={emptyHint} action={search ? undefined : addButton} />
          </div>
        ) : (
          <StackedList>
            {collections.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                <Link to={editPath(c.id)} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand">{c.name}</p>
                  <p className="text-xs text-neutral-500">
                    {c.products.length} {c.products.length === 1 ? 'product' : 'products'}
                  </p>
                </Link>
                {menu(c)}
                <ChevronRight size={16} className="shrink-0 text-neutral-400" aria-hidden />
              </li>
            ))}
          </StackedList>
        )}
      </div>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'collection'}?`}
        message="The products stay in your store; only this group is removed. This can’t be undone."
        confirmLabel="Delete collection"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        busy={deleteMutation.isPending}
        danger
      />
    </PageSection>
  );
}
