import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Plus, TicketPercent } from 'lucide-react';
import { couponsApi, type Coupon } from '../../../lib/couponsApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { PromoRowMenu, PromoStatusBadge, copyText, promoStatus, taka } from './MarketingKit';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { useCan } from '../../../lib/useStaffAccess';

/** "10% off (up to ৳500)" / "৳100 off" / "Free delivery". */
function discountLabel(c: Coupon): string {
  if (c.discountType === 'FREE_SHIPPING') return 'Free delivery';
  if (c.discountType === 'PERCENT') return `${Number(c.amount)}% off${c.maxDiscount ? ` (up to ${taka(c.maxDiscount)})` : ''}`;
  return `${taka(c.amount)} off`;
}

/** "Orders over ৳1,000 · 3 products · first-time customers" — empty when it works on everything. */
function conditionsLabel(c: Coupon): string {
  const parts: string[] = [];
  if (c.minCartAmount && Number(c.minCartAmount) > 0) parts.push(`Orders over ${taka(c.minCartAmount)}`);
  if (c.newCustomerOnly) parts.push('First-time customers');
  if (c.usagePerCustomer) parts.push(c.usagePerCustomer === 1 ? 'Once per customer' : `${c.usagePerCustomer} per customer`);
  if (c.customerPhones.length) parts.push(`${c.customerPhones.length} ${c.customerPhones.length === 1 ? 'customer' : 'customers'}`);
  if (c.products.length) parts.push(`${c.products.length} ${c.products.length === 1 ? 'product' : 'products'}`);
  if (c.categories.length) parts.push(`${c.categories.length} ${c.categories.length === 1 ? 'category' : 'categories'}`);
  return parts.join(' · ');
}

function usageLabel(c: Coupon) {
  return c.usageLimit ? `${c.usageCount} of ${c.usageLimit}` : `${c.usageCount}`;
}

const statusOf = (c: Coupon) => promoStatus({ active: c.active, endsAt: c.validTill, usageLimit: c.usageLimit, usageCount: c.usageCount });

function useCouponActions(coupon: Coupon, subdomain?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeMutation = useMutation({
    mutationFn: () => couponsApi.setActive(coupon.id, !coupon.active),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(c.active ? `${c.code} is on` : `${c.code} is off`);
    },
    onError: () => toast.error('Couldn’t change this coupon. Try again in a minute.'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => couponsApi.remove(coupon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setConfirmDelete(false);
      toast.success('Coupon deleted');
    },
    onError: () => toast.error('Couldn’t delete this coupon. Try again in a minute.'),
  });

  const shareUrl = coupon.hasCustomLink && coupon.customLink && subdomain ? `${storefrontStoreUrl(subdomain)}?coupon=${encodeURIComponent(coupon.customLink)}` : null;

  const menu = (
    <PromoRowMenu
      name={coupon.code}
      onEdit={() => navigate(`/vendor/marketing/coupons/${coupon.id}/edit`)}
      active={coupon.active}
      onToggleActive={() => activeMutation.mutate()}
      onDelete={() => setConfirmDelete(true)}
      extra={
        <>
          <DropdownMenuItem onSelect={() => copyText(coupon.code, 'Code')}>Copy code</DropdownMenuItem>
          {shareUrl && <DropdownMenuItem onSelect={() => copyText(shareUrl, 'Share link')}>Copy share link</DropdownMenuItem>}
        </>
      }
    />
  );
  const dialog = (
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={`Delete coupon ${coupon.code}?`}
      message="Shoppers can’t use it after this. Orders that already used it keep their discount."
      confirmLabel="Delete coupon"
      onConfirm={() => deleteMutation.mutate()}
      busy={deleteMutation.isPending}
      danger
    />
  );
  return { menu, dialog, shareUrl };
}

function CodeChip({ code }: { code: string }) {
  return (
    <button
      type="button"
      onClick={() => copyText(code, 'Code')}
      title="Copy code"
      className="inline-flex items-center gap-1.5 rounded border border-dashed border-neutral-300 bg-neutral-50 px-2 py-0.5 font-mono text-[13px] font-medium text-regantify-text hover:border-brand"
    >
      {code}
      <Copy size={12} className="text-neutral-400" aria-hidden />
    </button>
  );
}

