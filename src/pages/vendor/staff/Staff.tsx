import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, MessageSquare, MoreVertical, Pencil, Plus, Power, PowerOff, Trash2, Users } from 'lucide-react';
import { LoginDetailsDialog } from '../../../components/staff/LoginDetailsDialog';
import { STAFF_ROLES } from '../../../lib/staffPermissions';
import { StaffRolesTab } from './StaffRolesTab';
import { StaffActivityTab } from './StaffActivityTab';
import { staffApi, type StaffMember } from '../../../lib/staffApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { LockedBadge, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import {
  EmptyState,
  PageHeader,
  PageSection,
  PillTabs,
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

function RowMenu({
  member,
  onDetails,
  onToggleStatus,
  onSendSms,
  onRemove,
}: {
  member: StaffMember;
  onDetails: () => void;
  onToggleStatus: () => void;
  onSendSms: () => void;
  onRemove: () => void;
}) {
  const navigate = useNavigate();
  const suspended = member.status === 'SUSPENDED';
  return (
    <DropdownMenu
      trigger={
        <button aria-label={`Actions for ${member.name}`} className={`${iconBtn} h-9 w-9 md:h-auto md:w-auto`}>
          <MoreVertical size={14} />
        </button>
      }
    >
      <DropdownMenuItem icon={<Pencil />} onSelect={() => navigate(`/vendor/staff/${member.id}/edit`)}>
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem icon={<KeyRound />} onSelect={onDetails}>
        Login details
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={<MessageSquare />}
        onSelect={onSendSms}
        disabled={!member.hasSavedPassword || suspended}
        hint={suspended ? 'Turn their account back on first' : member.hasSavedPassword ? undefined : 'Reset the password first, from Login details'}
      >
        Send login SMS
      </DropdownMenuItem>
      <DropdownMenuItem icon={suspended ? <Power /> : <PowerOff />} onSelect={onToggleStatus} hint={suspended ? undefined : 'Signs them out; you can turn it back on'}>
        {suspended ? 'Turn back on' : 'Turn off account'}
      </DropdownMenuItem>
      <DropdownMenuItem icon={<Trash2 />} onSelect={onRemove} danger>
        Remove from team
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

/** The role with its icon (ready-made roles' icon, the slider icon for custom roles). */
function RoleChip({ member }: { member: StaffMember }) {
  if (member.isOwner) return <OwnerBadge />;
  const Icon = member.roleKey ? STAFF_ROLES[member.roleKey].icon : null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-0.5 text-xs text-regantify-text">
      {Icon && <Icon size={12} strokeWidth={2} className="text-neutral-500" aria-hidden />}
      {member.role}
    </span>
  );
}

function SuspendedBadge() {
  return <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700">Turned off</span>;
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
  const [params, setParams] = useSearchParams();
  const tab: StaffTab = params.get('tab') === 'roles' ? 'roles' : params.get('tab') === 'activity' ? 'activity' : 'team';
  const selectTab = (next: StaffTab) => setParams(next === 'team' ? {} : { tab: next }, { replace: true });

  // The team list is shared by the Team tab and the Activity tab's person filter.
  const { data: everyone = [] } = useQuery({ queryKey: ['staff', ''], queryFn: () => staffApi.list() });

  return (
    <div className="space-y-4">
      <PillTabs<StaffTab>
        className=""
        value={tab}
        onChange={selectTab}
        tabs={[
          { id: 'team', label: 'Team', count: everyone.length || undefined },
          { id: 'roles', label: 'Roles' },
          { id: 'activity', label: 'Activity' },
        ]}
      />
      {tab === 'team' && <TeamTab />}
      {tab === 'roles' && <StaffRolesTab />}
      {tab === 'activity' && <StaffActivityTab members={everyone} />}
    </div>
  );
}

type StaffTab = 'team' | 'roles' | 'activity';

/** Staff > Team: everyone on the team, with their role and what the owner can do about them. */
function TeamTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'VENDOR';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [turningOff, setTurningOff] = useState<StaffMember | null>(null);
  const [detailsFor, setDetailsFor] = useState<StaffMember | null>(null);
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['staff'] });
    queryClient.invalidateQueries({ queryKey: ['staff-activity'] });
  };
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['vendor-plan-usage'] });
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      toast.success(`${removing?.name ?? 'Staff member'} removed from your team`);
      setRemoving(null);
    },
    onError: () => toast.error('Couldn’t remove this staff member. Try again in a minute.'),
  });
  const statusMutation = useMutation({
    mutationFn: (m: StaffMember) => (m.status === 'SUSPENDED' ? staffApi.activate(m.id) : staffApi.suspend(m.id)),
    onSuccess: (m) => {
      refresh();
      toast.success(m.status === 'SUSPENDED' ? `${m.name}’s account is turned off` : `${m.name} can sign in again`);
      setTurningOff(null);
    },
    onError: () => toast.error('Couldn’t change this account. Try again in a minute.'),
  });
  const smsMutation = useMutation({
    mutationFn: (m: StaffMember) => staffApi.sendLoginSms(m.id).then(() => m),
    onSuccess: (m) => {
      refresh();
      toast.success(`Login details sent to ${m.phone}`);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      toast.error((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t send the SMS. Try again in a minute.');
    },
  });

  const total = allMembers.length;
  const members = allMembers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const isMe = (m: StaffMember) => Boolean(currentUser && m.phone && m.phone === currentUser.phone);
  const COLS = 5;
  const menuFor = (m: StaffMember) =>
    isOwner &&
    !m.isOwner && (
      <RowMenu
        member={m}
        onDetails={() => setDetailsFor(m)}
        onToggleStatus={() => (m.status === 'SUSPENDED' ? statusMutation.mutate(m) : setTurningOff(m))}
        onSendSms={() => smsMutation.mutate(m)}
        onRemove={() => setRemoving(m)}
      />
    );

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
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, role, phone or email" />
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
                <EmptyState as="row" colSpan={COLS} icon={Users} title="No one matches" hint="Try another name, role or phone." />
              ) : (
                members.map((m) => (
                  <tr key={m.id} className={`${trClass()} ${m.status === 'SUSPENDED' ? 'text-neutral-500' : ''}`}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Initial name={m.name} />
                        <span className="font-medium">
                          {m.name}
                          {isMe(m) && <span className="font-normal text-neutral-500"> (you)</span>}
                        </span>
                        {m.status === 'SUSPENDED' && <SuspendedBadge />}
                      </div>
                    </td>
                    <td className={td}>
                      <RoleChip member={m} />
                    </td>
                    <td className={td}>
                      <p className="tabular-nums">{m.phone ?? '—'}</p>
                      {m.email && <p className="text-xs text-neutral-500">{m.email}</p>}
                    </td>
                    <td className={`${td} text-neutral-600`}>
                      {lastLoginText(m)}
                      {m.allowedIp && <p className="text-xs text-neutral-500">Only from IP {m.allowedIp}</p>}
                    </td>
                    <td className={td}>{menuFor(m)}</td>
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
              <EmptyState icon={Users} title="No one matches" hint="Try another name, role or phone." />
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
                      <RoleChip member={m} />
                      {m.status === 'SUSPENDED' && <SuspendedBadge />}
                    </div>
                    <p className="text-xs tabular-nums text-neutral-600">{m.phone ?? '—'}</p>
                    <p className="text-xs text-neutral-500">{lastLoginText(m)}</p>
                  </div>
                  {menuFor(m)}
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

      <LoginDetailsDialog member={detailsFor} onOpenChange={(open) => !open && setDetailsFor(null)} />

      <ConfirmDialog
        open={turningOff != null}
        onOpenChange={(open) => !open && setTurningOff(null)}
        title={turningOff ? `Turn off ${turningOff.name}’s account?` : ''}
        message="They’re signed out at once and can’t sign in until you turn it back on. Their role, orders and notes stay as they are."
        confirmLabel="Turn off account"
        onConfirm={() => turningOff && statusMutation.mutate(turningOff)}
        busy={statusMutation.isPending}
        danger
      />

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
