import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Plus, Tag } from 'lucide-react';
import { brandsApi, type Brand } from '../../../lib/brandsApi';
import { AddBrandModal } from './AddBrandModal';
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

function BrandLogo({ brand }: { brand: Brand }) {
  return <img src={brand.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-line bg-neutral-100 object-cover" loading="lazy" />;
}

export default function Brands() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setDeleting(null);
      toast.success('Brand deleted.');
    },
    onError: () => toast.error('Could not delete the brand. Please try again.'),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.trim().toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const menu = (b: Brand) => (
    <DropdownMenu
      trigger={
        <button aria-label="Actions" title="Actions" className={iconBtn}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={() => setDeleting(b)} danger>
        Delete brand
      </DropdownMenuItem>
    </DropdownMenu>
  );

  const addButton = (
    <button type="button" onClick={() => setShowAddModal(true)} className={primaryBtn}>
      <Plus size={15} />
      Add brand
    </button>
  );
  const emptyTitle = search ? 'No brands match your search' : 'No brands yet';
  const emptyHint = search ? 'Try a different name.' : 'Add the brands you sell, with their logo. Shoppers can then shop by brand.';

  return (
    <PageSection>
      <PageHeader
        title="Brands"
        description={`${brands.length.toLocaleString()} ${brands.length === 1 ? 'brand' : 'brands'}`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search brands" />
            {addButton}
          </>
        }
      />

      <TableFrame minWidth="min-w-[520px]" className="hidden md:block">
        <thead>
          <tr className={theadRow}>
            <th className={th}>Brand</th>
            <th className={`${th} w-32`}>Products</th>
            <th className={`${th} w-16`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={4} colSpan={3} />
          ) : filtered.length === 0 ? (
            <EmptyState as="row" colSpan={3} icon={Tag} title={emptyTitle} hint={emptyHint} action={search ? undefined : addButton} />
          ) : (
            filtered.map((b) => (
              <tr key={b.id} className={trClass()}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={b} />
                    <span className="font-medium">{b.name}</span>
                  </div>
                </td>
                <td className={`${td} tabular-nums`}>{b.productCount ?? 0}</td>
                <td className={td}>{menu(b)}</td>
              </tr>
            ))
          )}
        </tbody>
      </TableFrame>

      <div className="md:hidden">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-line">
            <EmptyState icon={Tag} title={emptyTitle} hint={emptyHint} action={search ? undefined : addButton} />
          </div>
        ) : (
          <StackedList>
            {filtered.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-3">
                <BrandLogo brand={b} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-regantify-text">{b.name}</p>
                  <p className="text-xs text-neutral-500">
                    {b.productCount ?? 0} {(b.productCount ?? 0) === 1 ? 'product' : 'products'}
                  </p>
                </div>
                {menu(b)}
              </li>
            ))}
          </StackedList>
        )}
      </div>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'brand'}?`}
        message="Products with this brand stay in your store; only the brand and its logo are removed. This can’t be undone."
        confirmLabel="Delete brand"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        busy={deleteMutation.isPending}
        danger
      />

      {showAddModal && <AddBrandModal onClose={() => setShowAddModal(false)} />}
    </PageSection>
  );
}
