import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Plus, Users } from 'lucide-react';
import { staffApi, type StaffMember } from '../../../lib/staffApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { LockedBadge, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  iconBtn,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { useAuthStore } from '../../../store/authStore';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { StaffAccessNote } from './StaffAccess';

const PER_PAGE = 10;

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-xs font-semibold uppercase text-brand">
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

function OwnerBadge() {
  return <span className="rounded border border-brand/30 bg-brand-lime/50 px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Owner</span>;
}

function lastLoginText(m: StaffMember) {
  if (!m.lastLoginAt) return 'Never signed in';
  return `${formatDhakaDateTime(m.lastLoginAt)}${m.lastLoginIp ? ` · IP ${m.lastLoginIp}` : ''}`;
}

function RowMenu({ member, onRemove }: { member: StaffMember; onRemove: () => void }) {
  return (
    <DropdownMenu
      trigger={
        <button aria-label={`Actions for ${member.name}`} className={`${iconBtn} h-9 w-9 md:h-auto md:w-auto`}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={onRemove} danger>
        Remove from team
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

/**
 * Staff — see StaffMember model's schema comment for the overall shape.
 * The owner's own account always shows first as a non-deletable "Owner"
 * row (see StaffService.findAllForVendor); everyone else is a real
 * StaffMember. Adding and removing are owner-only — hidden here for a
 * logged-in staff member, matching what the backend would 403 on anyway
 * (see StaffController.requireOwner). The access note says plainly what
 * staff can do, since the role is a label and not a permission.
 */
export default function Staff() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'VENDOR';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  useEffect(() => setPage(1), [search]);

  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ['staff', search],
    queryFn: () => staffApi.list(search.trim() || undefined),
    placeholderData: keepPreviousData,
  });

  // "X of N staff used" + Add disabled at the plan's cap. The owner row
  // never counts against the limit, so usage comes from the plan endpoint.
  const { data: planUsage } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, enabled: isOwner });
  const staffUsage = planUsage?.usage.staff;
  const atStaffLimit = staffUsage != null && staffUsage.limit !== null && staffUsage.used >= staffUsage.limit;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-plan-usage'] });
      toast.success(`${removing?.name ?? 'Staff member'} removed from your team`);
      setRemoving(null);
    },
    onError: () => toast.error('Couldn’t remove this staff member. Try again in a minute.'),
  });

  const total = allMembers.length;
  const members = allMembers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const isMe = (m: StaffMember) => Boolean(currentUser && m.phone && m.phone === currentUser.phone);
  const COLS = 5;

  const addButton = isOwner ? (
    atStaffLimit ? (
      <button type="button" onClick={() => upgradeToast('add more staff members')} className={`${primaryBtn} opacity-60`} title="Upgrade your plan to add more staff">
        <LockedBadge size={14} className="text-white" />
        Add staff
      </button>
    ) : (
      <Link to="/vendor/staff/add" className={primaryBtn}>
        <Plus size={15} aria-hidden />
        Add staff
      </Link>
    )
  ) : undefined;

  const onlyOwner = !isLoading && !search.trim() && allMembers.every((m) => m.isOwner);

  return (
    <div className="space-y-4">
      <PageSection>
        <PageHeader
          title="Staff"
          description={
            isOwner && staffUsage
              ? staffUsage.limit === null
                ? `${staffUsage.used} staff on your team.`
                : `${staffUsage.used} of ${staffUsage.limit} staff on your plan.${atStaffLimit ? ' Upgrade to add more.' : ''}`
              : 'The people who help run your store.'
          }
          actions={addButton}
        />
        <div className="mb-3">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone or email" />
        </div>

        <div className="hidden md:block">
          <TableFrame minWidth="min-w-[760px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Contact</th>
                <th className={th}>Last sign-in</th>
                <th className={`${th} w-12`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={3} colSpan={COLS} />
              ) : members.length === 0 ? (
                <EmptyState as="row" colSpan={COLS} icon={Users} title="No one matches" hint="Try another name or phone." />
              ) : (
                members.map((m) => (
                  <tr key={m.id} className={trClass()}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Initial name={m.name} />
                        <span className="font-medium">
                          {m.name}
                          {isMe(m) && <span className="font-normal text-neutral-500"> (you)</span>}
                        </span>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        {m.role}
                        {m.isOwner && <OwnerBadge />}
                      </div>
                    </td>
                    <td className={td}>
                      <p className="tabular-nums">{m.phone ?? '—'}</p>
                      {m.email && <p className="text-xs text-neutral-500">{m.email}</p>}
                    </td>
                    <td className={`${td} text-neutral-600`}>
                      {lastLoginText(m)}
                      {m.allowedIp && <p className="text-xs text-neutral-500">Only from IP {m.allowedIp}</p>}
                    </td>
                    <td className={td}>{isOwner && !m.isOwner && <RowMenu member={m} onRemove={() => setRemoving(m)} />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </TableFrame>
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={Users} title="No one matches" hint="Try another name or phone." />
            </div>
          ) : (
            <StackedList>
              {members.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-3 py-3">
                  <Initial name={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-regantify-text">
                        {m.name}
                        {isMe(m) && <span className="font-normal text-neutral-500"> (you)</span>}
                      </span>
                      {m.isOwner && <OwnerBadge />}
                    </div>
                    <p className="text-xs text-neutral-600">
                      {m.role} · {m.phone ?? '—'}
                    </p>
                    <p className="text-xs text-neutral-500">{lastLoginText(m)}</p>
                  </div>
                  {isOwner && !m.isOwner && <RowMenu member={m} onRemove={() => setRemoving(m)} />}
                </li>
              ))}
            </StackedList>
          )}
        </div>

        {total > PER_PAGE && <TableFooter page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />}

        {onlyOwner && isOwner && (
          <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-neutral-600">
            It’s just you for now. Add staff so they can take orders and send parcels with their own sign-in.
          </p>
        )}
      </PageSection>

      <section className="rounded-xl border border-line bg-neutral-50 p-3.5">
        <h2 className="mb-3 px-0.5 text-[15px] font-semibold text-regantify-text">What staff can do</h2>
        <StaffAccessNote />
      </section>

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : ''}
        message="They can’t sign in to your store’s dashboard after this. Orders and notes they made stay as they are."
        confirmLabel="Remove from team"
        onConfirm={() => removing && deleteMutation.mutate(removing.id)}
        busy={deleteMutation.isPending}
        danger
      />
    </div>
  );
}