function CouponRow({ coupon, subdomain }: { coupon: Coupon; subdomain?: string }) {
  const { menu, dialog, shareUrl } = useCouponActions(coupon, subdomain);
  return (
    <tr className={trClass()}>
      <td className={td}>
        <div className="flex items-center gap-1.5">
          <CodeChip code={coupon.code} />
          {shareUrl && <Link2 size={14} className="text-neutral-400" aria-label="Has a share link" />}
        </div>
      </td>
      <td className={td}>
        <PromoStatusBadge status={statusOf(coupon)} />
      </td>
      <td className={td}>
        <p className="whitespace-nowrap">{discountLabel(coupon)}</p>
        {conditionsLabel(coupon) && <p className="text-xs text-neutral-500">{conditionsLabel(coupon)}</p>}
      </td>
      <td className={`${td} whitespace-nowrap tabular-nums`}>{usageLabel(coupon)}</td>
      <td className={`${td} whitespace-nowrap text-neutral-600`}>{coupon.validTill ? formatDhakaDate(coupon.validTill) : 'No end'}</td>
      <td className={td}>
        {menu}
        {dialog}
      </td>
    </tr>
  );
}

function CouponItem({ coupon, subdomain }: { coupon: Coupon; subdomain?: string }) {
  const navigate = useNavigate();
  const { menu, dialog } = useCouponActions(coupon, subdomain);
  return (
    <li className="flex items-start gap-2 px-3 py-3">
      <button type="button" onClick={() => navigate(`/vendor/marketing/coupons/${coupon.id}/edit`)} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-regantify-text">{coupon.code}</span>
          <PromoStatusBadge status={statusOf(coupon)} />
        </div>
        <p className="mt-0.5 text-xs text-neutral-600">
          {discountLabel(coupon)} · used {usageLabel(coupon)}
        </p>
        {conditionsLabel(coupon) && <p className="truncate text-xs text-neutral-500">{conditionsLabel(coupon)}</p>}
      </button>
      {menu}
      {dialog}
    </li>
  );
}

/**
 * Marketing > Coupons — every coupon with its status (Active /
 * Scheduled / Ended / Off / Used up), what it gives, how often it's
 * been used and until when. Tap a code to copy it. The ⋮ menu edits,
 * turns it on or off, copies the share link and deletes.
 */
export default function Coupons() {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const canEdit = useCan('marketing.edit');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => setPage(1), [search, perPage]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['coupons', { search, page, perPage }],
    queryFn: () => couponsApi.list({ search: search.trim() || undefined, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const coupons = data?.coupons ?? [];
  const total = data?.total ?? 0;
  const COLS = 6;

  // Read-only roles (Viewer, Accounts) see the coupons but get no Add (rule-plan.md Step 10).
  const addButton = canEdit ? (
    <Link to="/vendor/marketing/coupons/add" className={primaryBtn}>
      <Plus size={15} aria-hidden />
      Add coupon
    </Link>
  ) : undefined;
  const empty = search.trim()
    ? { title: 'No coupons match', hint: 'Try another code.', action: undefined }
    : { title: 'No coupons yet', hint: 'Make a code shoppers type at checkout, like EID100 for ৳100 off.', action: addButton };

  return (
    <PageSection>
      <PageHeader title="Coupons" description="Codes shoppers type at checkout for a discount." actions={addButton} />
      <div className="mb-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search codes" />
      </div>

      <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="hidden md:block">
          <TableFrame minWidth="min-w-[760px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Code</th>
                <th className={th}>Status</th>
                <th className={th}>Discount</th>
                <th className={th}>Used</th>
                <th className={th}>Last day</th>
                <th className={`${th} w-12`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={5} colSpan={COLS} />
              ) : coupons.length === 0 ? (
                <EmptyState as="row" colSpan={COLS} icon={TicketPercent} title={empty.title} hint={empty.hint} action={empty.action} />
              ) : (
                coupons.map((c) => <CouponRow key={c.id} coupon={c} subdomain={subdomain} />)
              )}
            </tbody>
          </TableFrame>
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={TicketPercent} title={empty.title} hint={empty.hint} action={empty.action} />
            </div>
          ) : (
            <StackedList>
              {coupons.map((c) => (
                <CouponItem key={c.id} coupon={c} subdomain={subdomain} />
              ))}
            </StackedList>
          )}
        </div>

        {total > 0 && <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />}
      </div>
    </PageSection>
  );
}
